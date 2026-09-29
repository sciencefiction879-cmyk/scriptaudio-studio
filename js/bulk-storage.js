/**
 * ScriptAudio Studio - Resumable IndexedDB Storage Engine
 * Manages persistent storage for bulk scripts, chunk metadata, audio blobs,
 * and final merged script voiceovers across browser/app restarts.
 */

const BulkStorage = {
  DB_NAME: 'ScriptAudioStudio_BulkDB',
  DB_VERSION: 1,
  _db: null,

  /**
   * Open / initialize IndexedDB
   */
  async getDB() {
    if (this._db) return this._db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Scripts Store: key is script_id (e.g. 'V1', 'V2')
        if (!db.objectStoreNames.contains('scripts')) {
          const scriptStore = db.createObjectStore('scripts', { keyPath: 'script_id' });
          scriptStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 2. Chunks Store: key is chunk_id (e.g. 'V1_Chunk_001')
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'chunk_id' });
          chunkStore.createIndex('script_id', 'script_id', { unique: false });
          chunkStore.createIndex('status', 'status', { unique: false });
          chunkStore.createIndex('chunk_number', 'chunk_number', { unique: false });
        }

        // 3. Audio Blobs Store: key is chunk_id
        if (!db.objectStoreNames.contains('audio_blobs')) {
          db.createObjectStore('audio_blobs', { keyPath: 'chunk_id' });
        }

        // 4. Merged Audio Store: key is script_id
        if (!db.objectStoreNames.contains('merged_audio')) {
          db.createObjectStore('merged_audio', { keyPath: 'script_id' });
        }

        // 5. Settings Store: key is key name
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve(this._db);
      };

      request.onerror = (event) => {
        console.error('[BulkStorage] IndexedDB Open Error:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  // --- Scripts Operations ---

  async saveScript(scriptObj) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scripts', 'readwrite');
      const store = tx.objectStore('scripts');
      const req = store.put(scriptObj);
      req.onsuccess = () => resolve(scriptObj);
      req.onerror = () => reject(req.error);
    });
  },

  async saveScripts(scriptsArray) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scripts', 'readwrite');
      const store = tx.objectStore('scripts');
      scriptsArray.forEach(s => store.put(s));
      tx.oncomplete = () => resolve(scriptsArray);
      tx.onerror = () => reject(tx.error);
    });
  },

  async getScript(scriptId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scripts', 'readonly');
      const store = tx.objectStore('scripts');
      const req = store.get(scriptId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllScripts() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scripts', 'readonly');
      const store = tx.objectStore('scripts');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteScript(scriptId) {
    const db = await this.getDB();
    // Also delete associated chunks, audio_blobs, and merged_audio
    const chunks = await this.getChunksByScript(scriptId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['scripts', 'chunks', 'audio_blobs', 'merged_audio'], 'readwrite');
      tx.objectStore('scripts').delete(scriptId);
      tx.objectStore('merged_audio').delete(scriptId);

      const chunkStore = tx.objectStore('chunks');
      const blobStore = tx.objectStore('audio_blobs');
      chunks.forEach(c => {
        chunkStore.delete(c.chunk_id);
        blobStore.delete(c.chunk_id);
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  // --- Chunks Operations ---

  async saveChunk(chunkObj) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readwrite');
      const store = tx.objectStore('chunks');
      const req = store.put(chunkObj);
      req.onsuccess = () => resolve(chunkObj);
      req.onerror = () => reject(req.error);
    });
  },

  async saveChunks(chunksArray) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readwrite');
      const store = tx.objectStore('chunks');
      chunksArray.forEach(c => store.put(c));
      tx.oncomplete = () => resolve(chunksArray);
      tx.onerror = () => reject(tx.error);
    });
  },

  async getChunk(chunkId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readonly');
      const store = tx.objectStore('chunks');
      const req = store.get(chunkId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getChunksByScript(scriptId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readonly');
      const store = tx.objectStore('chunks');
      const index = store.index('script_id');
      const req = index.getAll(scriptId);
      req.onsuccess = () => {
        const items = req.result || [];
        // Always sort numerically by chunk_number
        items.sort((a, b) => a.chunk_number - b.chunk_number);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getAllChunks() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readonly');
      const store = tx.objectStore('chunks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // --- Audio Blobs Operations ---

  async saveAudioBlob(chunkId, blob, duration = 0, mimeType = 'audio/wav') {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audio_blobs', 'readwrite');
      const store = tx.objectStore('audio_blobs');
      const record = {
        chunk_id: chunkId,
        blob: blob,
        duration: duration,
        mimeType: mimeType,
        saved_at: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  async getAudioBlob(chunkId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audio_blobs', 'readonly');
      const store = tx.objectStore('audio_blobs');
      const req = store.get(chunkId);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteAudioBlob(chunkId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audio_blobs', 'readwrite');
      const store = tx.objectStore('audio_blobs');
      const req = store.delete(chunkId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  // --- Merged Audio Operations ---

  async saveMergedAudio(scriptId, blob, format = 'mp3', duration = 0) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('merged_audio', 'readwrite');
      const store = tx.objectStore('merged_audio');
      const record = {
        script_id: scriptId,
        blob: blob,
        format: format,
        duration: duration,
        merged_at: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  async getMergedAudio(scriptId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('merged_audio', 'readonly');
      const store = tx.objectStore('merged_audio');
      const req = store.get(scriptId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  // --- Settings Operations ---

  async saveSetting(key, val) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: key, value: val });
      req.onsuccess = () => resolve(val);
      req.onerror = () => reject(req.error);
    });
  },

  async getSetting(key, defaultVal = null) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : defaultVal);
      req.onerror = () => reject(req.error);
    });
  },

  // --- Clear / Reset Entire Bulk Project ---

  async clearAll() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['scripts', 'chunks', 'audio_blobs', 'merged_audio'], 'readwrite');
      tx.objectStore('scripts').clear();
      tx.objectStore('chunks').clear();
      tx.objectStore('audio_blobs').clear();
      tx.objectStore('merged_audio').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
};

window.BulkStorage = BulkStorage;
