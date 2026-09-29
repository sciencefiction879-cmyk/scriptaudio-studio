/**
 * ScriptAudio Studio - Main Application Controller
 * Handles UI interactions, state management, chunk rendering, drag-drop, and workflow actions.
 */

document.addEventListener('DOMContentLoaded', () => {

  // Sample Demo Script for quick testing
  const SAMPLE_SCRIPT = `Welcome to ScriptAudio Studio, the intelligent script chunker and audio workflow assistant designed specifically for Google AI Studio!

When creating long AI voiceovers, pasting an entire 2,000-word script into a single prompt often results in flat tone, unnatural pauses, or audio truncation. To solve this, ScriptAudio Studio automatically breaks your text into optimal, sentence-aware sections.

Each section is sized perfectly for Gemini voice generation. You can easily copy individual chunks with custom system instructions, paste them into Google AI Studio, or generate them directly in-app using your API key.

Once you have generated audio clips for each chunk, drag and drop the clips onto their respective cards. With a single click on "Stitch Master Audio", our Web Audio engine merges all clips into one seamless, continuous voiceover master track.

Try adjusting the split settings above, explore the chunk cards below, and elevate your AI voiceover production today!`;

  // App State
  const state = {
    chunks: [],
    filter: 'all',
    scriptFilter: 'all',
    searchQuery: '',
    masterAudioBlob: null,
    masterAudioUrl: null,
    uploadedScripts: [], // Array of { id: 'V1', filename: '...', text: '...', words: 350, chars: 1800 }
    activeScriptId: null,
    // Generation control
    generationPaused: false,
    generationRunning: false,
    generationAborted: false,
    genStats: { active: 0, done: 0, failed: 0, startTime: 0 },
    // UI preferences
    collapsedChunks: new Set(),
    theme: localStorage.getItem('sa_theme') || 'dark'
  };

  // DOM Elements
  const scriptInput = document.getElementById('scriptInput');
  const inputWordCount = document.getElementById('inputWordCount');
  const inputEstTime = document.getElementById('inputEstTime');
  const scriptFileInput = document.getElementById('scriptFileInput');
  const uploadedScriptsTray = document.getElementById('uploadedScriptsTray');
  const uploadedScriptsCount = document.getElementById('uploadedScriptsCount');
  const uploadedTotalWords = document.getElementById('uploadedTotalWords');
  const uploadedScriptsList = document.getElementById('uploadedScriptsList');
  const btnClearUploadedScripts = document.getElementById('btnClearUploadedScripts');
  const badgeScriptsUploaded = document.getElementById('badgeScriptsUploaded');
  const inputScriptCount = document.getElementById('inputScriptCount');
  const btnSplitText = document.getElementById('btnSplitText');
  const scriptFilterSelect = document.getElementById('scriptFilterSelect');

  const chunkMode = document.getElementById('chunkMode');
  const chunkLimit = document.getElementById('chunkLimit');
  const chunkLimitValue = document.getElementById('chunkLimitValue');
  const limitGroup = document.getElementById('limitGroup');
  const promptTemplate = document.getElementById('promptTemplate');
  
  const btnSplit = document.getElementById('btnSplit');
  const btnClear = document.getElementById('btnClear');
  const btnSampleScript = document.getElementById('btnSampleScript');
  
  const workspacePanel = document.getElementById('workspacePanel');
  const chunksContainer = document.getElementById('chunksContainer');
  const timelineBar = document.getElementById('timelineBar');
  const timelinePercent = document.getElementById('timelinePercent');
  
  const statTotalChunks = document.getElementById('statTotalChunks');
  const statReadyChunks = document.getElementById('statReadyChunks');
  const statTotalAudioTime = document.getElementById('statTotalAudioTime');
  
  const btnCopyAll = document.getElementById('btnCopyAll');
  const btnGenerateAllApi = document.getElementById('btnGenerateAllApi');
  const btnDownloadAllAudio = document.getElementById('btnDownloadAllAudio');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnStitchAudio = document.getElementById('btnStitchAudio');
  
  const masterAudioCard = document.getElementById('masterAudioCard');
  const masterAudioPlayer = document.getElementById('masterAudioPlayer');
  const masterDuration = document.getElementById('masterDuration');
  const btnDownloadMaster = document.getElementById('btnDownloadMaster');

  const chunkSearch = document.getElementById('chunkSearch');
  const filterPills = document.querySelectorAll('.filter-pills .pill');
  const countFilterAll = document.getElementById('countFilterAll');
  const countFilterPending = document.getElementById('countFilterPending');
  const countFilterReady = document.getElementById('countFilterReady');

  const dragOverlay = document.getElementById('dragOverlay');

  // New Feature DOM Refs
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const btnPauseGeneration = document.getElementById('btnPauseGeneration');
  const btnRetryFailed = document.getElementById('btnRetryFailed');
  const workerCountSlider = document.getElementById('workerCountSlider');
  const workerCountValue = document.getElementById('workerCountValue');
  const autoGenerateToggle = document.getElementById('autoGenerateToggle');
  const importJsonInput = document.getElementById('importJsonInput');
  const downloadFormatSelect = document.getElementById('downloadFormatSelect');
  const liveGenStats = document.getElementById('liveGenStats');
  const genStatActive = document.getElementById('genStatActive');
  const genStatDone = document.getElementById('genStatDone');
  const genStatFailed = document.getElementById('genStatFailed');
  const genStatEta = document.getElementById('genStatEta');
  const resumeBanner = document.getElementById('resumeBanner');
  const resumeTotalCount = document.getElementById('resumeTotalCount');
  const resumeReadyCount = document.getElementById('resumeReadyCount');
  const btnResumeSession = document.getElementById('btnResumeSession');
  const btnDiscardSession = document.getElementById('btnDiscardSession');

  // Modal & Model/Voice DOM
  const btnSettings = document.getElementById('btnSettings');
  const btnVoiceGallery = document.getElementById('btnVoiceGallery');
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const bulkApiKeyInput = document.getElementById('bulkApiKeyInput');
  const detectedKeysCountBadge = document.getElementById('detectedKeysCountBadge');
  const btnAddBulkKeys = document.getElementById('btnAddBulkKeys');
  const btnPasteKeysClipboard = document.getElementById('btnPasteKeysClipboard');
  const btnTestAllKeys = document.getElementById('btnTestAllKeys');
  const btnClearAllKeys = document.getElementById('btnClearAllKeys');
  const savedKeysBox = document.getElementById('savedKeysBox');
  const totalKeysNum = document.getElementById('totalKeysNum');
  const keysChipsList = document.getElementById('keysChipsList');
  const headerKeysLabel = document.getElementById('headerKeysLabel');

  const modelSelect = document.getElementById('modelSelect');
  const customModelInput = document.getElementById('customModelInput');
  const modelDescHelp = document.getElementById('modelDescHelp');
  const voiceSelect = document.getElementById('voiceSelect');
  const btnPreviewVoice = document.getElementById('btnPreviewVoice');
  const voicePreviewAudio = document.getElementById('voicePreviewAudio');
  const voiceDescHelp = document.getElementById('voiceDescHelp');
  const apiTestResult = document.getElementById('apiTestResult');
  const btnTestApiKey = document.getElementById('btnTestApiKey');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const apiStatusBadge = document.getElementById('apiStatusBadge');

  // Quick Model / Voice Bar DOM
  const quickModelLabel = document.getElementById('quickModelLabel');
  const quickVoiceLabel = document.getElementById('quickVoiceLabel');
  const quickTempPill = document.getElementById('quickTempPill');
  const quickTempLabel = document.getElementById('quickTempLabel');
  const quickMultiSpeakerPill = document.getElementById('quickMultiSpeakerPill');
  const quickMultiSpeakerLabel = document.getElementById('quickMultiSpeakerLabel');
  const btnQuickConfig = document.getElementById('btnQuickConfig');

  // Google AI Studio Generation Parameters & Multi-Speaker DOM
  const paramTemperature = document.getElementById('paramTemperature');
  const tempValDisplay = document.getElementById('tempValDisplay');
  const paramTopP = document.getElementById('paramTopP');
  const topPValDisplay = document.getElementById('topPValDisplay');
  const paramTopK = document.getElementById('paramTopK');
  const topKValDisplay = document.getElementById('topKValDisplay');
  const paramSeed = document.getElementById('paramSeed');
  const seedValDisplay = document.getElementById('seedValDisplay');
  const multiSpeakerToggle = document.getElementById('multiSpeakerToggle');
  const multiSpeakerSettings = document.getElementById('multiSpeakerSettings');
  const speaker1Display = document.getElementById('speaker1Display');
  const speaker2Select = document.getElementById('speaker2Select');
  const paramPersonaId = document.getElementById('paramPersonaId');
  const btnResetParams = document.getElementById('btnResetParams');

  // 1,000+ Voices Gallery State & DOM
  const totalVoicesCountBadge = document.getElementById('totalVoicesCountBadge');
  const countAllVoices = document.getElementById('countAllVoices');
  const countFeaturedVoices = document.getElementById('countFeaturedVoices');
  const countFemaleVoices = document.getElementById('countFemaleVoices');
  const countMaleVoices = document.getElementById('countMaleVoices');
  const voicePersonaFilter = document.getElementById('voicePersonaFilter');
  const voiceAccentFilter = document.getElementById('voiceAccentFilter');
  const btnSyncVoicesApi = document.getElementById('btnSyncVoicesApi');
  const voicePageStatus = document.getElementById('voicePageStatus');
  const btnVoicePrevPage = document.getElementById('btnVoicePrevPage');
  const btnVoiceNextPage = document.getElementById('btnVoiceNextPage');

  let voiceCurrentPage = 1;
  let voiceTotalPages = 1;
  const voicePageSize = 36;
  let activeVoiceGender = 'all';
  let activeVoicePersona = 'all';
  let activeVoiceAccent = 'all';
  let activeVoiceSearch = '';

  // New Script Paste, Tags, Presets, Speed & Voice Gallery DOM
  const btnPasteScriptHeader = document.getElementById('btnPasteScriptHeader');
  const btnPasteClipboard = document.getElementById('btnPasteClipboard');
  const speedSelect = document.getElementById('speedSelect');
  const activeVoiceBadgeName = document.getElementById('activeVoiceBadgeName');
  const voiceCardsGrid = document.getElementById('voiceCardsGrid');
  const voiceSearchInput = document.getElementById('voiceSearchInput');
  const voiceFilterPills = document.querySelectorAll('.voice-filter-pill');
  const presetPills = document.querySelectorAll('.preset-pill');
  const vocalTagButtons = document.querySelectorAll('.btn-tag');

  // Active Voice Summary Bar DOM
  const activeVoiceDisplayName = document.getElementById('activeVoiceDisplayName');
  const activeVoiceFeaturedBadge = document.getElementById('activeVoiceFeaturedBadge');
  const activeVoiceGenderBadge = document.getElementById('activeVoiceGenderBadge');
  const activeVoiceToneBadge = document.getElementById('activeVoiceToneBadge');
  const activeVoiceAccentBadge = document.getElementById('activeVoiceAccentBadge');
  const btnPreviewSelectedVoice = document.getElementById('btnPreviewSelectedVoice');
  const btnToggleVoiceCatalog = document.getElementById('btnToggleVoiceCatalog');
  const toggleCatalogIcon = document.getElementById('toggleCatalogIcon');
  const toggleCatalogText = document.getElementById('toggleCatalogText');
  const voiceCatalogDrawer = document.getElementById('voiceCatalogDrawer');
  const quickTotalVoices = document.getElementById('quickTotalVoices');

  // Initialize Settings & UI
  initSettings();
  scriptInput.value = ''; // Ensure default empty script box on initial load
  updateInputStats();
  renderUploadedScriptsTray();
  applyTheme(state.theme);
  restoreAutoSave();
  startAutoSaveInterval();


  // --- Bulk Script Import & V-Number Management ---
  function parseVNumber(filename, fallbackIndex = 1) {
    const clean = filename.trim();
    const vMatch = clean.match(/(?:^|[\s_.-])[vV][-_]?(\d+)(?:[\s_.-]|$)/);
    if (vMatch) return 'V' + parseInt(vMatch[1], 10);
    const leadV = clean.match(/^[vV](\d+)/);
    if (leadV) return 'V' + parseInt(leadV[1], 10);
    const numMatch = clean.match(/^(\d+)[\s_.-]/);
    if (numMatch) return 'V' + parseInt(numMatch[1], 10);
    return 'V' + fallbackIndex;
  }

  async function handleImportScriptFiles(files) {
    if (!files || files.length === 0) return;
    const txtFiles = files.filter(f => f.name.match(/\.(txt|md|text)$/i) || f.type.startsWith('text/'));
    if (txtFiles.length === 0) {
      showToast('Please select text (.txt) script files!', 'warning');
      return;
    }

    let addedCount = 0;
    for (let i = 0; i < txtFiles.length; i++) {
      const file = txtFiles[i];
      try {
        const text = await file.text();
        if (!text || !text.trim()) continue;

        const fallbackIdx = state.uploadedScripts.length + 1;
        const vId = parseVNumber(file.name, fallbackIdx);
        const stats = Chunker.getStats(text);

        const existingIdx = state.uploadedScripts.findIndex(s => s.id === vId);
        const scriptRecord = {
          id: vId,
          filename: file.name,
          text: text.trim(),
          words: stats.words,
          chars: stats.chars,
          durationFormatted: stats.durationFormatted
        };

        if (existingIdx >= 0) {
          state.uploadedScripts[existingIdx] = scriptRecord;
        } else {
          state.uploadedScripts.push(scriptRecord);
        }
        addedCount++;
      } catch (err) {
        console.error('Error reading script file:', file.name, err);
      }
    }

    if (addedCount > 0) {
      state.uploadedScripts.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      if (!state.activeScriptId || !state.uploadedScripts.some(s => s.id === state.activeScriptId)) {
        state.activeScriptId = state.uploadedScripts[0].id;
      }

      const activeScript = state.uploadedScripts.find(s => s.id === state.activeScriptId);
      if (activeScript) {
        scriptInput.value = activeScript.text;
      }

      renderUploadedScriptsTray();
      updateInputStats();
      showToast(`Imported ${addedCount} script(s) successfully! You can verify each one in the tray.`, 'success');
    }
  }

  function renderUploadedScriptsTray() {
    if (!uploadedScriptsTray) return;

    const count = state.uploadedScripts.length;
    if (count === 0) {
      uploadedScriptsTray.style.display = 'none';
      if (badgeScriptsUploaded) badgeScriptsUploaded.style.display = 'none';
      if (btnSplitText) btnSplitText.textContent = 'Divide Script into Chunks';
      return;
    }

    uploadedScriptsTray.style.display = 'block';
    if (badgeScriptsUploaded) {
      badgeScriptsUploaded.style.display = 'inline-flex';
      if (inputScriptCount) inputScriptCount.textContent = count;
    }

    if (uploadedScriptsCount) uploadedScriptsCount.textContent = count;
    const totalWords = state.uploadedScripts.reduce((sum, s) => sum + s.words, 0);
    if (uploadedTotalWords) uploadedTotalWords.textContent = totalWords.toLocaleString() + ' words total';

    if (btnSplitText) {
      btnSplitText.textContent = count > 1 
        ? `Divide All Scripts into Chunks (${count} Scripts)` 
        : `Divide Script (${state.uploadedScripts[0].id}) into Chunks`;
    }

    if (uploadedScriptsList) {
      uploadedScriptsList.innerHTML = '';
      state.uploadedScripts.forEach(script => {
        const pill = document.createElement('div');
        pill.className = `script-tab-pill ${script.id === state.activeScriptId ? 'active' : ''}`;
        pill.setAttribute('data-id', script.id);
        pill.innerHTML = `
          <span class="pill-vname">${escapeHtml(script.id)}</span>
          <span class="pill-meta">${script.words}w</span>
          <button type="button" class="btn-remove-pill" title="Remove ${escapeHtml(script.id)}">×</button>
        `;

        pill.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-remove-pill')) return;
          selectUploadedScript(script.id);
        });

        const removeBtn = pill.querySelector('.btn-remove-pill');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeUploadedScript(script.id);
          });
        }

        uploadedScriptsList.appendChild(pill);
      });
    }
  }

  function selectUploadedScript(scriptId) {
    state.activeScriptId = scriptId;
    const script = state.uploadedScripts.find(s => s.id === scriptId);
    if (script) {
      scriptInput.value = script.text;
      updateInputStats();
      renderUploadedScriptsTray();
      scriptInput.focus();
    }
  }

  function removeUploadedScript(scriptId) {
    const idx = state.uploadedScripts.findIndex(s => s.id === scriptId);
    if (idx >= 0) {
      state.uploadedScripts.splice(idx, 1);
      if (state.activeScriptId === scriptId) {
        state.activeScriptId = state.uploadedScripts.length > 0 ? state.uploadedScripts[0].id : null;
        if (state.activeScriptId) {
          const nextScript = state.uploadedScripts.find(s => s.id === state.activeScriptId);
          scriptInput.value = nextScript ? nextScript.text : '';
        } else {
          scriptInput.value = '';
        }
      }
      renderUploadedScriptsTray();
      updateInputStats();
      showToast(`Removed script ${scriptId}`, 'info');
    }
  }

  function syncActiveScriptFromInput() {
    if (state.activeScriptId && state.uploadedScripts.length > 0) {
      const activeScript = state.uploadedScripts.find(s => s.id === state.activeScriptId);
      if (activeScript) {
        activeScript.text = scriptInput.value;
        const stats = Chunker.getStats(scriptInput.value);
        activeScript.words = stats.words;
        activeScript.chars = stats.chars;
        activeScript.durationFormatted = stats.durationFormatted;

        const totalWords = state.uploadedScripts.reduce((sum, s) => sum + s.words, 0);
        if (uploadedTotalWords) uploadedTotalWords.textContent = totalWords.toLocaleString() + ' words total';

        if (uploadedScriptsList) {
          const metaSpan = uploadedScriptsList.querySelector(`.script-tab-pill[data-id="${activeScript.id}"] .pill-meta`);
          if (metaSpan) metaSpan.textContent = activeScript.words + 'w';
        }
      }
    }
  }

  // --- Event Listeners ---

  // Paste Script from Clipboard (Header & Textarea Toolbar)
  async function handlePasteScript() {
    try {
      const clipText = await AIStudio.readClipboard();
      if (clipText && clipText.trim()) {
        scriptInput.value = clipText;
        updateInputStats();
        showToast('Successfully pasted script from clipboard!', 'success');
      } else {
        scriptInput.focus();
        showToast('Clipboard is empty or inaccessible. Press Cmd+V to paste.', 'info');
      }
    } catch (err) {
      scriptInput.focus();
      showToast('Press Cmd+V to paste into the script box', 'info');
    }
  }

  if (btnPasteScriptHeader) btnPasteScriptHeader.addEventListener('click', handlePasteScript);
  if (btnPasteClipboard) btnPasteClipboard.addEventListener('click', handlePasteScript);

  // AI Studio Vocal Expressive Tags Insertion
  function insertVocalTag(openTag, closeTag) {
    const start = scriptInput.selectionStart ?? scriptInput.value.length;
    const end = scriptInput.selectionEnd ?? scriptInput.value.length;
    const text = scriptInput.value;
    const selected = text.substring(start, end);

    let replacement = '';
    if (closeTag) {
      replacement = openTag + (selected || 'text') + closeTag;
    } else {
      replacement = openTag + ' ';
    }

    scriptInput.value = text.substring(0, start) + replacement + text.substring(end);
    const newPos = start + replacement.length;
    scriptInput.selectionStart = newPos;
    scriptInput.selectionEnd = newPos;
    scriptInput.focus();
    updateInputStats();
    showToast(`Inserted vocal tag ${openTag}`, 'info');
  }

  vocalTagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      insertVocalTag(btn.dataset.tag, btn.dataset.close);
    });
  });

  // AI Studio Style Direction Presets
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const presetId = pill.dataset.preset;
      const presetObj = AIStudio.STYLE_PRESETS.find(p => p.id === presetId);
      if (presetObj) {
        promptTemplate.value = presetObj.instruction;
        AIStudio.setStyle(presetId);
        showToast(`Selected style direction: ${presetObj.name}`, 'info');
      }
    });
  });

  // Speaking Pace / Speed
  if (speedSelect) {
    speedSelect.value = String(AIStudio.getSpeed());
    speedSelect.addEventListener('change', () => {
      AIStudio.setSpeed(speedSelect.value);
      showToast(`Speaking pace set to ${speedSelect.value}x`, 'info');
    });
  }

  // Input Real-Time Stats & Active Script Sync
  scriptInput.addEventListener('input', () => {
    updateInputStats();
    syncActiveScriptFromInput();
  });

  // Upload Script(s) file input listener
  if (scriptFileInput) {
    scriptFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImportScriptFiles(Array.from(e.target.files));
        scriptFileInput.value = '';
      }
    });
  }

  // Clear all uploaded scripts
  if (btnClearUploadedScripts) {
    btnClearUploadedScripts.addEventListener('click', () => {
      state.uploadedScripts = [];
      state.activeScriptId = null;
      scriptInput.value = '';
      renderUploadedScriptsTray();
      updateInputStats();
      showToast('Cleared all uploaded scripts', 'info');
    });
  }

  // Workspace Script Filter dropdown
  if (scriptFilterSelect) {
    scriptFilterSelect.addEventListener('change', (e) => {
      state.scriptFilter = e.target.value;
      renderChunksList();
    });
  }

  // Split Mode dropdown toggle
  chunkMode.addEventListener('change', () => {
    const mode = chunkMode.value;
    if (mode === 'paragraphs' || mode === 'dialogue') {
      limitGroup.style.display = 'none';
    } else {
      limitGroup.style.display = 'flex';
      if (mode === 'words') {
        chunkLimit.min = '300'; chunkLimit.max = '2000'; chunkLimit.step = '50'; chunkLimit.value = '1500';
        chunkLimitValue.textContent = '1500 words (~10.0 mins)';
      } else if (mode === 'chars') {
        chunkLimit.min = '500'; chunkLimit.max = '3000'; chunkLimit.step = '100'; chunkLimit.value = '1200';
        chunkLimitValue.textContent = '1200 chars (~1.5 mins)';
      }
    }
  });

  // Range slider change
  chunkLimit.addEventListener('input', () => {
    const val = chunkLimit.value;
    const mode = chunkMode.value;
    if (mode === 'words') {
      const estMins = (val / 150).toFixed(1);
      chunkLimitValue.textContent = `${val} words (~${estMins} mins)`;
    } else {
      chunkLimitValue.textContent = `${val} chars`;
    }
  });

  // Load sample script
  btnSampleScript.addEventListener('click', () => {
    state.uploadedScripts = [];
    state.activeScriptId = null;
    renderUploadedScriptsTray();
    scriptInput.value = SAMPLE_SCRIPT;
    updateInputStats();
    showToast('Loaded sample demo script!', 'info');
  });

  // Clear script
  btnClear.addEventListener('click', () => {
    scriptInput.value = '';
    state.uploadedScripts = [];
    state.activeScriptId = null;
    renderUploadedScriptsTray();
    updateInputStats();
    state.chunks = [];
    workspacePanel.style.display = 'none';
    showToast('Input cleared', 'info');
  });

  // Split Script Button Action
  btnSplit.addEventListener('click', handleSplitScript);

  // Bulk Actions
  btnCopyAll.addEventListener('click', handleCopyAllChunks);
  btnGenerateAllApi.addEventListener('click', handleGenerateAllApi);
  if (btnDownloadAllAudio) btnDownloadAllAudio.addEventListener('click', handleDownloadAllAudio);
  btnExportJson.addEventListener('click', handleExportJson);
  btnStitchAudio.addEventListener('click', handleStitchAudio);

  // New Feature Event Listeners
  if (btnThemeToggle) btnThemeToggle.addEventListener('click', toggleTheme);
  
  if (btnPauseGeneration) {
    btnPauseGeneration.addEventListener('click', () => {
      state.generationPaused = !state.generationPaused;
      if (state.generationPaused) {
        btnPauseGeneration.classList.add('paused');
        btnPauseGeneration.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
        showToast('Generation paused', 'info');
      } else {
        btnPauseGeneration.classList.remove('paused');
        btnPauseGeneration.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        showToast('Generation resumed', 'info');
      }
    });
  }

  if (btnRetryFailed) {
    btnRetryFailed.addEventListener('click', handleRetryFailedChunks);
  }

  if (workerCountSlider) {
    workerCountSlider.addEventListener('input', (e) => {
      if (workerCountValue) workerCountValue.textContent = e.target.value;
      localStorage.setItem('sa_worker_count', e.target.value);
    });
    const savedWorkers = localStorage.getItem('sa_worker_count');
    if (savedWorkers) {
      workerCountSlider.value = savedWorkers;
      if (workerCountValue) workerCountValue.textContent = savedWorkers;
    }
  }

  if (importJsonInput) {
    importJsonInput.addEventListener('change', handleImportJson);
  }

  if (btnResumeSession) {
    btnResumeSession.addEventListener('click', applySessionResume);
  }

  if (btnDiscardSession) {
    btnDiscardSession.addEventListener('click', discardSavedSession);
  }

  // Network Connectivity Monitoring for Graceful Interruption Recovery
  window.addEventListener('offline', () => {
    showToast('⚠️ Internet connection dropped! Pausing generation safely...', 'warning');
    if (state.generationRunning && !state.generationPaused) {
      state.generationPaused = true;
      if (btnPauseGeneration) {
        btnPauseGeneration.classList.add('paused');
        btnPauseGeneration.innerHTML = '<i class="fa-solid fa-play"></i> Resume (Offline)';
      }
    }
    triggerAutoSave();
  });

  window.addEventListener('online', () => {
    showToast('📶 Internet connection restored! Ready to resume.', 'success');
    if (state.generationRunning && state.generationPaused && btnPauseGeneration) {
      btnPauseGeneration.innerHTML = '<i class="fa-solid fa-play"></i> Resume Generation';
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd) return;

    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      handleSplitScript();
    } else if (key === 'g') {
      e.preventDefault();
      if (btnGenerateAllApi && btnGenerateAllApi.style.display !== 'none' && !btnGenerateAllApi.disabled) {
        handleGenerateAllApi();
      }
    } else if (key === 'd') {
      e.preventDefault();
      if (btnDownloadAllAudio && !btnDownloadAllAudio.disabled) {
        handleDownloadAllAudio();
      }
    } else if (key === 'j') {
      e.preventDefault();
      if (btnStitchAudio && !btnStitchAudio.disabled) {
        handleStitchAudio();
      }
    } else if (key === 't') {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Search & Filter Pills
  chunkSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderChunksList();
  });

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.dataset.filter;
      renderChunksList();
    });
  });

  // Drag & Drop File onto Textarea
  const textareaWrapper = document.querySelector('.textarea-wrapper');
  ['dragenter', 'dragover'].forEach(eventName => {
    textareaWrapper.addEventListener(eventName, (e) => {
      e.preventDefault();
      dragOverlay.classList.add('active');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    textareaWrapper.addEventListener(eventName, (e) => {
      e.preventDefault();
      dragOverlay.classList.remove('active');
    });
  });
  textareaWrapper.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImportScriptFiles(Array.from(files));
    }
  });

  // Modal Handlers & Model/Voice Population
  function populateModelAndVoiceDropdowns() {
    // Populate Models
    modelSelect.innerHTML = '';
    const categories = {};
    AIStudio.MODELS.forEach(m => {
      if (!categories[m.category]) categories[m.category] = [];
      categories[m.category].push(m);
    });

    for (const [catName, models] of Object.entries(categories)) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = catName;
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name} [${m.badge}]`;
        optGroup.appendChild(opt);
      });
      modelSelect.appendChild(optGroup);
    }

    // Add Custom Model Option
    const customGroup = document.createElement('optgroup');
    customGroup.label = "Custom Model";
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Custom Model ID (Type manually)...';
    customGroup.appendChild(customOpt);
    modelSelect.appendChild(customGroup);

    // Populate Voice Select & Speaker 2 Select with rich grouped categories
    populateVoiceSelectElement(voiceSelect, AIStudio.getVoice());
    if (speaker2Select) {
      populateVoiceSelectElement(speaker2Select, AIStudio.getSpeaker2Voice());
    }
  }

  function populateVoiceSelectElement(selectEl, selectedVal) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const allVoices = AIStudio.getVoices();

    // 1. Featured Studio Voices (30)
    const featured = allVoices.filter(v => v.isFeatured);
    const grpFeatured = document.createElement('optgroup');
    grpFeatured.label = `⭐ Featured AI Studio Voices (${featured.length})`;
    featured.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.tone} • ${v.gender}) - ${v.desc}`;
      grpFeatured.appendChild(opt);
    });
    selectEl.appendChild(grpFeatured);

    // 2. Storytellers & Podcasters (Top 100)
    const narrators = allVoices.filter(v => !v.isFeatured && (v.persona.includes('Storyteller') || v.persona.includes('Podcast') || v.persona.includes('Documentary'))).slice(0, 100);
    const grpNarrators = document.createElement('optgroup');
    grpNarrators.label = `🎙️ Storytellers & Podcast Hosts (${narrators.length})`;
    narrators.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.accent} • ${v.gender}) - ${v.desc.substring(0, 45)}...`;
      grpNarrators.appendChild(opt);
    });
    selectEl.appendChild(grpNarrators);

    // 3. Regional Accents (Top 100 non-US)
    const regional = allVoices.filter(v => !v.isFeatured && !v.accent.includes('General American')).slice(0, 100);
    const grpRegional = document.createElement('optgroup');
    grpRegional.label = `🌏 Regional Accents (${regional.length})`;
    regional.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.accent} • ${v.gender})`;
      grpRegional.appendChild(opt);
    });
    selectEl.appendChild(grpRegional);

    // 4. Complete Library (All 1,000+ Voices)
    const grpAll = document.createElement('optgroup');
    grpAll.label = `📚 Complete AI Studio Library (${allVoices.length} Voices)`;
    allVoices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.accent} • ${v.gender})`;
      grpAll.appendChild(opt);
    });
    selectEl.appendChild(grpAll);

    if (selectedVal) {
      selectEl.value = selectedVal;
    }
  }

  function updateQuickConfigBadges() {
    const curModel = AIStudio.getModel();
    const curVoice = AIStudio.getVoice();

    const modelObj = AIStudio.MODELS.find(m => m.id === curModel);
    if (quickModelLabel) {
      quickModelLabel.textContent = modelObj ? modelObj.name.replace(' (Preview)', '') : curModel;
      quickModelLabel.title = `Model: ${curModel}`;
    }

    const voiceObj = AIStudio.VOICES.find(v => v.name === curVoice);
    if (quickVoiceLabel) {
      quickVoiceLabel.textContent = voiceObj ? `${voiceObj.name} (${voiceObj.tone})` : curVoice;
      quickVoiceLabel.title = `Voice: ${curVoice}`;
    }

    const curTemp = AIStudio.getTemperature();
    if (quickTempLabel) {
      quickTempLabel.textContent = `Temp: ${Number(curTemp).toFixed(1)}`;
      quickTempLabel.title = `Voiceover Temperature: ${curTemp}`;
    }

    const isMulti = AIStudio.getMultiSpeakerEnabled();
    const spk2 = AIStudio.getSpeaker2Voice();
    if (quickMultiSpeakerPill) {
      quickMultiSpeakerPill.style.display = isMulti ? 'flex' : 'none';
      if (quickMultiSpeakerLabel) {
        quickMultiSpeakerLabel.textContent = `Dual: ${spk2}`;
        quickMultiSpeakerPill.title = `Multi-Speaker Dialogue: Speaker 1 (${curVoice}) & Speaker 2 (${spk2})`;
      }
    }
  }

  function updateModelDescription() {
    const selectedVal = modelSelect.value === 'custom' ? (customModelInput.value.trim() || 'Custom') : modelSelect.value;
    const modelObj = AIStudio.MODELS.find(m => m.id === selectedVal);
    if (modelObj && modelDescHelp) {
      modelDescHelp.textContent = `${modelObj.badge}: ${modelObj.description}`;
    } else if (modelDescHelp) {
      modelDescHelp.textContent = 'Custom Gemini model ID endpoint for audio/voice generation.';
    }
  }

  function updateVoiceDescription() {
    const selectedVoice = voiceSelect.value;
    const voiceObj = AIStudio.VOICES.find(v => v.name === selectedVoice);
    if (voiceObj && voiceDescHelp) {
      voiceDescHelp.textContent = `${voiceObj.gender} • ${voiceObj.tone} tone: ${voiceObj.desc}`;
    }
  }

  function renderKeysList() {
    const keys = AIStudio.getApiKeys();
    const count = keys.length;

    if (totalKeysNum) totalKeysNum.textContent = count;
    if (detectedKeysCountBadge) detectedKeysCountBadge.textContent = `${count} Keys Loaded`;
    if (headerKeysLabel) headerKeysLabel.textContent = `API Keys (${count})`;

    if (apiStatusBadge) {
      if (count > 0) {
        apiStatusBadge.className = 'status-indicator connected';
        btnGenerateAllApi.style.display = 'inline-flex';
      } else {
        apiStatusBadge.className = 'status-indicator disconnected';
        btnGenerateAllApi.style.display = 'none';
      }
    }

    if (!keysChipsList) return;
    keysChipsList.innerHTML = '';

    if (count === 0) {
      keysChipsList.innerHTML = `
        <div style="font-size:0.78rem; color:var(--text-dim); text-align:center; padding:0.75rem;">
          No API keys saved yet. Paste keys above and click "Detect & Add Keys".
        </div>
      `;
      return;
    }

    keys.forEach((keyItem, idx) => {
      const chip = document.createElement('div');
      chip.className = `key-chip ${idx === AIStudio.activeKeyIndex ? 'active-key' : ''}`;

      let typeBadge = '';
      if (keyItem.key.startsWith('AQ.')) {
        typeBadge = '<span class="key-format-badge studio">AI Studio</span>';
      } else if (keyItem.key.startsWith('AIza')) {
        typeBadge = '<span class="key-format-badge classic">Gemini</span>';
      }

      let statusHtml = '<span class="key-status-badge unknown">Saved</span>';
      if (keyItem.status === 'valid') {
        statusHtml = '<span class="key-status-badge valid"><i class="fa-solid fa-check"></i> Valid</span>';
      } else if (keyItem.status === 'invalid') {
        statusHtml = '<span class="key-status-badge invalid"><i class="fa-solid fa-xmark"></i> Invalid</span>';
      } else if (keyItem.status === 'testing') {
        statusHtml = '<span class="key-status-badge testing"><i class="fa-solid fa-circle-notch spin-slow"></i></span>';
      }

      chip.innerHTML = `
        <div class="key-chip-info">
          <span class="key-chip-idx">#${idx + 1}</span>
          ${typeBadge}
          <span class="key-masked">${escapeHtml(AIStudio.maskKey(keyItem.key))}</span>
          ${statusHtml}
        </div>
        <button class="btn-remove-key" data-idx="${idx}" title="Remove this key">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      chip.querySelector('.btn-remove-key').addEventListener('click', (e) => {
        e.stopPropagation();
        AIStudio.removeKeyByIndex(idx);
        renderKeysList();
        showToast('API Key removed', 'info');
      });

      keysChipsList.appendChild(chip);
    });
  }

  // Real-time detection in textarea as user types or pastes
  if (bulkApiKeyInput) {
    bulkApiKeyInput.addEventListener('input', () => {
      const text = bulkApiKeyInput.value.trim();
      if (!text) {
        const total = AIStudio.getApiKeys().length;
        if (detectedKeysCountBadge) detectedKeysCountBadge.textContent = `${total} Keys Loaded`;
        return;
      }
      const detected = AIStudio.parseBulkKeys(text);
      if (detectedKeysCountBadge) detectedKeysCountBadge.textContent = `${detected.length} Keys Detected in input`;
    });
  }

  // Detect & Add Keys Button
  if (btnAddBulkKeys) {
    btnAddBulkKeys.addEventListener('click', () => {
      const text = bulkApiKeyInput.value.trim();
      if (!text) {
        showToast('Please paste one or more API keys first!', 'warning');
        return;
      }
      const res = AIStudio.addBulkKeysFromText(text);
      bulkApiKeyInput.value = '';
      renderKeysList();
      if (res.added > 0) {
        showToast(`Successfully saved ${res.added} new API key(s)! Total: ${res.total}`, 'success');
      } else if (res.duplicates > 0) {
        showToast(`All pasted keys already exist in your saved list (${res.duplicates} duplicates)`, 'info');
      } else {
        showToast('No valid Google AI Studio keys detected in pasted text', 'warning');
      }
    });
  }

  // Paste Keys from Clipboard Button
  if (btnPasteKeysClipboard) {
    btnPasteKeysClipboard.addEventListener('click', async () => {
      const clipText = await AIStudio.readClipboard();
      if (!clipText || !clipText.trim()) {
        showToast('Clipboard is empty or inaccessible. Press Cmd+V in the box.', 'warning');
        bulkApiKeyInput.focus();
        return;
      }
      bulkApiKeyInput.value = clipText;
      const res = AIStudio.addBulkKeysFromText(clipText);
      bulkApiKeyInput.value = '';
      renderKeysList();
      if (res.added > 0) {
        showToast(`Detected & saved ${res.added} new API key(s)! Total: ${res.total}`, 'success');
      } else if (res.duplicates > 0) {
        showToast(`All pasted keys already exist in your saved list (${res.duplicates} duplicates)`, 'info');
      } else {
        showToast('No valid Google AI Studio keys detected in clipboard', 'warning');
      }
    });
  }

  // Test All Keys Button
  if (btnTestAllKeys) {
    btnTestAllKeys.addEventListener('click', async () => {
      const keys = AIStudio.getApiKeys();
      if (keys.length === 0) {
        showToast('No API keys saved to test!', 'warning');
        return;
      }

      btnTestAllKeys.disabled = true;
      btnTestAllKeys.innerHTML = '<i class="fa-solid fa-circle-notch spin-slow"></i> Testing...';
      showToast(`Testing ${keys.length} API key(s) against Gemini API...`, 'info');

      // Mark testing in UI
      keys.forEach(k => k.status = 'testing');
      renderKeysList();

      const results = await AIStudio.testAllKeys();
      btnTestAllKeys.disabled = false;
      btnTestAllKeys.innerHTML = '<i class="fa-solid fa-vial-circle-check"></i> Test Keys';
      renderKeysList();

      const validCount = results.filter(r => r.success).length;
      if (validCount === results.length) {
        showToast(`All ${validCount} API keys are valid & working!`, 'success');
      } else {
        showToast(`${validCount} of ${results.length} API keys are valid. Check list for status.`, 'warning');
      }
    });
  }

  // Clear All Keys Button
  if (btnClearAllKeys) {
    btnClearAllKeys.addEventListener('click', () => {
      if (AIStudio.getApiKeys().length === 0) return;
      if (confirm('Are you sure you want to remove all saved API keys?')) {
        AIStudio.clearAllKeys();
        renderKeysList();
        showToast('All API keys cleared', 'info');
      }
    });
  }

  // Render Voice Artists Gallery (1,000+ Gemini & AI Studio Voices)
  function renderVoiceGallery() {
    if (!voiceCardsGrid) return;
    voiceCardsGrid.innerHTML = '';

    const allVoices = AIStudio.getVoices();
    const curVoice = AIStudio.getVoice();
    const query = (activeVoiceSearch || '').toLowerCase().trim();

    // Update Counter Badges
    if (totalVoicesCountBadge) totalVoicesCountBadge.textContent = `${allVoices.length} Voices`;
    if (quickTotalVoices) quickTotalVoices.textContent = allVoices.length.toLocaleString();
    if (countAllVoices) countAllVoices.textContent = allVoices.length;
    if (countFeaturedVoices) countFeaturedVoices.textContent = allVoices.filter(v => v.isFeatured).length;
    if (countFemaleVoices) countFemaleVoices.textContent = allVoices.filter(v => v.gender === 'Female').length;
    if (countMaleVoices) countMaleVoices.textContent = allVoices.filter(v => v.gender === 'Male').length;

    const countStoryVoices = document.getElementById('countStoryVoices');
    const countPodcastVoices = document.getElementById('countPodcastVoices');
    const countDramaticVoices = document.getElementById('countDramaticVoices');
    if (countStoryVoices) {
      countStoryVoices.textContent = allVoices.filter(v => 
        (v.persona || '').toLowerCase().includes('story') || 
        (v.tone || '').toLowerCase().includes('story')
      ).length;
    }
    if (countPodcastVoices) {
      countPodcastVoices.textContent = allVoices.filter(v => 
        (v.persona || '').toLowerCase().includes('podcast') || 
        (v.persona || '').toLowerCase().includes('host')
      ).length;
    }
    if (countDramaticVoices) {
      countDramaticVoices.textContent = allVoices.filter(v => 
        (v.persona || '').toLowerCase().includes('drama') || 
        (v.persona || '').toLowerCase().includes('character')
      ).length;
    }

    const filtered = allVoices.filter(v => {
      // Gender or Featured
      let matchGender = true;
      if (activeVoiceGender === 'featured') {
        matchGender = !!v.isFeatured;
      } else if (activeVoiceGender && activeVoiceGender !== 'all') {
        matchGender = (v.gender || '').toLowerCase() === activeVoiceGender.toLowerCase();
      }

      // Persona / Speaker Type
      let matchPersona = true;
      if (activeVoicePersona && activeVoicePersona !== 'all') {
        const pLow = activeVoicePersona.toLowerCase();
        matchPersona = (v.persona || '').toLowerCase().includes(pLow) || 
                       (v.tone || '').toLowerCase().includes(pLow) ||
                       (v.desc || '').toLowerCase().includes(pLow);
      }

      // Accent
      let matchAccent = true;
      if (activeVoiceAccent && activeVoiceAccent !== 'all') {
        matchAccent = (v.accent || '').toLowerCase().includes(activeVoiceAccent.toLowerCase());
      }

      // Search Query (Multi-word search support)
      let matchQuery = true;
      if (query) {
        const fullStr = `${v.name} ${v.accent || ''} ${v.tone || ''} ${v.persona || ''} ${v.desc || ''} ${v.id || ''}`.toLowerCase();
        const searchWords = query.split(/\s+/).filter(Boolean);
        matchQuery = searchWords.every(w => fullStr.includes(w));
      }

      return matchGender && matchPersona && matchAccent && matchQuery;
    });

    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / voicePageSize));
    voiceTotalPages = totalPages;
    if (voiceCurrentPage > totalPages) voiceCurrentPage = 1;
    const startIndex = (voiceCurrentPage - 1) * voicePageSize;
    const endIndex = Math.min(startIndex + voicePageSize, totalFiltered);
    const pageItems = filtered.slice(startIndex, endIndex);

    // Update Pagination UI
    if (voicePageStatus) {
      voicePageStatus.textContent = totalFiltered > 0
        ? `Showing ${startIndex + 1}–${endIndex} of ${totalFiltered} voices (Page ${voiceCurrentPage} of ${totalPages})`
        : '0 voices found matching filter';
    }
    if (btnVoicePrevPage) btnVoicePrevPage.disabled = voiceCurrentPage <= 1;
    if (btnVoiceNextPage) btnVoiceNextPage.disabled = voiceCurrentPage >= totalPages;

    if (pageItems.length === 0) {
      voiceCardsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 2rem;">
          <i class="fa-solid fa-microphone-slash" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
          No voices found matching "${escapeHtml(query || activeVoicePersona || activeVoiceAccent)}".<br>
          <button type="button" class="btn btn-secondary btn-sm" id="btnResetVoiceFilter" style="margin-top: 0.75rem;">Reset Filters</button>
        </div>
      `;
      const btnReset = document.getElementById('btnResetVoiceFilter');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          activeVoiceGender = 'all';
          activeVoicePersona = 'all';
          activeVoiceAccent = 'all';
          activeVoiceSearch = '';
          if (voiceSearchInput) voiceSearchInput.value = '';
          if (voicePersonaFilter) voicePersonaFilter.value = 'all';
          if (voiceAccentFilter) voiceAccentFilter.value = 'all';
          if (voiceFilterPills) {
            voiceFilterPills.forEach(p => p.classList.toggle('active', p.dataset.gender === 'all'));
          }
          voiceCurrentPage = 1;
          renderVoiceGallery();
        });
      }
      return;
    }

    pageItems.forEach(voice => {
      const isSelected = voice.name === curVoice;
      const card = document.createElement('div');
      card.className = `voice-card compact-chip ${isSelected ? 'selected' : ''}`;
      card.dataset.voice = voice.name;

      const isFemale = (voice.gender || '').toLowerCase() === 'female';
      const genderClass = isFemale ? 'female' : 'male';
      const genderIcon = isFemale ? '<i class="fa-solid fa-venus"></i> ♀' : '<i class="fa-solid fa-mars"></i> ♂';
      const cleanAccent = voice.accent ? voice.accent.replace(/^(US - |UK - )/, '') : '';

      card.innerHTML = `
        <div class="voice-chip-left">
          <span class="voice-card-name" title="${escapeHtml(voice.name)}">${escapeHtml(voice.name)}</span>
          ${voice.isFeatured ? '<span class="voice-chip-star" title="Featured Voice"><i class="fa-solid fa-star"></i></span>' : ''}
          <span class="voice-chip-tone-pill" title="Tone: ${escapeHtml(voice.tone || 'Natural')}">${escapeHtml(voice.tone || 'Natural')}</span>
          ${cleanAccent ? `<span class="voice-chip-accent-pill" title="Accent: ${escapeHtml(voice.accent)}">${escapeHtml(cleanAccent)}</span>` : ''}
        </div>
        <div class="voice-chip-right">
          <span class="voice-badge-gender ${genderClass}">${genderIcon}</span>
          <button class="btn-chip-preview" type="button" title="Listen to ${escapeHtml(voice.name)}">
            <i class="fa-solid fa-play"></i>
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-chip-preview')) return;
        selectVoice(voice.name);
      });

      const btnPrev = card.querySelector('.btn-chip-preview');
      btnPrev.addEventListener('click', async (e) => {
        e.stopPropagation();
        btnPrev.disabled = true;
        btnPrev.innerHTML = '<i class="fa-solid fa-circle-notch spin-slow"></i>';
        try {
          const sampleText = `Hello, I'm ${voice.name}. This is a Google AI Studio voiceover sample with ${voice.accent || 'natural'} inflection.`;
          const selectedModel = modelSelect.value === 'custom' ? (customModelInput.value.trim() || 'gemini-3.8-flash-lite-tts') : modelSelect.value;
          let blob;
          if (AIStudio.hasValidKey()) {
            blob = await AIStudio.generateAudioForChunk(sampleText, voice.name, selectedModel);
          } else {
            blob = await AIStudio.synthesizeFallbackAudio(sampleText);
          }
          const audioUrl = URL.createObjectURL(blob);
          voicePreviewAudio.src = audioUrl;
          voicePreviewAudio.play();
          showToast(`Playing sample for ${voice.name}`, 'info');
        } catch (err) {
          showToast(`Preview failed: ${err.message}`, 'warning');
        } finally {
          btnPrev.disabled = false;
          btnPrev.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
      });

      voiceCardsGrid.appendChild(card);
    });

    const activeObj = allVoices.find(v => v.name === curVoice);
    if (activeVoiceBadgeName && activeObj) {
      activeVoiceBadgeName.textContent = `${activeObj.name} (${activeObj.tone} - ${activeObj.gender})`;
    }
    updateActiveVoiceSummary(curVoice);
  }

  function updateActiveVoiceSummary(voiceName) {
    const allVoices = AIStudio.getVoices();
    const v = allVoices.find(x => x.name === voiceName) || {
      name: voiceName,
      gender: 'Female',
      tone: 'Firm & Confident',
      accent: 'General American',
      isFeatured: true
    };

    if (activeVoiceDisplayName) activeVoiceDisplayName.textContent = v.name;
    
    if (activeVoiceFeaturedBadge) {
      activeVoiceFeaturedBadge.style.display = v.isFeatured ? 'inline-flex' : 'none';
    }

    if (activeVoiceGenderBadge) {
      const isFemale = (v.gender || '').toLowerCase() === 'female';
      activeVoiceGenderBadge.className = `badge-mini gender ${isFemale ? 'female' : 'male'}`;
      activeVoiceGenderBadge.innerHTML = isFemale 
        ? '<i class="fa-solid fa-venus"></i> Female' 
        : '<i class="fa-solid fa-mars"></i> Male';
    }

    if (activeVoiceToneBadge) {
      activeVoiceToneBadge.innerHTML = `<i class="fa-solid fa-microphone"></i> ${escapeHtml(v.tone || 'Natural')}`;
    }

    if (activeVoiceAccentBadge) {
      activeVoiceAccentBadge.innerHTML = `<i class="fa-solid fa-earth-americas"></i> ${escapeHtml(v.accent || 'General American')}`;
    }
  }

  function selectVoice(voiceName) {
    AIStudio.setVoice(voiceName);
    if (voiceSelect) voiceSelect.value = voiceName;
    updateVoiceDescription();
    updateQuickConfigBadges();
    updateActiveVoiceSummary(voiceName);
    renderVoiceGallery();
    if (speaker1Display) speaker1Display.textContent = `${voiceName} (Active Voice)`;
    showToast(`Voice Artist selected: ${voiceName}`, 'info');
  }

  // Voice Filter Pills & Search
  const voiceFilterPillsList = document.querySelectorAll('.voice-filter-pill');
  if (voiceFilterPillsList) {
    voiceFilterPillsList.forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.voice-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        if (pill.dataset.gender) {
          activeVoiceGender = pill.dataset.gender;
          if (pill.dataset.gender === 'all') {
            activeVoicePersona = 'all';
            activeVoiceAccent = 'all';
            if (voicePersonaFilter) voicePersonaFilter.value = 'all';
            if (voiceAccentFilter) voiceAccentFilter.value = 'all';
          }
        } else if (pill.dataset.persona) {
          activeVoicePersona = pill.dataset.persona;
          if (voicePersonaFilter) voicePersonaFilter.value = pill.dataset.persona;
        }

        voiceCurrentPage = 1;
        renderVoiceGallery();
      });
    });
  }

  if (voicePersonaFilter) {
    voicePersonaFilter.addEventListener('change', (e) => {
      activeVoicePersona = e.target.value;
      const pills = document.querySelectorAll('.voice-filter-pill');
      pills.forEach(p => {
        p.classList.toggle('active', p.dataset.persona === e.target.value || (e.target.value === 'all' && p.dataset.gender === 'all'));
      });
      voiceCurrentPage = 1;
      renderVoiceGallery();
    });
  }

  if (voiceAccentFilter) {
    voiceAccentFilter.addEventListener('change', (e) => {
      activeVoiceAccent = e.target.value;
      voiceCurrentPage = 1;
      renderVoiceGallery();
    });
  }

  if (voiceSearchInput) {
    voiceSearchInput.addEventListener('input', (e) => {
      activeVoiceSearch = e.target.value;
      voiceCurrentPage = 1;
      renderVoiceGallery();
    });
  }

  if (btnVoicePrevPage) {
    btnVoicePrevPage.addEventListener('click', () => {
      if (voiceCurrentPage > 1) {
        voiceCurrentPage--;
        renderVoiceGallery();
        const galleryEl = document.querySelector('.main-voice-section');
        if (galleryEl) galleryEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (btnVoiceNextPage) {
    btnVoiceNextPage.addEventListener('click', () => {
      if (voiceCurrentPage < voiceTotalPages) {
        voiceCurrentPage++;
        renderVoiceGallery();
        const galleryEl = document.querySelector('.main-voice-section');
        if (galleryEl) galleryEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Live Sync Voices from Google AI Studio API (/v1beta/voices)
  if (btnSyncVoicesApi) {
    btnSyncVoicesApi.addEventListener('click', async () => {
      if (!AIStudio.hasValidKey()) {
        showToast('Please add an API key first to sync voices!', 'warning');
        return;
      }

      btnSyncVoicesApi.disabled = true;
      btnSyncVoicesApi.innerHTML = '<i class="fa-solid fa-circle-notch spin-slow"></i> Syncing...';
      showToast('Fetching latest voices from Google AI Studio API...', 'info');

      try {
        const res = await AIStudio.syncVoicesFromApi();
        populateModelAndVoiceDropdowns();
        renderVoiceGallery();
        showToast(`Successfully synced! Total library now has ${res.total} voices.`, 'success');
      } catch (err) {
        showToast(`Sync failed: ${err.message}`, 'warning');
      } finally {
        btnSyncVoicesApi.disabled = false;
        btnSyncVoicesApi.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Sync from AI Studio';
      }
    });
  }

  // Toggle Voices Catalog Drawer
  if (btnToggleVoiceCatalog && voiceCatalogDrawer) {
    btnToggleVoiceCatalog.addEventListener('click', () => {
      const isCollapsed = voiceCatalogDrawer.classList.toggle('collapsed');
      if (toggleCatalogIcon) {
        toggleCatalogIcon.className = isCollapsed 
          ? 'fa-solid fa-chevron-down toggle-icon' 
          : 'fa-solid fa-chevron-up toggle-icon';
      }
      if (toggleCatalogText) {
        toggleCatalogText.textContent = isCollapsed ? 'Change Artist' : 'Hide Catalog';
      }
    });
  }

  // Preview currently selected active voice
  if (btnPreviewSelectedVoice) {
    btnPreviewSelectedVoice.addEventListener('click', async () => {
      const curVoice = AIStudio.getVoice();
      const allVoices = AIStudio.getVoices();
      const voiceObj = allVoices.find(v => v.name === curVoice) || { name: curVoice, accent: 'General American' };
      btnPreviewSelectedVoice.disabled = true;
      btnPreviewSelectedVoice.innerHTML = '<i class="fa-solid fa-circle-notch spin-slow"></i> Playing...';
      try {
        const sampleText = `Hello, I'm ${voiceObj.name}. This is a Google AI Studio voiceover sample with ${voiceObj.accent || 'natural'} inflection.`;
        const selectedModel = modelSelect.value === 'custom' ? (customModelInput.value.trim() || 'gemini-3.8-flash-lite-tts') : modelSelect.value;
        let blob;
        if (AIStudio.hasValidKey()) {
          blob = await AIStudio.generateAudioForChunk(sampleText, voiceObj.name, selectedModel);
        } else {
          blob = await AIStudio.synthesizeFallbackAudio(sampleText);
        }
        const audioUrl = URL.createObjectURL(blob);
        voicePreviewAudio.src = audioUrl;
        voicePreviewAudio.play();
        showToast(`Playing sample for active artist: ${voiceObj.name}`, 'info');
      } catch (err) {
        showToast(`Preview failed: ${err.message}`, 'warning');
      } finally {
        btnPreviewSelectedVoice.disabled = false;
        btnPreviewSelectedVoice.innerHTML = '<i class="fa-solid fa-play"></i> Preview Voice';
      }
    });
  }

  function syncParamInputsFromStorage() {
    const curTemp = AIStudio.getTemperature();
    if (paramTemperature) paramTemperature.value = curTemp;
    if (tempValDisplay) tempValDisplay.textContent = Number(curTemp).toFixed(2);

    const curTopP = AIStudio.getTopP();
    if (paramTopP) paramTopP.value = curTopP;
    if (topPValDisplay) topPValDisplay.textContent = Number(curTopP).toFixed(2);

    const curTopK = AIStudio.getTopK();
    if (paramTopK) paramTopK.value = curTopK;
    if (topKValDisplay) topKValDisplay.textContent = curTopK;

    const curSeed = AIStudio.getSeed();
    if (paramSeed) paramSeed.value = curSeed !== null ? curSeed : '';
    if (seedValDisplay) seedValDisplay.textContent = curSeed !== null ? `#${curSeed}` : 'Random';

    const multiEnabled = AIStudio.getMultiSpeakerEnabled();
    if (multiSpeakerToggle) multiSpeakerToggle.checked = multiEnabled;
    if (multiSpeakerSettings) multiSpeakerSettings.style.display = multiEnabled ? 'block' : 'none';

    if (speaker1Display) speaker1Display.textContent = `${AIStudio.getVoice()} (Active Voice)`;
    if (speaker2Select) speaker2Select.value = AIStudio.getSpeaker2Voice();

    const curPersona = AIStudio.getPersonaId();
    if (paramPersonaId) paramPersonaId.value = curPersona;
  }

  function openSettingsModal() {
    renderKeysList();
    renderVoiceGallery();
    syncParamInputsFromStorage();
    if (bulkApiKeyInput) bulkApiKeyInput.value = '';

    const curModel = AIStudio.getModel();
    const curVoice = AIStudio.getVoice();

    const modelExists = AIStudio.MODELS.some(m => m.id === curModel);
    if (modelExists) {
      modelSelect.value = curModel;
      customModelInput.style.display = 'none';
    } else {
      modelSelect.value = 'custom';
      customModelInput.value = curModel;
      customModelInput.style.display = 'block';
    }

    voiceSelect.value = curVoice;
    updateModelDescription();
    updateVoiceDescription();
    apiTestResult.style.display = 'none';
    settingsModal.style.display = 'flex';
  }

  btnSettings.addEventListener('click', openSettingsModal);
  if (btnVoiceGallery) {
    btnVoiceGallery.addEventListener('click', () => {
      openSettingsModal();
      setTimeout(() => {
        const galleryEl = document.querySelector('.voice-gallery-header');
        if (galleryEl) galleryEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
  }
  if (btnQuickConfig) {
    btnQuickConfig.addEventListener('click', openSettingsModal);
  }

  modelSelect.addEventListener('change', () => {
    if (modelSelect.value === 'custom') {
      customModelInput.style.display = 'block';
      customModelInput.focus();
    } else {
      customModelInput.style.display = 'none';
    }
    updateModelDescription();
  });

  voiceSelect.addEventListener('change', () => {
    AIStudio.setVoice(voiceSelect.value);
    updateVoiceDescription();
    updateQuickConfigBadges();
    updateActiveVoiceSummary(voiceSelect.value);
    renderVoiceGallery();
  });

  btnPreviewVoice.addEventListener('click', async () => {
    const selectedVoice = voiceSelect.value;
    const selectedModel = modelSelect.value === 'custom' ? (customModelInput.value.trim() || 'gemini-3.8-flash-tts') : modelSelect.value;

    btnPreviewVoice.disabled = true;
    btnPreviewVoice.innerHTML = '<i class="fa-solid fa-circle-notch spin-slow"></i> Testing...';

    try {
      let previewBlob;
      if (AIStudio.hasValidKey()) {
        previewBlob = await AIStudio.generateAudioForChunk(`Hello! This is a test voiceover with ${selectedVoice} on Gemini ${selectedModel}.`, selectedVoice, selectedModel);
      } else {
        previewBlob = await AIStudio.synthesizeFallbackAudio(`Hello! This is a test voiceover preview with ${selectedVoice}.`);
      }

      const previewUrl = URL.createObjectURL(previewBlob);
      voicePreviewAudio.src = previewUrl;
      voicePreviewAudio.play();
      showToast(`Playing preview for ${selectedVoice} (${selectedModel})`, 'info');
    } catch (err) {
      showToast(`Preview failed: ${err.message}`, 'warning');
    } finally {
      btnPreviewVoice.disabled = false;
      btnPreviewVoice.innerHTML = '<i class="fa-solid fa-volume-high"></i> Preview';
    }
  });

  btnCloseModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  btnTestApiKey.addEventListener('click', async () => {
    const activeKey = AIStudio.getActiveApiKey();
    if (!activeKey) {
      showToast('Please add an API key first!', 'warning');
      return;
    }
    btnTestApiKey.disabled = true;
    btnTestApiKey.innerHTML = '<i class="fa-solid fa-circle-notch spin-slow"></i> Testing...';
    
    const res = await AIStudio.testApiKey(activeKey);
    btnTestApiKey.disabled = false;
    btnTestApiKey.innerHTML = '<i class="fa-solid fa-plug"></i> Test Key';

    apiTestResult.style.display = 'block';
    if (res.success) {
      apiTestResult.className = 'modal-status-box success';
      apiTestResult.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${res.message}`;
    } else {
      apiTestResult.className = 'modal-status-box error';
      apiTestResult.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${res.error}`;
    }
  });

  // AI Studio Speech Generation Parameters Event Listeners
  if (paramTemperature) {
    paramTemperature.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (tempValDisplay) tempValDisplay.textContent = val.toFixed(2);
      AIStudio.setTemperature(val);
      updateQuickConfigBadges();
    });
  }

  if (paramTopP) {
    paramTopP.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (topPValDisplay) topPValDisplay.textContent = val.toFixed(2);
      AIStudio.setTopP(val);
    });
  }

  if (paramTopK) {
    paramTopK.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (topKValDisplay) topKValDisplay.textContent = val;
      AIStudio.setTopK(val);
    });
  }

  if (paramSeed) {
    paramSeed.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const num = val ? parseInt(val, 10) : null;
      if (seedValDisplay) seedValDisplay.textContent = num !== null && !isNaN(num) ? `#${num}` : 'Random';
      AIStudio.setSeed(num);
    });
  }

  if (multiSpeakerToggle) {
    multiSpeakerToggle.addEventListener('change', (e) => {
      const checked = e.target.checked;
      if (multiSpeakerSettings) multiSpeakerSettings.style.display = checked ? 'block' : 'none';
      AIStudio.setMultiSpeakerEnabled(checked);
      updateQuickConfigBadges();
      showToast(checked ? 'Multi-Speaker Dialogue Mode enabled!' : 'Single Voice Mode active', 'info');
    });
  }

  if (speaker2Select) {
    speaker2Select.addEventListener('change', (e) => {
      AIStudio.setSpeaker2Voice(e.target.value);
      updateQuickConfigBadges();
    });
  }

  if (paramPersonaId) {
    paramPersonaId.addEventListener('input', (e) => {
      AIStudio.setPersonaId(e.target.value);
    });
  }

  if (btnResetParams) {
    btnResetParams.addEventListener('click', () => {
      AIStudio.resetGenerationDefaults();
      syncParamInputsFromStorage();
      updateQuickConfigBadges();
      showToast('AI Studio generation parameters reset to default.', 'info');
    });
  }

  btnSaveSettings.addEventListener('click', () => {
    // If user has text in the bulk keys textarea, auto-save it
    if (bulkApiKeyInput && bulkApiKeyInput.value.trim()) {
      AIStudio.addBulkKeysFromText(bulkApiKeyInput.value.trim());
      bulkApiKeyInput.value = '';
    }

    const chosenModel = modelSelect.value === 'custom' ? (customModelInput.value.trim() || 'gemini-3.8-flash-tts') : modelSelect.value;
    AIStudio.setModel(chosenModel);
    AIStudio.setVoice(voiceSelect.value);

    // Save AI Studio generation parameters
    if (paramTemperature) AIStudio.setTemperature(paramTemperature.value);
    if (paramTopP) AIStudio.setTopP(paramTopP.value);
    if (paramTopK) AIStudio.setTopK(paramTopK.value);
    if (paramSeed) {
      const sVal = paramSeed.value.trim();
      AIStudio.setSeed(sVal ? parseInt(sVal, 10) : null);
    }
    if (multiSpeakerToggle) AIStudio.setMultiSpeakerEnabled(multiSpeakerToggle.checked);
    if (speaker2Select) AIStudio.setSpeaker2Voice(speaker2Select.value);
    if (paramPersonaId) AIStudio.setPersonaId(paramPersonaId.value);

    settingsModal.style.display = 'none';
    initSettings();
    showToast(`Settings & Keys saved! (${AIStudio.getApiKeys().length} keys active)`, 'success');
  });

  // --- Functions & Logic ---

  function initSettings() {
    populateModelAndVoiceDropdowns();
    syncParamInputsFromStorage();
    updateQuickConfigBadges();
    renderKeysList();
    updateActiveVoiceSummary(AIStudio.getVoice());
    renderVoiceGallery();
  }

  function updateInputStats() {
    const stats = Chunker.getStats(scriptInput.value);
    inputWordCount.textContent = stats.words.toLocaleString();
    inputEstTime.textContent = stats.durationFormatted;
  }

  function updateScriptFilterDropdown() {
    if (!scriptFilterSelect) return;
    const uniqueScripts = Array.from(new Set(state.chunks.map(c => c.scriptId).filter(Boolean)));
    if (uniqueScripts.length > 1) {
      scriptFilterSelect.style.display = 'inline-block';
      scriptFilterSelect.innerHTML = '<option value="all">All Scripts (' + uniqueScripts.length + ')</option>';
      uniqueScripts.forEach(sid => {
        const opt = document.createElement('option');
        opt.value = sid;
        const count = state.chunks.filter(c => c.scriptId === sid).length;
        opt.textContent = `${sid} (${count} Chunks)`;
        scriptFilterSelect.appendChild(opt);
      });
      scriptFilterSelect.value = state.scriptFilter || 'all';
    } else {
      scriptFilterSelect.style.display = 'none';
      state.scriptFilter = 'all';
    }
  }

  function handleSplitScript() {
    const mode = chunkMode.value;
    const limit = parseInt(chunkLimit.value, 10);
    const template = promptTemplate.value.trim();

    state.chunks = [];

    // Case 1: Multiple or uploaded scripts
    if (state.uploadedScripts.length > 0) {
      let globalIndex = 1;
      state.uploadedScripts.forEach(script => {
        const text = script.text.trim();
        if (!text) return;
        const scriptChunks = Chunker.splitScript(text, mode, limit, template);
        scriptChunks.forEach((sc, localIdx) => {
          sc.index = globalIndex++;
          sc.scriptId = script.id;
          sc.scriptFilename = script.filename;
          sc.chunkNumber = localIdx + 1;
          sc.chunkName = `${script.id} Chunk ${localIdx + 1}`;
          state.chunks.push(sc);
        });
      });
    } else {
      // Case 2: Direct script input in textarea without upload
      const text = scriptInput.value.trim();
      if (!text) {
        showToast('Please enter, paste, or upload a script first!', 'warning');
        return;
      }
      const rawChunks = Chunker.splitScript(text, mode, limit, template);
      rawChunks.forEach((sc, idx) => {
        sc.scriptId = 'V1';
        sc.chunkNumber = idx + 1;
        sc.chunkName = `Chunk #${idx + 1}`;
        state.chunks.push(sc);
      });
    }

    if (state.chunks.length === 0) {
      showToast('No script text found to divide!', 'warning');
      return;
    }

    state.masterAudioBlob = null;
    if (state.masterAudioUrl) URL.revokeObjectURL(state.masterAudioUrl);
    state.masterAudioUrl = null;
    masterAudioCard.style.display = 'none';

    updateScriptFilterDropdown();

    workspacePanel.style.display = 'block';
    workspacePanel.scrollIntoView({ behavior: 'smooth' });

    updateWorkspaceHeader();
    renderChunksList();
    triggerAutoSave();
    showToast(`Successfully divided into ${state.chunks.length} chunks!`, 'success');

    // Auto-generate if enabled
    if (autoGenerateToggle && autoGenerateToggle.checked) {
      if (AIStudio.hasValidKey()) {
        setTimeout(() => handleGenerateAllApi(), 400);
      } else {
        showToast('Auto-generate skipped: Please add API key in Settings first!', 'warning');
      }
    }
  }

  function updateWorkspaceHeader() {
    const total = state.chunks.length;
    const ready = state.chunks.filter(c => c.status === 'ready').length;
    
    statTotalChunks.textContent = total;
    statReadyChunks.textContent = `${ready} / ${total}`;

    // Total estimated duration
    const totalSecs = state.chunks.reduce((acc, c) => acc + c.estDurationSeconds, 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    statTotalAudioTime.textContent = `${mins}m ${secs}s`;

    // Filter pill counts
    countFilterAll.textContent = total;
    countFilterPending.textContent = total - ready;
    countFilterReady.textContent = ready;

    // Timeline Bar Progress
    timelineBar.innerHTML = '';
    const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
    timelinePercent.textContent = `${pct}% Complete (${ready}/${total} Ready)`;

    state.chunks.forEach((chunk) => {
      const seg = document.createElement('div');
      seg.className = `timeline-seg ${chunk.status}`;
      seg.title = `${chunk.chunkName || ('Chunk ' + chunk.index)}: ${chunk.words} words (${chunk.status})`;
      seg.addEventListener('click', () => {
        const cardElem = document.getElementById(`card_${chunk.id}`);
        if (cardElem) cardElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      timelineBar.appendChild(seg);
    });

    // Stitch button state
    btnStitchAudio.disabled = ready === 0;
  }

  function renderChunksList() {
    chunksContainer.innerHTML = '';

    const filtered = state.chunks.filter(chunk => {
      const matchesSearch = !state.searchQuery || 
        chunk.text.toLowerCase().includes(state.searchQuery) ||
        (chunk.chunkName && chunk.chunkName.toLowerCase().includes(state.searchQuery));

      const matchesScript = !state.scriptFilter || state.scriptFilter === 'all' || chunk.scriptId === state.scriptFilter;

      let matchesStatus = true;
      if (state.filter === 'ready') matchesStatus = chunk.status === 'ready';
      if (state.filter === 'pending') matchesStatus = chunk.status !== 'ready';

      return matchesSearch && matchesScript && matchesStatus;
    });

    if (filtered.length === 0) {
      chunksContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 0.5rem;"></i>
          <p>No script chunks found matching your search/filter criteria.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(chunk => {
      const card = document.createElement('div');
      card.id = `card_${chunk.id}`;
      card.className = `chunk-card ${chunk.status === 'ready' ? 'audio-ready' : (chunk.status === 'generating' ? 'audio-generating' : '')}`;

      card.innerHTML = `
        <div class="chunk-card-header">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button type="button" class="chunk-collapse-btn" data-chunk-id="${chunk.id}" title="Collapse or Expand chunk text">
              <i class="fa-solid fa-chevron-${state.collapsedChunks.has(chunk.id) ? 'down' : 'up'}"></i>
            </button>
            <span class="chunk-badge">
              <i class="fa-solid fa-puzzle-piece"></i> ${escapeHtml(chunk.chunkName || ('Chunk #' + chunk.index))}
            </span>
          </div>
          <div class="chunk-meta">
            <span><i class="fa-solid fa-font"></i> ${chunk.words} words</span>
            <span><i class="fa-solid fa-clock"></i> ~${chunk.estDurationFormatted}</span>
            <span class="status-tag ${chunk.status}">
              ${chunk.status === 'ready' ? '<i class="fa-solid fa-check" style="color:var(--success);"></i> Audio Ready' : 
                (chunk.status === 'generating' ? '<i class="fa-solid fa-circle-notch spin-slow" style="color:var(--warning);"></i> Generating...' : 
                (chunk.status === 'failed' ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Failed' : '<i class="fa-solid fa-hourglass-start"></i> Pending Audio'))}
            </span>
          </div>
        </div>

        <div class="chunk-text-box ${state.collapsedChunks.has(chunk.id) ? 'collapsed' : ''}" contenteditable="true" data-chunk-id="${chunk.id}">
          ${escapeHtml(chunk.text)}
        </div>

        <div class="chunk-actions">
          <div class="action-group">
            <button class="btn btn-secondary btn-sm btn-copy-chunk" data-chunk-id="${chunk.id}" title="Copy formatted prompt for Google AI Studio">
              <i class="fa-solid fa-copy"></i> Copy Prompt
            </button>
            <button class="btn btn-ghost btn-sm btn-copy-raw" data-chunk-id="${chunk.id}" title="Copy clean script text only">
              <i class="fa-regular fa-clipboard"></i> Copy Text
            </button>
            ${AIStudio.hasValidKey() ? `
              <button class="btn btn-accent btn-sm btn-gen-api" data-chunk-id="${chunk.id}" ${chunk.status === 'generating' ? 'disabled' : ''}>
                <i class="fa-solid fa-bolt"></i> Generate Audio
              </button>
            ` : ''}
          </div>

          ${chunk.audioUrl ? `
            <div class="chunk-audio-player-wrapper">
              <audio controls src="${chunk.audioUrl}"></audio>
              <a href="${chunk.audioUrl}" download="chunk_${String(chunk.index).padStart(2, '0')}_${(chunk.voice || 'voiceover').toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav" class="btn btn-secondary btn-sm btn-download-single" title="Download Voiceover (.wav)">
                <i class="fa-solid fa-download"></i> Download
              </a>
              <button class="btn btn-ghost btn-sm btn-remove-audio" data-chunk-id="${chunk.id}" title="Remove Audio">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          ` : `
            <div class="audio-dropzone" data-chunk-id="${chunk.id}">
              <i class="fa-solid fa-cloud-arrow-up"></i> Drop audio clip (.mp3, .wav) or click to upload
              <input type="file" accept="audio/*" class="audio-file-input" data-chunk-id="${chunk.id}" style="display:none;">
            </div>
          `}
        </div>
      `;

      // Attach Card Events
      const txtBox = card.querySelector('.chunk-text-box');
      txtBox.addEventListener('blur', () => {
        const newText = txtBox.innerText.trim();
        chunk.text = newText;
        const stats = Chunker.getStats(newText);
        chunk.words = stats.words;
        chunk.estDurationSeconds = stats.durationSeconds;
        chunk.estDurationFormatted = stats.durationFormatted;
        chunk.formattedPrompt = AIStudio.formatClipboardPrompt(newText, promptTemplate.value);
        updateWorkspaceHeader();
      });

      // Collapse / Expand toggle
      const btnCollapse = card.querySelector('.chunk-collapse-btn');
      if (btnCollapse) {
        btnCollapse.addEventListener('click', (e) => {
          e.stopPropagation();
          if (state.collapsedChunks.has(chunk.id)) {
            state.collapsedChunks.delete(chunk.id);
          } else {
            state.collapsedChunks.add(chunk.id);
          }
          renderChunksList();
        });
      }

      // Copy Clean Script Text
      const btnCopyRaw = card.querySelector('.btn-copy-raw');
      if (btnCopyRaw) {
        btnCopyRaw.addEventListener('click', () => {
          navigator.clipboard.writeText(chunk.text).then(() => {
            showToast(`Chunk #${chunk.index} clean text copied!`, 'success');
          });
        });
      }

      // Copy Chunk Prompt Button
      const btnCopy = card.querySelector('.btn-copy-chunk');
      btnCopy.addEventListener('click', () => {
        const formattedText = AIStudio.formatClipboardPrompt(chunk.text, promptTemplate.value);
        navigator.clipboard.writeText(formattedText).then(() => {
          showToast(`Chunk #${chunk.index} prompt copied to clipboard!`, 'success');
        });
      });

      // Generate API Button (if present)
      const btnGenApi = card.querySelector('.btn-gen-api');
      if (btnGenApi) {
        btnGenApi.addEventListener('click', () => handleGenerateSingleApi(chunk));
      }

      // Audio Dropzone & File Upload
      const dropzone = card.querySelector('.audio-dropzone');
      if (dropzone) {
        const fileInput = card.querySelector('.audio-file-input');
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) {
            handleAttachAudioFile(chunk, e.target.files[0]);
          }
        });
        
        ['dragover', 'dragenter'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--primary)'; }));
        ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--border-color)'; }));
        dropzone.addEventListener('drop', (e) => {
          if (e.dataTransfer.files.length > 0) {
            handleAttachAudioFile(chunk, e.dataTransfer.files[0]);
          }
        });
      }

      // Remove audio clip button
      const btnRemoveAudio = card.querySelector('.btn-remove-audio');
      if (btnRemoveAudio) {
        btnRemoveAudio.addEventListener('click', () => {
          if (chunk.audioUrl) URL.revokeObjectURL(chunk.audioUrl);
          chunk.audioBlob = null;
          chunk.audioUrl = null;
          chunk.status = 'pending';
          updateWorkspaceHeader();
          renderChunksList();
          showToast(`Removed audio for Chunk #${chunk.index}`, 'info');
        });
      }

      chunksContainer.appendChild(card);
    });
  }

  function handleAttachAudioFile(chunk, file) {
    if (!file.type.startsWith('audio/')) {
      showToast('Please upload a valid audio file (.mp3, .wav, .m4a)', 'warning');
      return;
    }

    chunk.audioBlob = file;
    chunk.audioUrl = URL.createObjectURL(file);
    chunk.audioFileName = file.name;
    chunk.status = 'ready';

    updateWorkspaceHeader();
    renderChunksList();
    showToast(`Audio attached to Chunk #${chunk.index}!`, 'success');
  }

  async function handleGenerateSingleApi(chunk) {
    chunk.status = 'generating';
    updateWorkspaceHeader();
    renderChunksList();

    try {
      const activeVoice = AIStudio.getVoice();
      const activeModel = AIStudio.getModel();
      const audioBlob = await AIStudio.generateAudioForChunk(chunk.text, activeVoice, activeModel);
      chunk.audioBlob = audioBlob;
      chunk.audioUrl = URL.createObjectURL(audioBlob);
      chunk.status = 'ready';
      showToast(`Generated audio for Chunk #${chunk.index} (${activeVoice} • ${activeModel})!`, 'success');
    } catch (err) {
      chunk.status = 'pending';
      showToast(`API Error Chunk #${chunk.index}: ${err.message}`, 'warning');
    }

    updateWorkspaceHeader();
    renderChunksList();
  }

  async function handleGenerateAllApi() {
    const pendingChunks = state.chunks.filter(c => c.status !== 'ready');
    if (pendingChunks.length === 0) {
      showToast('All chunks already have audio!', 'info');
      return;
    }

    if (!AIStudio.hasValidKey()) {
      showToast('Please add at least one valid Google AI Studio API key in Settings first!', 'warning');
      settingsModal.style.display = 'flex';
      return;
    }

    state.generationRunning = true;
    state.generationPaused = false;
    state.generationAborted = false;
    state.genStats = { active: 0, done: 0, failed: 0, startTime: Date.now() };

    btnGenerateAllApi.disabled = true;
    const origBtnHtml = btnGenerateAllApi.innerHTML;
    btnGenerateAllApi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating in Parallel...';

    if (btnPauseGeneration) {
      btnPauseGeneration.style.display = 'inline-flex';
      btnPauseGeneration.classList.remove('paused');
      btnPauseGeneration.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }
    if (btnRetryFailed) btnRetryFailed.style.display = 'none';
    updateLiveGenStats();

    showToast(`Starting parallel generation for ${pendingChunks.length} chunks...`, 'info');

    const keys = AIStudio.getKeys();
    const activeVoice = AIStudio.getVoice();
    const activeModel = AIStudio.getModel();

    const maxConcurrency = Math.min(10, Math.max(1, parseInt(workerCountSlider?.value || 4, 10)));
    let nextChunkIdx = 0;
    let completedCount = 0;
    const totalPending = pendingChunks.length;

    const keyCooldowns = {};
    keys.forEach(k => { keyCooldowns[k] = 0; });

    function getAvailableKey() {
      const now = Date.now();
      const valid = keys.filter(k => (keyCooldowns[k] || 0) <= now);
      if (valid.length > 0) {
        return valid[Math.floor(Math.random() * valid.length)];
      }
      return keys[0];
    }

    async function processWorker() {
      while (nextChunkIdx < pendingChunks.length) {
        if (state.generationAborted) break;

        // Check and handle paused state
        while (state.generationPaused && !state.generationAborted) {
          await new Promise(r => setTimeout(r, 400));
        }
        if (state.generationAborted) break;

        const chunk = pendingChunks[nextChunkIdx++];
        if (!chunk || chunk.status === 'ready') continue;

        state.genStats.active++;
        chunk.status = 'generating';
        updateWorkspaceHeader();
        renderChunksList();
        updateLiveGenStats();

        let success = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!success && attempts < maxAttempts) {
          if (state.generationAborted) break;
          while (state.generationPaused && !state.generationAborted) {
            await new Promise(r => setTimeout(r, 400));
          }
          if (state.generationAborted) break;

          attempts++;
          const keyToUse = getAvailableKey();
          try {
            const audioBlob = await AIStudio.generateAudioWithSpecificKey(
              chunk.text,
              activeVoice,
              activeModel,
              keyToUse,
              promptTemplate.value.trim()
            );

            chunk.audioBlob = audioBlob;
            chunk.audioUrl = URL.createObjectURL(audioBlob);
            chunk.status = 'ready';
            chunk.voice = activeVoice;
            delete chunk.error;
            success = true;
            completedCount++;
            state.genStats.active = Math.max(0, state.genStats.active - 1);
            state.genStats.done++;
            triggerAutoSave();
            btnGenerateAllApi.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating (${completedCount}/${totalPending})...`;
          } catch (err) {
            console.warn(`Chunk ${chunk.chunkName || chunk.index} attempt ${attempts} error:`, err.message);
            if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'))) {
              keyCooldowns[keyToUse] = Date.now() + 25000;
            }
            if (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 1500 * attempts));
            } else {
              chunk.status = 'failed';
              chunk.error = err.message;
              state.genStats.active = Math.max(0, state.genStats.active - 1);
              state.genStats.failed++;
            }
          }
          updateLiveGenStats();
        }

        updateWorkspaceHeader();
        renderChunksList();
      }
    }

    const workerPromises = [];
    const activeWorkers = Math.min(maxConcurrency, pendingChunks.length);
    for (let w = 0; w < activeWorkers; w++) {
      workerPromises.push(processWorker());
    }

    await Promise.all(workerPromises);

    state.generationRunning = false;
    state.generationPaused = false;
    btnGenerateAllApi.disabled = false;
    btnGenerateAllApi.innerHTML = origBtnHtml;
    if (btnPauseGeneration) btnPauseGeneration.style.display = 'none';
    updateLiveGenStats();
    updateWorkspaceHeader();
    renderChunksList();
    triggerAutoSave();

    const failedCount = state.chunks.filter(c => c.status === 'failed').length;
    if (btnRetryFailed) {
      btnRetryFailed.style.display = failedCount > 0 ? 'inline-flex' : 'none';
    }

    const finalReady = state.chunks.filter(c => c.status === 'ready').length;
    if (finalReady === state.chunks.length) {
      playSuccessChime();
      showToast(`🎉 All ${state.chunks.length} chunks successfully generated!`, 'success');
    } else {
      showToast(`Generation completed: ${finalReady} ready, ${failedCount} failed.`, failedCount > 0 ? 'warning' : 'success');
    }
  }

  function handleRetryFailedChunks() {
    const failedChunks = state.chunks.filter(c => c.status === 'failed' || (c.status === 'pending' && c.error));
    if (failedChunks.length === 0) {
      showToast('No failed chunks found to retry!', 'info');
      return;
    }
    failedChunks.forEach(c => {
      c.status = 'pending';
      delete c.error;
    });
    updateWorkspaceHeader();
    renderChunksList();
    showToast(`Retrying ${failedChunks.length} failed chunk(s)...`, 'info');
    handleGenerateAllApi();
  }

  function handleCopyAllChunks() {
    if (state.chunks.length === 0) return;

    const allFormatted = state.chunks.map(c => {
      return `--- CHUNK #${c.index} (${c.words} words) ---\n${AIStudio.formatClipboardPrompt(c.text, promptTemplate.value)}`;
    }).join('\n\n=========================================\n\n');

    navigator.clipboard.writeText(allFormatted).then(() => {
      showToast('All formatted chunks copied to clipboard!', 'success');
    });
  }

  async function handleDownloadAllAudio() {
    const readyChunks = state.chunks.filter(c => c.status === 'ready' && (c.audioBlob || c.audioUrl));
    if (readyChunks.length === 0) {
      showToast('No audio clips ready to download yet. Generate audio first!', 'warning');
      return;
    }

    const originalHtml = btnDownloadAllAudio ? btnDownloadAllAudio.innerHTML : '';
    if (btnDownloadAllAudio) {
      btnDownloadAllAudio.disabled = true;
      btnDownloadAllAudio.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Building ZIP...';
    }

    showToast(`Packaging ${readyChunks.length} audio clip(s) into ZIP...`, 'info');

    try {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library is missing');
      }

      const zip = new JSZip();
      const chunksFolder = zip.folder("individual_chunks");

      const scriptsMap = {};
      readyChunks.forEach(c => {
        const sid = c.scriptId || 'V1';
        if (!scriptsMap[sid]) scriptsMap[sid] = [];
        scriptsMap[sid].push(c);
      });

      const isMp3 = downloadFormatSelect && downloadFormatSelect.value === 'mp3';
      const audioExt = isMp3 ? 'mp3' : 'wav';
      const audioCtx = isMp3 ? new (window.AudioContext || window.webkitAudioContext)() : null;

      for (const chunk of readyChunks) {
        const sid = chunk.scriptId || 'V1';
        const cNum = String(chunk.chunkNumber || chunk.index).padStart(3, '0');
        const filename = `${sid}_Chunk_${cNum}.${audioExt}`;
        let blob = chunk.audioBlob;
        if (!blob && chunk.audioUrl) {
          const resp = await fetch(chunk.audioUrl);
          blob = await resp.blob();
        }
        if (blob) {
          let chunkOutBlob = blob;
          if (isMp3 && typeof BulkStitcher !== 'undefined' && typeof lamejs !== 'undefined') {
            try {
              const abuf = await BulkStitcher.decodeBlobToAudioBuffer(blob, audioCtx);
              chunkOutBlob = BulkStitcher.encodeMp3Blob(abuf, 192);
            } catch (e) {
              console.warn('Chunk MP3 convert fallback to WAV:', e);
              chunkOutBlob = blob;
            }
          }
          chunksFolder.file(filename, chunkOutBlob);
        }
      }

      let manifestLines = [
        '=======================================================',
        'ScriptAudio Studio - Master Audio Generation Manifest',
        'Generated at: ' + new Date().toISOString(),
        'Audio Format: ' + audioExt.toUpperCase(),
        'Total Ready Clips: ' + readyChunks.length,
        '=======================================================\n'
      ];

      for (const [sid, scriptChunks] of Object.entries(scriptsMap)) {
        scriptChunks.sort((a, b) => (a.chunkNumber || a.index) - (b.chunkNumber || b.index));
        
        manifestLines.push(`[Script ${sid}] - ${scriptChunks.length} Chunks`);
        scriptChunks.forEach(sc => {
          manifestLines.push(`  - ${sc.chunkName || ('Chunk ' + sc.index)} (${sc.words} words)`);
        });

        try {
          const blobs = scriptChunks.map(c => c.audioBlob).filter(Boolean);
          if (blobs.length > 0) {
            const masterWavBlob = await AudioStitcher.stitchAudioBlobs(blobs, 0.35);
            let finalMasterBlob = masterWavBlob;
            if (isMp3 && typeof BulkStitcher !== 'undefined' && typeof lamejs !== 'undefined') {
              try {
                const abuf = await BulkStitcher.decodeBlobToAudioBuffer(masterWavBlob, audioCtx);
                finalMasterBlob = BulkStitcher.encodeMp3Blob(abuf, 192);
              } catch (e) {
                console.warn('Master MP3 convert fallback:', e);
                finalMasterBlob = masterWavBlob;
              }
            }
            zip.file(`${sid}.${audioExt}`, finalMasterBlob);
            manifestLines.push(`  -> Assembled Master Track: ${sid}.${audioExt}\n`);
          }
        } catch (stitchErr) {
          console.warn(`Could not stitch master audio for ${sid}:`, stitchErr);
        }
      }

      zip.file('README_MANIFEST.txt', manifestLines.join('\n'));

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        if (btnDownloadAllAudio) {
          btnDownloadAllAudio.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Zipping ${metadata.percent.toFixed(0)}%...`;
        }
      });

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Voiceovers_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

      showToast(`ZIP package downloaded successfully! (${(zipBlob.size / 1024 / 1024).toFixed(1)} MB)`, 'success');
    } catch (err) {
      console.error('Download ZIP error:', err);
      showToast('Error packaging ZIP: ' + err.message, 'warning');
    } finally {
      if (btnDownloadAllAudio) {
        btnDownloadAllAudio.disabled = false;
        btnDownloadAllAudio.innerHTML = originalHtml || '<i class="fa-solid fa-file-zipper"></i> Download All (ZIP)';
      }
    }
  }

  function handleExportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.chunks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `scriptaudio_project_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Project JSON exported!', 'success');
  }

  async function handleStitchAudio() {
    let targetChunks = state.chunks.filter(c => c.status === 'ready' && c.audioBlob);
    
    if (state.scriptFilter && state.scriptFilter !== 'all') {
      targetChunks = targetChunks.filter(c => c.scriptId === state.scriptFilter);
    }

    if (targetChunks.length === 0) {
      showToast('No audio clips available to stitch for current selection!', 'warning');
      return;
    }

    targetChunks.sort((a, b) => (a.chunkNumber || a.index) - (b.chunkNumber || b.index));

    btnStitchAudio.disabled = true;
    btnStitchAudio.innerHTML = '<i class="fa-solid fa-circle-notch spin-slow"></i> Stitching Audio Clips...';

    try {
      const audioBlobs = targetChunks.map(c => c.audioBlob).filter(Boolean);
      const masterBlob = await AudioStitcher.stitchAudioBlobs(audioBlobs, 0.35);

      if (state.masterAudioUrl) URL.revokeObjectURL(state.masterAudioUrl);

      state.masterAudioBlob = masterBlob;
      state.masterAudioUrl = URL.createObjectURL(masterBlob);

      masterAudioPlayer.src = state.masterAudioUrl;
      const scriptLabel = (state.scriptFilter && state.scriptFilter !== 'all') ? state.scriptFilter : 'master_voiceover';
      btnDownloadMaster.href = state.masterAudioUrl;
      btnDownloadMaster.download = `${scriptLabel}.wav`;

      const tempAudio = new Audio(state.masterAudioUrl);
      tempAudio.onloadedmetadata = () => {
        const mins = Math.floor(tempAudio.duration / 60);
        const secs = Math.floor(tempAudio.duration % 60);
        masterDuration.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      };

      masterAudioCard.style.display = 'flex';
      masterAudioCard.scrollIntoView({ behavior: 'smooth' });

      showToast(`Master Voiceover Track (${scriptLabel}) successfully stitched!`, 'success');
    } catch (err) {
      showToast(`Stitching Error: ${err.message}`, 'warning');
    }

    btnStitchAudio.disabled = false;
    btnStitchAudio.innerHTML = '<i class="fa-solid fa-object-group"></i> Stitch Master Audio Track';
  }

  // Toast System Helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-solid fa-info-circle';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `<i class="${iconClass}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Live Generation Stats UI Updater ---
  function updateLiveGenStats() {
    if (!liveGenStats) return;
    if (!state.generationRunning) {
      liveGenStats.style.display = 'none';
      return;
    }
    liveGenStats.style.display = 'flex';
    if (genStatActive) genStatActive.textContent = state.genStats.active;
    if (genStatDone) genStatDone.textContent = state.genStats.done;
    if (genStatFailed) genStatFailed.textContent = state.genStats.failed;

    // Calculate dynamic ETA
    const pending = state.chunks.filter(c => c.status !== 'ready').length;
    if (state.genStats.done > 0 && state.genStats.startTime > 0) {
      const elapsedSecs = (Date.now() - state.genStats.startTime) / 1000;
      const avgSecPerChunk = elapsedSecs / state.genStats.done;
      const workers = Math.max(1, parseInt(workerCountSlider?.value || 4, 10));
      const remainingSecs = Math.round((pending * avgSecPerChunk) / workers);
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      if (genStatEta) genStatEta.textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    } else {
      if (genStatEta) genStatEta.textContent = 'Calculating...';
    }
  }

  // --- Project JSON Import ---
  function handleImportJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data) || data.length === 0) {
          showToast('Invalid project JSON: Expected an array of chunks', 'warning');
          return;
        }
        state.chunks = data;
        state.chunks.forEach(c => {
          c.audioBlob = null;
          c.audioUrl = null;
          if (c.status === 'ready') c.status = 'pending';
        });
        updateScriptFilterDropdown();
        workspacePanel.style.display = 'block';
        updateWorkspaceHeader();
        renderChunksList();
        triggerAutoSave();
        showToast(`Imported project with ${state.chunks.length} chunks!`, 'success');
      } catch (err) {
        showToast('Error reading project JSON: ' + err.message, 'warning');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // --- Synthesis Audio Chime for Completion ---
  function playSuccessChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12); // B5
      gain2.gain.setValueAtTime(0.18, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (_) {}
  }

  // --- Theme Switching ---
  function applyTheme(theme) {
    state.theme = theme;
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }
    localStorage.setItem('sa_theme', theme);
  }

  function toggleTheme() {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme} theme`, 'info');
  }

  // --- Persistent Autosave & Interruption Resume Engine ---
  const AUTOSAVE_KEY = 'scriptaudio_autosave_state';

  function triggerAutoSave() {
    try {
      if (!state.chunks || state.chunks.length === 0) return;
      
      const serializableChunks = state.chunks.map(c => ({
        id: c.id,
        index: c.index,
        scriptId: c.scriptId,
        scriptFilename: c.scriptFilename,
        chunkNumber: c.chunkNumber,
        chunkName: c.chunkName,
        text: c.text,
        words: c.words,
        estDurationSeconds: c.estDurationSeconds,
        estDurationFormatted: c.estDurationFormatted,
        status: c.status,
        voice: c.voice,
        hasAudio: c.status === 'ready' && !!(c.audioBlob || c.audioUrl)
      }));

      const sessionData = {
        timestamp: Date.now(),
        scriptInputValue: scriptInput ? scriptInput.value : '',
        activeScriptId: state.activeScriptId,
        uploadedScripts: state.uploadedScripts,
        chunks: serializableChunks
      };

      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(sessionData));

      if (typeof BulkStorage !== 'undefined') {
        state.chunks.forEach(c => {
          if (c.status === 'ready' && c.audioBlob) {
            BulkStorage.saveAudioBlob(c.id, c.audioBlob).catch(() => {});
          }
        });
      }
    } catch (e) {
      console.warn('Autosave warning:', e);
    }
  }

  function startAutoSaveInterval() {
    setInterval(() => {
      if (state.chunks && state.chunks.length > 0) {
        triggerAutoSave();
      }
    }, 10000);
  }

  async function restoreAutoSave() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (!session || !session.chunks || session.chunks.length === 0) return;

      const total = session.chunks.length;
      const ready = session.chunks.filter(c => c.hasAudio || c.status === 'ready').length;

      if (resumeBanner && resumeTotalCount && resumeReadyCount) {
        resumeTotalCount.textContent = total;
        resumeReadyCount.textContent = ready;
        resumeBanner.style.display = 'flex';
      }
    } catch (e) {
      console.warn('Autosave restore check failed:', e);
    }
  }

  async function applySessionResume() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (!session || !session.chunks) return;

      if (session.scriptInputValue && !scriptInput.value) {
        scriptInput.value = session.scriptInputValue;
      }
      if (session.uploadedScripts && session.uploadedScripts.length > 0) {
        state.uploadedScripts = session.uploadedScripts;
        state.activeScriptId = session.activeScriptId;
        renderUploadedScriptsTray();
      }

      state.chunks = session.chunks;
      
      if (typeof BulkStorage !== 'undefined') {
        for (const chunk of state.chunks) {
          if (chunk.hasAudio || chunk.status === 'ready') {
            try {
              const blob = await BulkStorage.getAudioBlob(chunk.id);
              if (blob) {
                chunk.audioBlob = blob;
                chunk.audioUrl = URL.createObjectURL(blob);
                chunk.status = 'ready';
              }
            } catch (_) {}
          }
        }
      }

      updateInputStats();
      updateScriptFilterDropdown();
      workspacePanel.style.display = 'block';
      updateWorkspaceHeader();
      renderChunksList();

      if (resumeBanner) resumeBanner.style.display = 'none';
      showToast(`Session successfully restored! (${state.chunks.length} chunks)`, 'success');
    } catch (err) {
      console.error('Session resume error:', err);
      showToast('Failed to resume session: ' + err.message, 'warning');
    }
  }

  function discardSavedSession() {
    localStorage.removeItem(AUTOSAVE_KEY);
    if (resumeBanner) resumeBanner.style.display = 'none';
    showToast('Previous session cleared', 'info');
  }

});
