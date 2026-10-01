/**
 * ScriptAudio Studio - Google AI Studio Integration Engine
 * Handles API key management, prompt formatting, model selection,
 * all 30 Gemini voices, and Gemini TTS direct audio generation.
 */

const AIStudio = {
  STORAGE_KEY_API: 'scriptaudio_gemini_api_key',
  STORAGE_KEY_API_KEYS: 'scriptaudio_gemini_api_keys',
  STORAGE_KEY_VOICE: 'scriptaudio_gemini_voice',
  STORAGE_KEY_MODEL: 'scriptaudio_gemini_model',
  STORAGE_KEY_SPEED: 'scriptaudio_gemini_speed',
  STORAGE_KEY_STYLE: 'scriptaudio_gemini_style',
  STORAGE_KEY_TEMPERATURE: 'scriptaudio_gemini_temperature',
  STORAGE_KEY_TOP_P: 'scriptaudio_gemini_top_p',
  STORAGE_KEY_TOP_K: 'scriptaudio_gemini_top_k',
  STORAGE_KEY_SEED: 'scriptaudio_gemini_seed',
  STORAGE_KEY_SPEAKER_2: 'scriptaudio_gemini_speaker_2',
  STORAGE_KEY_MULTI_SPEAKER: 'scriptaudio_gemini_multi_speaker',
  STORAGE_KEY_PERSONA_ID: 'scriptaudio_gemini_persona_id',
  activeKeyIndex: 0,

  /**
   * Google AI Studio Vocal Expressive Tags
   * Supported by Gemini 3.8 Flash TTS & audio models
   */
  VOCAL_TAGS: [
    { tag: '<laugh>', label: 'Laugh', icon: '😄', desc: 'Inserts natural laughter or chuckle' },
    { tag: '<sigh>', label: 'Sigh', icon: '😮‍💨', desc: 'Inserts emotional or relieved sigh' },
    { tag: '<breath>', label: 'Breath', icon: '💨', desc: 'Audible inhale or realistic breath' },
    { tag: '<short pause>', label: 'Pause', icon: '⏸️', desc: 'Brief silence / dramatic pause' },
    { tag: '<whisper>', closeTag: '</whisper>', label: 'Whisper', icon: '🤫', desc: 'Soft, hushed intimate delivery' },
    { tag: '<gasp>', label: 'Gasp', icon: '😲', desc: 'Sharp intake of breath or shock' },
    { tag: '<emphasis>', closeTag: '</emphasis>', label: 'Emphasis', icon: '💡', desc: 'Stresses important words' }
  ],

  /**
   * Google AI Studio Style Direction Presets
   */
  STYLE_PRESETS: [
    {
      id: 'storyteller',
      name: 'Storyteller',
      icon: 'fa-book-open',
      instruction: 'Generate a natural, clear, engaging storytelling voiceover with expressive pacing, warmth, and emotion for the following text:'
    },
    {
      id: 'cinematic',
      name: 'Cinematic & Dramatic',
      icon: 'fa-film',
      instruction: 'Generate a cinematic, deep, dramatic voiceover with gravity, meaningful pauses, and intense emotional resonance for the following text:'
    },
    {
      id: 'podcast',
      name: 'High-Energy Podcast',
      icon: 'fa-podcast',
      instruction: 'Generate an upbeat, lively, conversational podcast host voiceover with energetic inflection and enthusiasm for the following text:'
    },
    {
      id: 'documentary',
      name: 'Documentary',
      icon: 'fa-landmark',
      instruction: 'Generate an authoritative, articulate, measured, and informative documentary narration for the following text:'
    },
    {
      id: 'whisper',
      name: 'Whispered / ASMR',
      icon: 'fa-volume-low',
      instruction: 'Generate an intimate, gentle, soft whispered voiceover with calming cadence for the following text:'
    },
    {
      id: 'corporate',
      name: 'Corporate & Clean',
      icon: 'fa-briefcase',
      instruction: 'Generate a polished, crisp, confident, and professional presentation voiceover for the following text:'
    }
  ],

  /**
   * Complete List of Gemini Voiceover / TTS & Audio Models
   */
  MODELS: [
    {
      id: 'gemini-3.8-flash-tts',
      name: 'Gemini 3.8 Flash TTS',
      category: 'Google AI Studio Active (aistudio.google.com)',
      badge: 'AI Studio Flagship',
      description: 'Currently active on aistudio.google.com. Studio-quality expressive voice acting, emotional nuance, vocal tags (<laugh>, <sigh>), and 130 languages.'
    },
    {
      id: 'gemini-3.8-flash-lite-tts',
      name: 'Gemini 3.8 Flash-Lite TTS',
      category: 'Google AI Studio Active (aistudio.google.com)',
      badge: 'AI Studio High-Speed',
      description: 'Currently active on aistudio.google.com. Ultra-fast bulk generation, cost-efficient, natural speech across 101 languages.'
    },
    {
      id: 'gemini-3.8-live-extended-thinking',
      name: 'Gemini 3.8 Live Extended Thinking',
      category: 'Google AI Studio Active (aistudio.google.com)',
      badge: 'AI Studio Live Audio',
      description: 'Real-time conversational streaming and thinking audio generation.'
    },
    {
      id: 'gemini-2.5-flash-preview-tts',
      name: 'Gemini 2.5 Flash TTS (Preview)',
      category: 'Gemini 2.5 TTS Series',
      badge: 'Fast TTS',
      description: 'Ultra-fast, expressive voiceover with natural prosody and inflection.'
    },
    {
      id: 'gemini-2.5-flash-lite-preview-tts',
      name: 'Gemini 2.5 Flash-Lite TTS (Preview)',
      category: 'Gemini 2.5 TTS Series',
      badge: 'Low Cost TTS',
      description: 'Optimized for high-speed, cost-efficient bulk voiceover generation.'
    },
    {
      id: 'gemini-2.5-pro-tts',
      name: 'Gemini 2.5 Pro TTS',
      category: 'Gemini 2.5 TTS Series',
      badge: 'Pro TTS',
      description: 'High fidelity narrative delivery with deep context understanding.'
    },
    {
      id: 'gemini-3.1-flash-tts-preview',
      name: 'Gemini 3.1 Flash TTS (Preview)',
      category: 'Gemini 3.x Preview Series',
      badge: 'Multi-Speaker',
      description: 'Deep storytelling nuance with multi-speaker voiceover orchestration.'
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash (Audio Modality)',
      category: 'Multimodal Audio Models',
      badge: 'General Audio',
      description: 'Multimodal foundation model supporting direct audio modality output.'
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (Audio Modality)',
      category: 'Multimodal Audio Models',
      badge: 'High Fidelity',
      description: 'Deep context reasoning and high-fidelity script interpretation.'
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash (Legacy)',
      category: 'Legacy Audio Models',
      badge: 'Legacy',
      description: 'Standard Gemini 2.0 audio generation model.'
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash-Lite (Legacy)',
      category: 'Legacy Audio Models',
      badge: 'Legacy',
      description: 'Lightweight Gemini 2.0 audio generation model.'
    }
  ],

  /**
   * Complete Library of 1,000+ Gemini Voice Artists
   */
  VOICES: (typeof window !== 'undefined' && window.AI_STUDIO_VOICES_CATALOG)
    ? window.AI_STUDIO_VOICES_CATALOG
    : ((typeof require !== 'undefined')
      ? (function() { try { return require('./voices-data.js'); } catch(e) { return null; } })()
      : null) || [
    { id: "Kore", name: "Kore", tone: "Firm", gender: "Female", desc: "Clear, confident & professional (Default)", accent: "General American", persona: "High-Trust Advisor / Host", isFeatured: true },
    { id: "Puck", name: "Puck", tone: "Upbeat", gender: "Male", desc: "Enthusiastic, lively & engaging", accent: "General American", persona: "Companion & Peer / Podcaster", isFeatured: true },
    { id: "Charon", name: "Charon", tone: "Informative", gender: "Male", desc: "Deep, resonant & authoritative", accent: "General American", persona: "Documentary Narrator", isFeatured: true },
    { id: "Fenrir", name: "Fenrir", tone: "Excitable", gender: "Male", desc: "Energetic, dramatic & dynamic", accent: "General American", persona: "Commercial & Character", isFeatured: true },
    { id: "Aoede", name: "Aoede", tone: "Breezy", gender: "Female", desc: "Natural, fluid & pleasant", accent: "General American", persona: "Storyteller & Narrator", isFeatured: true },
    { id: "Zephyr", name: "Zephyr", tone: "Bright", gender: "Female", desc: "Warm, bright & friendly", accent: "General American", persona: "Educational Tutor & Guide", isFeatured: true },
    { id: "Leda", name: "Leda", tone: "Youthful", gender: "Female", desc: "Fresh, youthful & modern", accent: "General American", persona: "Modern Content & Social", isFeatured: true },
    { id: "Orus", name: "Orus", tone: "Firm", gender: "Male", desc: "Solid, dependable & strong", accent: "General American", persona: "Instructional & Corporate", isFeatured: true },
    { id: "Callirrhoe", name: "Callirrhoe", tone: "Easy-going", gender: "Female", desc: "Relaxed, conversational & friendly", accent: "General American", persona: "Conversational / Lifestyle", isFeatured: true },
    { id: "Autonoe", name: "Autonoe", tone: "Bright", gender: "Female", desc: "Crisp, vibrant & clear", accent: "General American", persona: "Explainer & Product Voice", isFeatured: true },
    { id: "Enceladus", name: "Enceladus", tone: "Breathy", gender: "Male", desc: "Soft, intimate & cinematic", accent: "General American", persona: "Cinematic & Drama", isFeatured: true },
    { id: "Iapetus", name: "Iapetus", tone: "Clear", gender: "Male", desc: "Clean, articulate & educational", accent: "General American", persona: "Educational Tutor", isFeatured: true },
    { id: "Umbriel", name: "Umbriel", tone: "Easy-going", gender: "Male", desc: "Calm, casual & approachable", accent: "General American", persona: "Podcast Host", isFeatured: true },
    { id: "Algieba", name: "Algieba", tone: "Smooth", gender: "Female", desc: "Velvety, polished & warm", accent: "General American", persona: "Luxury / Brand Voice", isFeatured: true },
    { id: "Despina", name: "Despina", tone: "Smooth", gender: "Female", desc: "Gentle, flowing & soothing", accent: "General American", persona: "Wellness & Meditation", isFeatured: true },
    { id: "Erinome", name: "Erinome", tone: "Clear", gender: "Female", desc: "Sharp, precise & clear narration", accent: "General American", persona: "News & Documentary", isFeatured: true },
    { id: "Algenib", name: "Algenib", tone: "Gravelly", gender: "Male", desc: "Deep, gritty & character-rich", accent: "General American", persona: "Storyteller & Action", isFeatured: true },
    { id: "Rasalgethi", name: "Rasalgethi", tone: "Informative", gender: "Male", desc: "Documentary style, articulate", accent: "General American", persona: "History & Science Narrator", isFeatured: true },
    { id: "Laomedeia", name: "Laomedeia", tone: "Upbeat", gender: "Female", desc: "Cheerful & spirited", accent: "General American", persona: "Children & Animated", isFeatured: true },
    { id: "Achernar", name: "Achernar", tone: "Soft", gender: "Male", desc: "Quiet, gentle & reflective", accent: "General American", persona: "Literary & Intimate", isFeatured: true },
    { id: "Alnilam", name: "Alnilam", tone: "Firm", gender: "Male", desc: "Commanding & direct", accent: "General American", persona: "Trailer & Promo Voice", isFeatured: true },
    { id: "Schedar", name: "Schedar", tone: "Even", gender: "Female", desc: "Balanced, steady & news-style", accent: "General American", persona: "Broadcast News Anchor", isFeatured: true },
    { id: "Gacrux", name: "Gacrux", tone: "Mature", gender: "Male", desc: "Seasoned, mature & wise", accent: "General American", persona: "Elder Storyteller", isFeatured: true },
    { id: "Pulcherrima", name: "Pulcherrima", tone: "Forward", gender: "Female", desc: "Bold, forward & motivational", accent: "General American", persona: "Motivational & Leadership", isFeatured: true },
    { id: "Achird", name: "Achird", tone: "Friendly", gender: "Male", desc: "Welcoming, warm podcast style", accent: "General American", persona: "Community & Interview", isFeatured: true },
    { id: "Zubenelgenubi", name: "Zubenelgenubi", tone: "Casual", gender: "Male", desc: "Laid-back, relaxed storytelling", accent: "General American", persona: "Folk & Anecdotal", isFeatured: true },
    { id: "Vindemiatrix", name: "Vindemiatrix", tone: "Gentle", gender: "Female", desc: "Tender, nurturing & gentle", accent: "General American", persona: "Audiobook Storyteller", isFeatured: true },
    { id: "Sadachbia", name: "Sadachbia", tone: "Lively", gender: "Female", desc: "Vivid, animated & energetic", accent: "General American", persona: "Creative & Expressive", isFeatured: true },
    { id: "Sadaltager", name: "Sadaltager", tone: "Knowledgeable", gender: "Male", desc: "Academic, expert narrator", accent: "General American", persona: "Academic & Tech Speaker", isFeatured: true },
    { id: "Sulafat", name: "Sulafat", tone: "Warm", gender: "Female", desc: "Rich, heartwarming & welcoming", accent: "General American", persona: "Biographical Narrator", isFeatured: true }
  ],

  getVoices() {
    if (typeof window !== 'undefined' && window.AI_STUDIO_VOICES_CATALOG && this.VOICES.length < window.AI_STUDIO_VOICES_CATALOG.length) {
      this.VOICES = window.AI_STUDIO_VOICES_CATALOG;
    }
    // Automatically merge persistent custom / cloned voices
    try {
      const customVoices = this.getSavedCustomVoices();
      for (const cv of customVoices) {
        if (!this.VOICES.some(v => v.id === cv.id)) {
          this.VOICES.unshift({
            id: cv.id,
            name: cv.name,
            gender: cv.gender || 'Cloned',
            tone: cv.tone || 'Cloned Voice',
            accent: cv.accent || 'Speaker Match',
            persona: cv.type === 'replicated' ? 'Cloned Voice' : 'Custom Design',
            desc: cv.prompt || cv.desc || 'Custom vocal persona',
            isCustom: true,
            isFeatured: true
          });
        }
      }
    } catch (_) {}
    return this.VOICES;
  },

  async syncVoicesFromApi() {
    const key = this.getActiveApiKey();
    if (!key) throw new Error('Google AI Studio API Key is missing. Please add your key first.');
    const url = `https://generativelanguage.googleapis.com/v1beta/voices?pageSize=1000&key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }
    if (data.voices && data.voices.length > 0) {
      const added = this.integrateApiVoices(data.voices);
      if (typeof window !== 'undefined') {
        window.AI_STUDIO_VOICES_CATALOG = this.VOICES;
      }
      return { total: this.VOICES.length, added: added };
    }
    return { total: this.VOICES.length, added: 0 };
  },

  integrateApiVoices(apiVoices) {
    const existingIds = new Set(this.VOICES.map(v => (v.id || v.name).toLowerCase()));
    let newCount = 0;
    apiVoices.forEach(v => {
      const id = v.id || v.display_name;
      if (!existingIds.has(id.toLowerCase())) {
        existingIds.add(id.toLowerCase());
        const genderNorm = (v.gender || '').toLowerCase() === 'female' ? 'Female' : ((v.gender || '').toLowerCase() === 'male' ? 'Male' : 'Neutral');
        let tone = 'Natural';
        if (v.pitch === 'high') tone = 'High-Pitch';
        else if (v.pitch === 'low') tone = 'Deep / Low';
        else if (v.pitch === 'middle') tone = 'Medium';
        if (v.persona && v.persona.includes('Storyteller')) tone = 'Storyteller';
        else if (v.persona && v.persona.includes('Podcast')) tone = 'Podcast Host';
        else if (v.persona && v.persona.includes('Commercial')) tone = 'Commercial';
        else if (v.persona && v.persona.includes('Tutor')) tone = 'Educational';

        this.VOICES.push({
          id: id,
          name: v.display_name || id,
          gender: genderNorm,
          tone: tone,
          accent: v.accent || 'General American',
          persona: v.persona || 'Voiceover',
          language: v.language_code || 'en-US',
          desc: v.description || `${v.persona || 'Voiceover'} in ${v.accent || 'English'}`,
          isFeatured: false
        });
        newCount++;
      }
    });
  },

  // =========================================================================
  // VOICE CLONING & VOICE DESIGN ENGINE (Gemini Voices API)
  // =========================================================================

  STORAGE_KEY_CUSTOM_VOICES: 'scriptaudio_custom_voices',

  getSavedCustomVoices() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_CUSTOM_VOICES);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  },

  saveCustomVoice(voiceObj) {
    const list = this.getSavedCustomVoices();
    const existingIdx = list.findIndex(v => v.id === voiceObj.id);
    if (existingIdx >= 0) {
      list[existingIdx] = voiceObj;
    } else {
      list.unshift(voiceObj);
    }
    localStorage.setItem(this.STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(list));
    
    // Also inject into active VOICES catalog so it appears in gallery
    const inCatalog = this.VOICES.find(v => v.id === voiceObj.id);
    if (!inCatalog) {
      this.VOICES.unshift({
        id: voiceObj.id,
        name: voiceObj.name,
        gender: voiceObj.gender || 'Custom',
        tone: voiceObj.tone || 'Cloned Voice',
        accent: voiceObj.accent || 'Speaker Match',
        persona: voiceObj.type === 'replicated' ? 'Cloned Voice' : 'Custom Design',
        desc: voiceObj.prompt || voiceObj.desc || 'Custom cloned vocal persona',
        isCustom: true,
        isFeatured: true
      });
    }
    return list;
  },

  deleteSavedCustomVoice(voiceId) {
    const list = this.getSavedCustomVoices().filter(v => v.id !== voiceId);
    localStorage.setItem(this.STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(list));
    this.VOICES = this.VOICES.filter(v => v.id !== voiceId);
    return list;
  },

  /**
   * 1. Create a Prompted Custom Voice (Voice Design)
   * Creates a persistent voice from natural-language description.
   */
  async createPromptedVoice(displayName, promptText, languageCode = 'en-US', apiKey = '') {
    const key = apiKey || this.getActiveApiKey();
    if (!key) throw new Error('API Key is missing. Please configure an API key in Settings.');

    const url = `https://generativelanguage.googleapis.com/v1beta/voices?key=${encodeURIComponent(key)}`;
    const payload = {
      store: true,
      voice: {
        displayName: displayName || 'Custom Voice',
        type: 'VOICE_TYPE_PROMPTED',
        prompt: promptText,
        languageCode: languageCode || 'en-US'
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP ${res.status}: Failed to create prompted voice`);
    }

    const voiceData = data.voice || data;
    const voiceId = voiceData.name || voiceData.id || `voice_${Date.now()}`;
    const customVoice = {
      id: voiceId,
      name: displayName || 'Custom Voice',
      type: 'prompted',
      prompt: promptText,
      gender: /female|woman|girl|lady/i.test(promptText) ? 'Female' : (/male|man|boy|gentleman/i.test(promptText) ? 'Male' : 'Neutral'),
      tone: 'Custom Design',
      accent: /british/i.test(promptText) ? 'British' : (/pakistani|urdu/i.test(promptText) ? 'Pakistani' : (/indian|hindi/i.test(promptText) ? 'Indian' : 'General American')),
      language: languageCode,
      createdAt: Date.now()
    };

    this.saveCustomVoice(customVoice);
    return customVoice;
  },

  /**
   * 2. Create a Replicated Custom Voice (Voice Cloning via Reference + Consent)
   */
  async createReplicatedVoice(displayName, refAudioBase64, consentAudioBase64, languageCode = 'en-US', apiKey = '') {
    const key = apiKey || this.getActiveApiKey();
    if (!key) throw new Error('API Key is missing. Please configure an API key in Settings.');

    const url = `https://generativelanguage.googleapis.com/v1beta/voices?key=${encodeURIComponent(key)}`;
    const payload = {
      store: true,
      voice: {
        displayName: displayName || 'Cloned Voice',
        type: 'VOICE_TYPE_REPLICATED',
        referenceAudio: {
          mimeType: 'audio/wav',
          data: refAudioBase64
        },
        consentAudio: {
          mimeType: 'audio/wav',
          data: consentAudioBase64
        },
        languageCode: languageCode || 'en-US'
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP ${res.status}: Replicated Voice creation failed`);
    }

    const voiceData = data.voice || data;
    const voiceId = voiceData.name || voiceData.id || `voice_${Date.now()}`;
    const customVoice = {
      id: voiceId,
      name: displayName || 'Cloned Voice',
      type: 'replicated',
      gender: 'Cloned',
      tone: 'Cloned Voice',
      accent: 'Speaker Match',
      language: languageCode,
      createdAt: Date.now()
    };

    this.saveCustomVoice(customVoice);
    return customVoice;
  },

  /**
   * 3. Intelligent Multimodal Acoustic Analyzer & Matcher
   * Listens to reference audio and extracts precision vocal design traits
   */
  async analyzeAudioAcousticProfile(audioBase64, mimeType = 'audio/wav', apiKey = '') {
    const key = apiKey || this.getActiveApiKey();
    if (!key) throw new Error('API Key is missing.');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64
              }
            },
            {
              text: `Listen to this audio clip and analyze the speaker's vocal characteristics in detail. 
Output a strictly valid JSON object with these keys:
{
  "gender": "Male" or "Female" or "Neutral",
  "estimatedAge": "e.g. 25-30, 40s, 60s",
  "accent": "e.g. Pakistani English, British RP, General American, Indian English",
  "timbre": "e.g. Deep, raspy, warm, resonant, crisp, breathy, silky",
  "pitch": "e.g. Low pitch, medium pitch, high pitch",
  "tempo": "e.g. Calm and deliberate, fast and energetic, natural conversational",
  "energy": "e.g. Authoritative, empathetic, inspiring, casual",
  "voiceDesignPrompt": "A comprehensive 25-35 word prompt describing this speaker's voice so it can be synthesized with identical timbre and cadence."
}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }

    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error('No acoustic analysis generated from audio.');
    return JSON.parse(textOutput);
  },

  /**
   * 4. Synthesize Audition Preview for any voice (Prebuilt or Custom voice_... ID)
   */
  async auditionVoiceSample(voiceIdOrName, sampleText = "Hello! This is an audition preview of this voiceover artist.", apiKey = '') {
    const key = apiKey || this.getActiveApiKey();
    const model = 'gemini-3.8-flash-tts';
    const isCustom = (voiceIdOrName || '').startsWith('voice_');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const speechConfig = isCustom 
      ? { voiceConfig: { voice: voiceIdOrName } }
      : { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceIdOrName } } };

    const payload = {
      contents: [{ role: "user", parts: [{ text: sampleText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: speechConfig
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);

    const inlineData = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
    if (inlineData && inlineData.data) {
      return this.processAudioResponse(inlineData);
    }
    throw new Error('No audio data returned in audition response.');
  },

  /**
   * Get all stored API keys (auto-loads from localStorage, unbundles composite strings, deduplicates)
   */
  getApiKeys() {
    try {
      let rawList = [];
      const stored = localStorage.getItem(this.STORAGE_KEY_API_KEYS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            rawList = parsed;
          }
        } catch (e) {
          rawList = [stored];
        }
      }
      // Check legacy single key field
      const single = localStorage.getItem(this.STORAGE_KEY_API);
      if (single && single.trim()) {
        rawList.push(single.trim());
      }

      // Unbundle, parse, and deduplicate every key
      const unbundled = [];
      const seen = new Set();
      let wasModified = false;

      rawList.forEach(item => {
        const rawStr = (typeof item === 'string' ? item : (item && item.key ? item.key : '')).trim();
        if (!rawStr) return;

        const extracted = this.parseBulkKeys(rawStr);
        if (extracted.length > 1) wasModified = true;

        if (extracted.length > 0) {
          extracted.forEach(k => {
            if (!seen.has(k)) {
              seen.add(k);
              unbundled.push({
                key: k,
                status: (typeof item === 'object' && item.status && extracted.length === 1) ? item.status : 'unknown',
                lastTested: (typeof item === 'object' && item.lastTested && extracted.length === 1) ? item.lastTested : null
              });
            }
          });
        } else if (rawStr.length >= 20 && !/\s/.test(rawStr) && !seen.has(rawStr)) {
          seen.add(rawStr);
          unbundled.push({
            key: rawStr,
            status: typeof item === 'object' && item.status ? item.status : 'unknown',
            lastTested: typeof item === 'object' && item.lastTested ? item.lastTested : null
          });
        }
      });

      // If unbundling or cleaning changed the format, save back clean data
      if (wasModified && unbundled.length > 0) {
        this.setApiKeys(unbundled);
      }

      return unbundled;
    } catch (e) {
      console.warn('Error reading stored API keys:', e);
      return [];
    }
  },

  /**
   * Save all API keys to persistent storage (and native app bridge if present)
   */
  setApiKeys(keysArray) {
    const formatted = [];
    const seen = new Set();

    (keysArray || []).forEach(item => {
      const rawStr = (typeof item === 'string' ? item : (item && item.key ? item.key : '')).trim();
      if (!rawStr) return;

      const subKeys = this.parseBulkKeys(rawStr);
      const keysToProcess = subKeys.length > 0 ? subKeys : (rawStr.length >= 20 && !/\s/.test(rawStr) ? [rawStr] : []);

      keysToProcess.forEach(cleanK => {
        if (!seen.has(cleanK)) {
          seen.add(cleanK);
          formatted.push({
            key: cleanK,
            status: (typeof item === 'object' && item.status && subKeys.length <= 1) ? item.status : 'unknown',
            lastTested: (typeof item === 'object' && item.lastTested && subKeys.length <= 1) ? item.lastTested : null
          });
        }
      });
    });

    try {
      localStorage.setItem(this.STORAGE_KEY_API_KEYS, JSON.stringify(formatted));
      if (formatted.length > 0) {
        localStorage.setItem(this.STORAGE_KEY_API, formatted[0].key);
      } else {
        localStorage.removeItem(this.STORAGE_KEY_API);
      }
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }

    // Native Mac App sync bridge if running inside ScriptAudio Studio.app
    if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.saveKeys) {
      try {
        window.webkit.messageHandlers.saveKeys.postMessage(JSON.stringify(formatted));
      } catch (err) {}
    }

    return formatted;
  },

  /**
   * Extract individual Gemini API keys from bulk pasted text
   * Handles newlines, commas, spaces, quotes, numbered lists (1. AIza...), key=AIza...
   */
  parseBulkKeys(rawText) {
    if (!rawText) return [];
    const text = String(rawText);
    const keysFound = [];
    const seen = new Set();

    const addKey = (k) => {
      if (!k) return;
      let clean = k.trim().replace(/^["'`\(\[\{<]+|["'`\)\]\}>,;]+$/g, '');
      if (clean.length >= 20 && clean.length <= 100 && !seen.has(clean)) {
        seen.add(clean);
        keysFound.push(clean);
      }
    };

    // 1. Direct Regex for Google AI Studio & Gemini key formats:
    // New format (starts with AQ. e.g. AQ.Ab8RN6...)
    const aqMatches = text.match(/AQ\.[a-zA-Z0-9_\-]{30,80}/g);
    if (aqMatches) aqMatches.forEach(addKey);

    // Classic format (starts with AIza e.g. AIzaSy...)
    const aizaMatches = text.match(/AIza[a-zA-Z0-9_\-]{28,50}/g);
    if (aizaMatches) aizaMatches.forEach(addKey);

    // 2. Delimiter & Token Fallback Splitter (lines, commas, semicolons, tabs, pipes, spaces)
    const lines = text.split(/[\r\n,;\t|]+/);
    lines.forEach(line => {
      // Strip leading list numbers: "1. ", "1) ", "1 - ", "- ", "* ", "key:"
      const cleaned = line
        .replace(/^[\s\d\.\)\:\-\*\•\>]+(?=(AQ\.|AIza|[a-zA-Z0-9_]{10}))/i, '')
        .replace(/^(api_?key|gemini_?key|key)[\s:=]+/i, '')
        .replace(/["'`\[\]{}]/g, ' ')
        .trim();

      const tokens = cleaned.split(/\s+/);
      tokens.forEach(tok => {
        let t = tok.trim().replace(/^["'`\(\[\{<]+|["'`\)\]\}>,;]+$/g, '');
        // Allow AQ. keys, AIza keys, or any 25-90 char key token
        if (t.length >= 25 && t.length <= 90 && /^[a-zA-Z0-9_\-\.]+$/.test(t)) {
          const alnumCount = (t.match(/[a-zA-Z0-9]/g) || []).length;
          if (alnumCount >= 20) {
            addKey(t);
          }
        }
      });
    });

    return keysFound;
  },

  /**
   * Add bulk keys from pasted raw text and save immediately
   */
  addBulkKeysFromText(rawText) {
    const extracted = this.parseBulkKeys(rawText);
    if (extracted.length === 0) {
      return { added: 0, duplicates: 0, total: this.getApiKeys().length };
    }

    const currentKeys = this.getApiKeys();
    const existingSet = new Set(currentKeys.map(k => k.key));
    let addedCount = 0;
    let duplicateCount = 0;

    extracted.forEach(keyStr => {
      if (existingSet.has(keyStr)) {
        duplicateCount++;
      } else {
        existingSet.add(keyStr);
        currentKeys.push({ key: keyStr, status: 'unknown' });
        addedCount++;
      }
    });

    this.setApiKeys(currentKeys);
    return { added: addedCount, duplicates: duplicateCount, total: currentKeys.length, detected: extracted.length };
  },

  /**
   * Universal clipboard reader (handles Web API + Native macOS AppKit bridge)
   */
  async readClipboard() {
    // 1. Try modern browser clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) return text;
      } catch (e) {
        console.warn('navigator.clipboard.readText blocked or unavailable:', e);
      }
    }

    // 2. Try native macOS bridge if running in ScriptAudio Studio.app
    if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.getClipboard) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve('');
        }, 1200);

        window.__onNativeClipboard = (content) => {
          clearTimeout(timeout);
          resolve(content || '');
        };

        try {
          window.webkit.messageHandlers.getClipboard.postMessage('');
        } catch (err) {
          clearTimeout(timeout);
          resolve('');
        }
      });
    }

    return '';
  },

  getSpeed() {
    return parseFloat(localStorage.getItem(this.STORAGE_KEY_SPEED) || '1.0');
  },

  setSpeed(speed) {
    if (speed) {
      localStorage.setItem(this.STORAGE_KEY_SPEED, String(speed));
    }
  },

  getStyle() {
    return localStorage.getItem(this.STORAGE_KEY_STYLE) || 'storyteller';
  },

  setStyle(styleId) {
    if (styleId) {
      localStorage.setItem(this.STORAGE_KEY_STYLE, styleId);
    }
  },

  removeKeyByIndex(index) {
    const keys = this.getApiKeys();
    if (index >= 0 && index < keys.length) {
      keys.splice(index, 1);
      this.setApiKeys(keys);
    }
    return keys;
  },

  clearAllKeys() {
    this.setApiKeys([]);
    this.activeKeyIndex = 0;
  },

  getActiveApiKey() {
    const keys = this.getApiKeys();
    if (keys.length === 0) return '';
    if (this.activeKeyIndex >= keys.length) {
      this.activeKeyIndex = 0;
    }
    return keys[this.activeKeyIndex].key;
  },

  rotateToNextKey() {
    const keys = this.getApiKeys();
    if (keys.length <= 1) return this.getActiveApiKey();
    this.activeKeyIndex = (this.activeKeyIndex + 1) % keys.length;
    return keys[this.activeKeyIndex].key;
  },

  maskKey(key) {
    if (!key || key.length < 12) return '••••••••';
    return key.substring(0, 8) + '••••' + key.substring(key.length - 4);
  },

  getApiKey() {
    return this.getActiveApiKey();
  },

  setApiKey(key) {
    if (key && key.trim()) {
      this.addBulkKeysFromText(key.trim());
    }
  },

  getModel() {
    return localStorage.getItem(this.STORAGE_KEY_MODEL) || 'gemini-3.8-flash-tts';
  },

  setModel(model) {
    if (model) {
      localStorage.setItem(this.STORAGE_KEY_MODEL, model.trim());
    }
  },

  getVoice() {
    return localStorage.getItem(this.STORAGE_KEY_VOICE) || 'Kore';
  },

  setVoice(voice) {
    if (voice) {
      localStorage.setItem(this.STORAGE_KEY_VOICE, voice);
    }
  },

  getTemperature() {
    const raw = localStorage.getItem(this.STORAGE_KEY_TEMPERATURE);
    if (raw === null || raw === '') return 1.0;
    const val = parseFloat(raw);
    return isNaN(val) ? 1.0 : Math.max(0.0, Math.min(2.0, val));
  },

  setTemperature(val) {
    const parsed = parseFloat(val);
    const clamped = isNaN(parsed) ? 1.0 : Math.max(0.0, Math.min(2.0, parsed));
    localStorage.setItem(this.STORAGE_KEY_TEMPERATURE, String(clamped));
    return clamped;
  },

  getTopP() {
    const raw = localStorage.getItem(this.STORAGE_KEY_TOP_P);
    if (raw === null || raw === '') return 0.95;
    const val = parseFloat(raw);
    return isNaN(val) ? 0.95 : Math.max(0.0, Math.min(1.0, val));
  },

  setTopP(val) {
    const parsed = parseFloat(val);
    const clamped = isNaN(parsed) ? 0.95 : Math.max(0.0, Math.min(1.0, parsed));
    localStorage.setItem(this.STORAGE_KEY_TOP_P, String(clamped));
    return clamped;
  },

  getTopK() {
    const raw = localStorage.getItem(this.STORAGE_KEY_TOP_K);
    if (raw === null || raw === '') return 40;
    const val = parseInt(raw, 10);
    return isNaN(val) ? 40 : Math.max(1, Math.min(40, val));
  },

  setTopK(val) {
    const parsed = parseInt(val, 10);
    const clamped = isNaN(parsed) ? 40 : Math.max(1, Math.min(40, parsed));
    localStorage.setItem(this.STORAGE_KEY_TOP_K, String(clamped));
    return clamped;
  },

  getSeed() {
    const raw = localStorage.getItem(this.STORAGE_KEY_SEED);
    if (raw === null || raw === '' || raw === undefined) return null;
    const val = parseInt(raw, 10);
    return isNaN(val) ? null : val;
  },

  setSeed(val) {
    if (val === null || val === undefined || val === '') {
      localStorage.removeItem(this.STORAGE_KEY_SEED);
      return null;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      localStorage.removeItem(this.STORAGE_KEY_SEED);
      return null;
    }
    localStorage.setItem(this.STORAGE_KEY_SEED, String(parsed));
    return parsed;
  },

  getSpeaker2Voice() {
    return localStorage.getItem(this.STORAGE_KEY_SPEAKER_2) || 'Puck';
  },

  setSpeaker2Voice(voice) {
    if (voice && voice.trim()) {
      localStorage.setItem(this.STORAGE_KEY_SPEAKER_2, voice.trim());
    }
  },

  getMultiSpeakerEnabled() {
    return localStorage.getItem(this.STORAGE_KEY_MULTI_SPEAKER) === 'true';
  },

  setMultiSpeakerEnabled(enabled) {
    localStorage.setItem(this.STORAGE_KEY_MULTI_SPEAKER, enabled ? 'true' : 'false');
  },

  getPersonaId() {
    return localStorage.getItem(this.STORAGE_KEY_PERSONA_ID) || '';
  },

  setPersonaId(id) {
    localStorage.setItem(this.STORAGE_KEY_PERSONA_ID, (id || '').trim());
  },

  resetGenerationDefaults() {
    this.setTemperature(1.0);
    this.setTopP(0.95);
    this.setTopK(40);
    this.setSeed(null);
    this.setSpeed(1.0);
    this.setMultiSpeakerEnabled(false);
    this.setSpeaker2Voice('Puck');
    this.setPersonaId('');
  },

  /**
   * Parse script text into dialogue parts for multi-speaker synthesis.
   * Recognizes "Speaker 1:", "Speaker 2:", "[Speaker 1]", "Host:", "Guest:", etc.
   */
  parseDialogueParts(text) {
    if (!text || typeof text !== 'string') return [];
    const cleanText = text.trim();
    if (!cleanText) return [];

    const speakerRegex = /(?:^|\n)\s*(?:\[\s*(Speaker\s*[12AB]|Host|Guest|Narrator|[A-Za-z][a-zA-Z0-9_\s]{0,15})\s*\]\s*[:\-]?|(Speaker\s*[12AB]|Host|Guest|Narrator|[A-Za-z][a-zA-Z0-9_\s]{0,15})\s*[:\-])\s*/gi;
    const matches = [...cleanText.matchAll(speakerRegex)];
    if (matches.length === 0) {
      return [{ speaker: 'Speaker 1', text: cleanText }];
    }

    const parts = [];
    const speakerMapping = {};
    let assignedCount = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const rawSpeakerName = (match[1] || match[2]).trim();
      const lower = rawSpeakerName.toLowerCase();

      let assignedSpeaker = 'Speaker 1';
      if (/2|b|guest/i.test(lower)) {
        assignedSpeaker = 'Speaker 2';
      } else if (/1|a|host|narrator/i.test(lower)) {
        assignedSpeaker = 'Speaker 1';
      } else {
        if (!speakerMapping[lower]) {
          assignedCount++;
          speakerMapping[lower] = (assignedCount % 2 === 1) ? 'Speaker 1' : 'Speaker 2';
        }
        assignedSpeaker = speakerMapping[lower];
      }

      const startIndex = match.index + match[0].length;
      const endIndex = (i < matches.length - 1) ? matches[i + 1].index : cleanText.length;
      const partText = cleanText.substring(startIndex, endIndex).trim();

      if (partText) {
        parts.push({
          speaker: assignedSpeaker,
          text: partText
        });
      }
    }

    return parts.length > 0 ? parts : [{ speaker: 'Speaker 1', text: cleanText }];
  },

  hasValidKey() {
    return this.getApiKeys().length > 0;
  },

  async testIndividualKey(apiKey) {
    if (!apiKey) return { success: false, error: 'Empty Key' };
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      const data = await response.json();
      if (response.ok && data.models) {
        return { success: true, count: data.models.length };
      } else {
        return { success: false, error: data.error?.message || `HTTP ${response.status}` };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async testAllKeys() {
    const keys = this.getApiKeys();
    const results = [];
    for (let i = 0; i < keys.length; i++) {
      const res = await this.testIndividualKey(keys[i].key);
      keys[i].status = res.success ? 'valid' : 'invalid';
      keys[i].lastTested = Date.now();
      results.push({ index: i, key: keys[i].key, ...res });
    }
    this.setApiKeys(keys);
    return results;
  },

  /**
   * Test primary / given API Key against Google Gemini API
   */
  async testApiKey(apiKey) {
    const keyToUse = apiKey || this.getApiKey();
    if (!keyToUse) {
      return { success: false, error: 'No API Key available to test.' };
    }
    const res = await this.testIndividualKey(keyToUse);
    if (res.success) {
      return { success: true, message: `Connected successfully! (${res.count} models available)` };
    } else {
      return { success: false, error: res.error };
    }
  },

  /**
   * Format prompt for 1-click clipboard copy to Google AI Studio Web App
   */
  formatClipboardPrompt(chunkText, instructionTemplate) {
    const instruction = instructionTemplate || 'Generate a natural, clear, engaging storytelling voiceover for the following text:';
    return `[SYSTEM INSTRUCTION: ${instruction}]\n\n${chunkText}`;
  },

  /**
   * Generate Audio using Google Gemini API (Text-to-Audio / Speech generation)
   * With automatic key rotation and model failover!
   */
  async generateAudioForChunk(chunkText, voiceName = '', modelName = '', attempt = 0) {
    const keys = this.getApiKeys();
    if (keys.length === 0) {
      throw new Error('Google AI Studio API Key is missing. Please add your key(s) in settings.');
    }

    const currentKey = this.getActiveApiKey();
    const selectedVoice = voiceName || this.getVoice();
    const selectedModel = modelName || this.getModel();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(currentKey)}`;

    const cleanSpeechText = (chunkText || '').trim();
    if (!cleanSpeechText) {
      throw new Error('Script text is empty.');
    }

    // Check Multi-Speaker Dialogue Mode
    const isMultiSpeaker = this.getMultiSpeakerEnabled();
    const speaker2Voice = this.getSpeaker2Voice() || 'Puck';
    const dialogueParts = isMultiSpeaker ? this.parseDialogueParts(cleanSpeechText) : [];
    const hasMultipleSpeakers = isMultiSpeaker && 
      dialogueParts.length > 1 && 
      dialogueParts.some(p => p.speaker === 'Speaker 1') && 
      dialogueParts.some(p => p.speaker === 'Speaker 2');

    let contents;
    let speechConfig;

    if (hasMultipleSpeakers) {
      contents = [
        {
          role: "user",
          parts: dialogueParts.map(p => ({
            text: p.text,
            speechMetadata: {
              speaker: p.speaker
            }
          }))
        }
      ];
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: "Speaker 1",
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: selectedVoice
                }
              }
            },
            {
              speaker: "Speaker 2",
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: speaker2Voice
                }
              }
            }
          ]
        }
      };
    } else {
      contents = [
        {
          role: "user",
          parts: [
            {
              text: cleanSpeechText
            }
          ]
        }
      ];
      const customVoiceObj = this.getSavedCustomVoices().find(v => v.id === selectedVoice || v.name === selectedVoice);
      const customId = this.getPersonaId() || (customVoiceObj ? customVoiceObj.id : (selectedVoice && selectedVoice.startsWith('voice_') ? selectedVoice : null));
      if (customId) {
        speechConfig = {
          voiceConfig: {
            voice: customId
          }
        };
      } else {
        speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice
            }
          }
        };
      }
    }

    // Google AI Studio Generation Parameters
    const generationConfig = {
      responseModalities: ["AUDIO"],
      speechConfig: speechConfig,
      temperature: this.getTemperature(),
      topP: this.getTopP(),
      topK: this.getTopK()
    };

    const seed = this.getSeed();
    if (seed !== null && !isNaN(seed)) {
      generationConfig.seed = seed;
    }

    // Direct, standard Gemini TTS payload - pure speech generation (no developer/system instructions)
    const payload = {
      contents: contents,
      generationConfig: generationConfig
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        const isRateLimitOrQuota = response.status === 429 || response.status === 403 || 
                                   errorMsg.toLowerCase().includes('quota') || 
                                   errorMsg.toLowerCase().includes('rate');

        // Automatic Key Failover: If rate limit or quota hit, rotate key and retry!
        if (isRateLimitOrQuota && keys.length > 1 && attempt < keys.length) {
          console.warn(`[AIStudio] Key ${this.maskKey(currentKey)} hit limit (${response.status}). Rotating to next key...`);
          this.rotateToNextKey();
          return await this.generateAudioForChunk(chunkText, voiceName, selectedModel, attempt + 1);
        }

        // Automatic Model Failover: If gemini-3.8-flash-tts hits free tier rate limit, auto-failover to high-speed models
        if (isRateLimitOrQuota) {
          if (selectedModel === 'gemini-3.8-flash-tts') {
            console.warn(`[AIStudio] Rate limit on [${selectedModel}]. Auto-switching to high-speed model [gemini-3.8-flash-lite-tts]...`);
            return await this.generateAudioForChunk(chunkText, voiceName, 'gemini-3.8-flash-lite-tts', 0);
          } else if (selectedModel === 'gemini-3.8-flash-lite-tts') {
            console.warn(`[AIStudio] Rate limit on [${selectedModel}]. Auto-switching to preview model [gemini-2.5-flash-preview-tts]...`);
            return await this.generateAudioForChunk(chunkText, voiceName, 'gemini-2.5-flash-preview-tts', 0);
          }
        }

        throw new Error(errorMsg);
      }

      // Check if audio data candidate returned
      const inlineData = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      if (inlineData && inlineData.data) {
        // Rotate key for load balancing in multi-key setup
        if (keys.length > 1) {
          this.rotateToNextKey();
        }
        return this.processAudioResponse(inlineData);
      }

      const blockReason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
      throw new Error(`API response did not include binary audio data${blockReason ? ` (${blockReason})` : ''}.`);

    } catch (err) {
      if (keys.length > 1 && attempt < keys.length - 1) {
        this.rotateToNextKey();
        return await this.generateAudioForChunk(chunkText, voiceName, modelName, attempt + 1);
      }
      console.error(`Gemini TTS API error with model [${selectedModel}]:`, err);
      // Re-throw actual error so UI shows genuine feedback rather than a fake sine-wave beep!
      throw err;
    }
  },

  /**
   * Dedicated single-worker generation with a specific assigned API key
   * Used by the Parallel Bulk Dispatcher
   */
  async generateAudioWithSpecificKey(chunkText, voiceName, modelName, specificKey, customInstruction = '') {
    if (!specificKey) {
      throw new Error('API Key is missing for worker.');
    }

    const selectedVoice = voiceName || this.getVoice();
    const selectedModel = modelName || this.getModel();
    const promptDirective = customInstruction || this.getPromptInstruction();

    let cleanSpeechText = (chunkText || '').trim();
    if (promptDirective && !cleanSpeechText.startsWith(promptDirective)) {
      cleanSpeechText = `${promptDirective}\n\n${cleanSpeechText}`;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(specificKey)}`;

    const contents = [
      {
        role: "user",
        parts: [{ text: cleanSpeechText }]
      }
    ];

    const customVoiceObj = this.getSavedCustomVoices().find(v => v.id === selectedVoice || v.name === selectedVoice);
    const customId = this.getPersonaId() || (customVoiceObj ? customVoiceObj.id : (selectedVoice && selectedVoice.startsWith('voice_') ? selectedVoice : null));
    let speechConfig;
    if (customId) {
      speechConfig = {
        voiceConfig: {
          voice: customId
        }
      };
    } else {
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: selectedVoice
          }
        }
      };
    }

    const generationConfig = {
      responseModalities: ["AUDIO"],
      speechConfig: speechConfig,
      temperature: this.getTemperature(),
      topP: this.getTopP(),
      topK: this.getTopK()
    };

    const seed = this.getSeed();
    if (seed !== null && !isNaN(seed)) {
      generationConfig.seed = seed;
    }

    const payload = {
      contents: contents,
      generationConfig: generationConfig
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || `HTTP ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.isRateLimit = response.status === 429 || response.status === 403 || 
                        errorMsg.toLowerCase().includes('quota') || 
                        errorMsg.toLowerCase().includes('rate') ||
                        errorMsg.toLowerCase().includes('resource_exhausted');
      throw err;
    }

    const inlineData = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
    if (inlineData && inlineData.data) {
      return this.processAudioResponse(inlineData);
    }

    const blockReason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
    throw new Error(`API response did not include binary audio data${blockReason ? ` (${blockReason})` : ''}.`);
  },

  /**
   * Convert Gemini API Inline Audio Data (PCM or Encoded) into a standard Playable Blob
   */
  processAudioResponse(inlineData) {
    const arrayBuffer = this.base64ToArrayBuffer(inlineData.data);
    const mime = (inlineData.mimeType || '').toLowerCase();

    // If already containerized as MP3 or WAV or OGG
    if (mime.includes('mpeg') || mime.includes('mp3')) {
      return new Blob([arrayBuffer], { type: 'audio/mpeg' });
    }
    if (mime.includes('wav')) {
      return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
    if (mime.includes('ogg')) {
      return new Blob([arrayBuffer], { type: 'audio/ogg' });
    }

    // Raw PCM handling (e.g. audio/L16;codec=pcm;rate=24000)
    const sampleRate = parseInt((mime.match(/rate=(\d+)/) || [])[1] || "24000", 10);
    const wavBuffer = this.pcmToWav(arrayBuffer, sampleRate, 1, 16);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  },

  /**
   * Helper: Convert Base64 string to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  /**
   * Helper: Convert Raw PCM ArrayBuffer to standard playable WAV container
   */
  pcmToWav(pcmArrayBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmArrayBuffer.byteLength;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, "WAVE");
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);           // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true);  // SampleRate
    view.setUint32(28, byteRate, true);    // ByteRate
    view.setUint16(32, blockAlign, true);  // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    new Uint8Array(buffer, 44).set(new Uint8Array(pcmArrayBuffer));
    return buffer;
  },

  writeString(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  },

  /**
   * Quick preview generation for a voice and model
   */
  async previewVoice(voiceName, modelName, sampleText = "Hello! This is a test voiceover with Gemini's expressive audio engine.") {
    return await this.generateAudioForChunk(sampleText, voiceName, modelName);
  },

  /**
   * Fallback Web Speech synthesis to Blob for preview purposes
   */
  synthesizeFallbackAudio(text) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const clean = text.replace(/<[^>]+>/g, '');
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }

    return new Promise((resolve) => {
      const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (!AudioCtx) {
        resolve(new Blob([], { type: 'audio/wav' }));
        return;
      }
      const audioContext = new AudioCtx();
      const sampleRate = audioContext.sampleRate;
      const durationSeconds = 1.5;
      const numberOfFrames = Math.floor(sampleRate * durationSeconds);

      const buffer = audioContext.createBuffer(1, numberOfFrames, sampleRate);
      const data = buffer.getChannelData(0);

      // Gentle chime notification tone
      for (let i = 0; i < numberOfFrames; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 523.25 * t) * 0.08 * Math.exp(-t * 2.5);
      }

      const wavBlob = this.audioBufferToWav(buffer);
      resolve(wavBlob);
    });
  },

  /**
   * AudioBuffer to WAV Blob Encoder
   */
  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    let result;
    if (numChannels === 2) {
      const interleave = this.interleave(buffer.getChannelData(0), buffer.getChannelData(1));
      result = this.encodeWAV(interleave, numChannels, sampleRate, bitDepth);
    } else {
      result = this.encodeWAV(buffer.getChannelData(0), 1, sampleRate, bitDepth);
    }
    
    return new Blob([result], { type: 'audio/wav' });
  },

  interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;

    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  },

  encodeWAV(samples, numChannels, sampleRate, bitDepth) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);

    this.floatTo16BitPCM(view, 44, samples);
    return buffer;
  },

  floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
};

if (typeof window !== 'undefined') {
  window.AIStudio = AIStudio;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIStudio;
}
