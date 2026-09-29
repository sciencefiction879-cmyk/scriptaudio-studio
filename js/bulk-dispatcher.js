/**
 * ScriptAudio Studio - Parallel Worker System & Central API Dispatcher
 * 
 * Features:
 * - Centralized Job Queue across all scripts and chunks.
 * - Dynamic parallel worker pool (configurable 1 to 16 workers).
 * - Per-API concurrency tracking and intelligent load balancing across all saved keys.
 * - Automatic rate-limit detection, cooldown timers, and failover to other keys.
 * - Exponential backoff with jitter on retries (up to 5 attempts per chunk).
 * - Strict duplicate processing prevention (CLAIMED / PROCESSING atomic locks).
 * - Full resumability: recovers stale locks and continues unfinished jobs seamlessly.
 */

const BulkDispatcher = {
  // Configurable options
  maxWorkers: 4,
  maxConcurrencyPerKey: 2,
  maxAttemptsPerChunk: 5,
  defaultCooldownSeconds: 25,
  lockTimeoutMs: 90000, // 90 seconds stale lock timeout

  // State
  isRunning: false,
  isPaused: false,
  activeWorkerCount: 0,
  
  // In-memory runtime tracking
  _chunks: [], // Array of chunk records
  _chunksMap: new Map(), // chunk_id -> chunk
  _apiKeysMap: new Map(), // keyString -> keyState
  _activeLocks: new Map(), // chunk_id -> { workerId, startTime, timer }
  _onUpdateCallbacks: new Set(),
  _dispatchTimer: null,

  /**
   * Register a UI callback for live dashboard updates
   */
  onUpdate(callback) {
    this._onUpdateCallbacks.add(callback);
    return () => this._onUpdateCallbacks.delete(callback);
  },

  _notifyUpdate(eventType = 'state_change', data = null) {
    this._onUpdateCallbacks.forEach(cb => {
      try {
        cb(eventType, data);
      } catch (e) {
        console.error('[BulkDispatcher] UI update callback error:', e);
      }
    });
  },

  /**
   * Initialize / Refresh API Keys pool from AIStudio
   */
  refreshApiKeys() {
    const savedKeys = AIStudio.getApiKeys();
    const currentMap = this._apiKeysMap;
    const newMap = new Map();

    savedKeys.forEach((item, idx) => {
      const keyStr = item.key;
      const existing = currentMap.get(keyStr);
      if (existing) {
        existing.index = idx;
        newMap.set(keyStr, existing);
      } else {
        newMap.set(keyStr, {
          key: keyStr,
          index: idx,
          masked: AIStudio.maskKey(keyStr),
          activeConcurrency: 0,
          maxConcurrency: this.maxConcurrencyPerKey,
          cooldownUntil: 0,
          recentFailures: 0,
          totalCompleted: 0
        });
      }
    });

    this._apiKeysMap = newMap;
  },

  /**
   * Load chunks into queue from storage or memory
   */
  setChunks(chunksArray) {
    this._chunks = chunksArray || [];
    this._chunksMap.clear();
    this._chunks.forEach(c => {
      this._chunksMap.set(c.chunk_id, c);
    });
    this.refreshApiKeys();
    this._notifyUpdate('queue_loaded');
  },

  /**
   * Get all live chunk records
   */
  getChunks() {
    return this._chunks;
  },

  /**
   * Find an available authorized API key with capacity
   */
  _getAvailableApiKey() {
    const now = Date.now();
    let bestKey = null;
    let minConcurrency = Infinity;

    for (const keyState of this._apiKeysMap.values()) {
      // Check cooldown
      if (now < keyState.cooldownUntil) {
        continue;
      }
      // Check concurrency capacity
      if (keyState.activeConcurrency < keyState.maxConcurrency) {
        if (keyState.activeConcurrency < minConcurrency) {
          minConcurrency = keyState.activeConcurrency;
          bestKey = keyState;
        }
      }
    }

    return bestKey;
  },

  /**
   * Get overall API key health and status
   */
  getApiStatus() {
    const now = Date.now();
    let totalKeys = this._apiKeysMap.size;
    let availableKeys = 0;
    let coolingDownKeys = 0;
    let inUseKeys = 0;

    for (const k of this._apiKeysMap.values()) {
      if (now < k.cooldownUntil) {
        coolingDownKeys++;
      } else if (k.activeConcurrency > 0) {
        inUseKeys++;
        if (k.activeConcurrency < k.maxConcurrency) availableKeys++;
      } else {
        availableKeys++;
      }
    }

    return {
      totalKeys: totalKeys,
      availableKeys: availableKeys,
      coolingDownKeys: coolingDownKeys,
      inUseKeys: inUseKeys,
      details: Array.from(this._apiKeysMap.values()).map(k => ({
        index: k.index + 1,
        masked: k.masked,
        active: k.activeConcurrency,
        max: k.maxConcurrency,
        isCoolingDown: now < k.cooldownUntil,
        cooldownRemainingSec: Math.max(0, Math.ceil((k.cooldownUntil - now) / 1000)),
        completed: k.totalCompleted
      }))
    };
  },

  /**
   * Real-time statistics summary for the dashboard
   */
  getStats() {
    let completed = 0;
    let processing = 0;
    let queued = 0;
    let retrying = 0;
    let failed = 0;
    let cancelled = 0;

    const scriptsCountMap = new Map();

    this._chunks.forEach(c => {
      scriptsCountMap.set(c.script_id, true);
      switch (c.status) {
        case 'COMPLETED':
          completed++;
          break;
        case 'PROCESSING':
        case 'CLAIMED':
          processing++;
          break;
        case 'RETRYING':
        case 'RATE_LIMITED':
          retrying++;
          break;
        case 'FAILED':
          failed++;
          break;
        case 'CANCELLED':
          cancelled++;
          break;
        case 'QUEUED':
        default:
          queued++;
          break;
      }
    });

    const totalChunks = this._chunks.length;
    const progressPercent = totalChunks > 0 ? Math.round((completed / totalChunks) * 100) : 0;
    const apiStatus = this.getApiStatus();

    return {
      totalScripts: scriptsCountMap.size,
      totalChunks: totalChunks,
      completed: completed,
      processing: processing,
      queued: queued,
      retrying: retrying,
      failed: failed,
      cancelled: cancelled,
      progressPercent: progressPercent,
      activeWorkers: this.activeWorkerCount,
      maxWorkers: this.maxWorkers,
      apiStatus: apiStatus,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    };
  },

  /**
   * Per-Script Progress calculation
   */
  getScriptProgress(scriptId) {
    const chunks = this._chunks.filter(c => c.script_id === scriptId);
    if (chunks.length === 0) return null;

    const total = chunks.length;
    const completed = chunks.filter(c => c.status === 'COMPLETED').length;
    const failed = chunks.filter(c => c.status === 'FAILED').length;
    const processing = chunks.filter(c => c.status === 'PROCESSING' || c.status === 'CLAIMED').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isReadyToMerge = completed === total && total > 0;

    return {
      script_id: scriptId,
      filename: chunks[0].script_filename || `${scriptId}.script.txt`,
      totalChunks: total,
      completedChunks: completed,
      failedChunks: failed,
      processingChunks: processing,
      percent: percent,
      isReadyToMerge: isReadyToMerge
    };
  },

  /**
   * Start or Resume the Dispatcher
   */
  start() {
    this.refreshApiKeys();
    if (this._apiKeysMap.size === 0) {
      throw new Error('Please add at least one Google AI Studio API key in Settings before starting!');
    }

    this.isRunning = true;
    this.isPaused = false;

    // Recover stale locks on start/resume
    this._recoverStaleLocks();

    this._notifyUpdate('started');
    this._scheduleDispatch(10);
  },

  pause() {
    this.isPaused = true;
    if (this._dispatchTimer) {
      clearTimeout(this._dispatchTimer);
      this._dispatchTimer = null;
    }
    this._notifyUpdate('paused');
  },

  resume() {
    if (!this.isRunning) {
      return this.start();
    }
    this.isPaused = false;
    this._recoverStaleLocks();
    this._notifyUpdate('resumed');
    this._scheduleDispatch(10);
  },

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this._dispatchTimer) {
      clearTimeout(this._dispatchTimer);
      this._dispatchTimer = null;
    }
    this._notifyUpdate('stopped');
  },

  /**
   * Retry all failed chunks
   */
  retryFailed() {
    let count = 0;
    this._chunks.forEach(c => {
      if (c.status === 'FAILED') {
        c.status = 'QUEUED';
        c.attempt_count = 0;
        c.error_message = null;
        c.retry_after = 0;
        BulkStorage.saveChunk(c);
        count++;
      }
    });

    if (count > 0) {
      this._notifyUpdate('retrying_failed', { count });
      if (!this.isRunning || this.isPaused) {
        this.resume();
      } else {
        this._scheduleDispatch(10);
      }
    }
    return count;
  },

  /**
   * Stale lock recovery: If a worker died or stalled, reset CLAIMED/PROCESSING back to QUEUED
   */
  _recoverStaleLocks() {
    const now = Date.now();
    this._chunks.forEach(c => {
      if (c.status === 'CLAIMED' || c.status === 'PROCESSING') {
        const lock = this._activeLocks.get(c.chunk_id);
        if (!lock || (now - lock.startTime) > this.lockTimeoutMs) {
          console.warn(`[BulkDispatcher] Recovering stale lock for chunk: ${c.chunk_name}`);
          c.status = 'QUEUED';
          c.assigned_api = null;
          this._activeLocks.delete(c.chunk_id);
          BulkStorage.saveChunk(c);
        }
      }
    });
  },

  _scheduleDispatch(delayMs = 50) {
    if (this._dispatchTimer) {
      clearTimeout(this._dispatchTimer);
    }
    this._dispatchTimer = setTimeout(() => {
      this._dispatch();
    }, delayMs);
  },

  /**
   * Main Dispatch Loop: continuously assigns eligible queued chunks to available workers
   */
  async _dispatch() {
    if (!this.isRunning || this.isPaused) return;

    const now = Date.now();

    // 1. Fill available worker slots
    while (this.activeWorkerCount < this.maxWorkers) {
      const apiKeyObj = this._getAvailableApiKey();
      if (!apiKeyObj) {
        // No API keys available right now. Check if any are cooling down
        let earliestWakeup = Infinity;
        for (const k of this._apiKeysMap.values()) {
          if (k.cooldownUntil > now && k.cooldownUntil < earliestWakeup) {
            earliestWakeup = k.cooldownUntil;
          }
        }
        if (earliestWakeup < Infinity) {
          const waitTime = Math.max(200, earliestWakeup - now + 50);
          this._scheduleDispatch(waitTime);
        }
        break; // Stop loop until an API key is available
      }

      // 2. Find next eligible chunk
      const chunk = this._findNextEligibleChunk(now);
      if (!chunk) {
        // No eligible chunks waiting in queue right now
        // Check if all chunks are done
        const stats = this.getStats();
        if (stats.processing === 0 && stats.queued === 0 && stats.retrying === 0) {
          this.isRunning = false;
          this._notifyUpdate('all_completed');
        }
        break;
      }

      // 3. Atomically Claim the Chunk (prevents duplicate processing by any other worker)
      chunk.status = 'CLAIMED';
      chunk.assigned_api = apiKeyObj.masked;
      const workerId = `Worker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      this._activeLocks.set(chunk.chunk_id, {
        workerId: workerId,
        startTime: now
      });

      apiKeyObj.activeConcurrency++;
      this.activeWorkerCount++;

      // Save claim status to IndexedDB
      BulkStorage.saveChunk(chunk);
      this._notifyUpdate('chunk_claimed', { chunkId: chunk.chunk_id });

      // 4. Launch async worker execution without blocking the dispatcher loop
      this._executeWorker(chunk, apiKeyObj, workerId);
    }
  },

  /**
   * Find next queued or retrying chunk (ordered by attempt_count, script_id, chunk_number)
   */
  _findNextEligibleChunk(now) {
    const eligible = [];

    for (const c of this._chunks) {
      if (c.status === 'QUEUED') {
        eligible.push(c);
      } else if (c.status === 'RETRYING' || c.status === 'RATE_LIMITED') {
        if (!c.retry_after || now >= c.retry_after) {
          eligible.push(c);
        }
      }
    }

    if (eligible.length === 0) return null;

    // Prioritize chunks with fewer attempts first, then preserve script order
    eligible.sort((a, b) => {
      if (a.attempt_count !== b.attempt_count) {
        return a.attempt_count - b.attempt_count;
      }
      if (a.script_id !== b.script_id) {
        return a.script_id.localeCompare(b.script_id, undefined, { numeric: true });
      }
      return a.chunk_number - b.chunk_number;
    });

    return eligible[0];
  },

  /**
   * Single Worker Async Execution
   */
  async _executeWorker(chunk, apiKeyObj, workerId) {
    chunk.status = 'PROCESSING';
    chunk.started_at = Date.now();
    await BulkStorage.saveChunk(chunk);
    this._notifyUpdate('chunk_processing', { chunkId: chunk.chunk_id });

    const selectedVoice = AIStudio.getVoice();
    const selectedModel = AIStudio.getModel();
    const instruction = AIStudio.getPromptInstruction ? AIStudio.getPromptInstruction() : '';

    try {
      // Direct call to Gemini API using this worker's assigned specific API key
      const audioBlob = await AIStudio.generateAudioWithSpecificKey(
        chunk.chunk_text,
        selectedVoice,
        selectedModel,
        apiKeyObj.key,
        instruction
      );

      // --- SUCCESS ---
      chunk.status = 'COMPLETED';
      chunk.completed_at = Date.now();
      chunk.error_message = null;
      chunk.has_audio = true;

      // Save Audio Blob into IndexedDB
      await BulkStorage.saveAudioBlob(chunk.chunk_id, audioBlob);
      await BulkStorage.saveChunk(chunk);

      // Update API Key stats
      apiKeyObj.recentFailures = 0;
      apiKeyObj.totalCompleted++;

      this._notifyUpdate('chunk_completed', { chunkId: chunk.chunk_id, scriptId: chunk.script_id });

    } catch (err) {
      // --- FAILURE / RATE LIMIT ---
      console.warn(`[BulkDispatcher] Error processing ${chunk.chunk_name} on Key #${apiKeyObj.index + 1}:`, err.message);

      apiKeyObj.recentFailures++;

      const isRateLimit = err.isRateLimit || 
                          err.status === 429 || 
                          err.status === 403 || 
                          err.message.toLowerCase().includes('quota') || 
                          err.message.toLowerCase().includes('rate');

      // Put this API key into cooldown if rate limited or repeated failures
      if (isRateLimit || apiKeyObj.recentFailures >= 2) {
        const cooldownSec = Math.min(120, this.defaultCooldownSeconds * Math.pow(1.5, apiKeyObj.recentFailures - 1));
        apiKeyObj.cooldownUntil = Date.now() + (cooldownSec * 1000);
        console.warn(`[BulkDispatcher] API Key #${apiKeyObj.index + 1} enters COOLDOWN for ${Math.round(cooldownSec)}s`);
      }

      chunk.attempt_count = (chunk.attempt_count || 0) + 1;

      if (chunk.attempt_count < this.maxAttemptsPerChunk) {
        chunk.status = isRateLimit ? 'RATE_LIMITED' : 'RETRYING';
        // Exponential backoff with jitter
        const backoffMs = Math.min(25000, 1000 * Math.pow(2, chunk.attempt_count) + Math.floor(Math.random() * 800));
        chunk.retry_after = Date.now() + backoffMs;
        chunk.error_message = err.message;
        console.log(`[BulkDispatcher] Requeuing ${chunk.chunk_name} (Attempt ${chunk.attempt_count}/${this.maxAttemptsPerChunk}) after ${backoffMs}ms`);
      } else {
        chunk.status = 'FAILED';
        chunk.error_message = err.message;
        console.error(`[BulkDispatcher] Chunk ${chunk.chunk_name} FAILED after ${this.maxAttemptsPerChunk} attempts.`);
      }

      chunk.assigned_api = null;
      await BulkStorage.saveChunk(chunk);
      this._notifyUpdate('chunk_failed', { chunkId: chunk.chunk_id, error: err.message });

    } finally {
      // Clean up lock and decrement concurrency
      this._activeLocks.delete(chunk.chunk_id);
      apiKeyObj.activeConcurrency = Math.max(0, apiKeyObj.activeConcurrency - 1);
      this.activeWorkerCount = Math.max(0, this.activeWorkerCount - 1);

      // Trigger next dispatch immediately to keep workers fully utilized
      this._scheduleDispatch(20);
    }
  }
};

window.BulkDispatcher = BulkDispatcher;
