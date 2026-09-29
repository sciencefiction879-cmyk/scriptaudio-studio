# 🎙️ ScriptAudio Studio (v2.1.0)

> **Next-Generation Desktop Voiceover Production Suite powered by Google AI Studio & Gemini 3.8 Speech Models.**

ScriptAudio Studio is an all-in-one desktop and web application designed for creators, narrators, podcasters, and filmmakers to generate high-fidelity, expressive AI voiceovers with smart script chunking, automatic multi-key rotation, batch generation, and master audio stitching.

---

## 🌟 Key Features

### 🎭 1,030+ Google AI Studio Artists & Voice Library
- **Complete AI Studio Library**: Over 1,030 expressive voices synchronized with Google AI Studio's `/v1beta/voices` endpoint.
- **Ultra-Compact Active Voice Summary Bar (~50px)**: Displays active artist name, featured star, gender pill, tone, and accent with zero screen clutter.
- **One-Click Instant Preview**: `[▶ Preview Voice]` lets you audition any voice instantly without opening settings.
- **Live Filtering**: Instant filters for **⭐ Featured (30)**, **👩 Female (519)**, **👨 Male (483)**, **📖 Storyteller (112)**, **🎙️ Podcast (196)**, and **🎬 Dramatic (14)**.
- **Compact 44px Voice Chips**: Clean, single-row chips preventing squashed cards and text clipping.

### 🔑 Multi-API Key Detection & Auto-Rotation
- **Auto-Detects Any Number of Keys**: Paste 1, 4, 10, or 50+ keys at once. Auto-parses both new Google AI Studio (`AQ.Ab8...`) and classic Gemini (`AIzaSy...`) formats.
- **Intelligent Failover**: Automatically switches to the next valid key if rate-limited or quota-exceeded.
- **Batch Key Tester**: Verifies all saved keys in parallel with live status indicators.

### ✂️ Smart Script Chunker & Formatter
- **Multiple Chunking Modes**: Smart Word Limit (recommended 250 words / ~1.5 mins), Character Count, Paragraphs / Line Breaks, or Dialogue Speaker tags.
- **Vocal Emotion Tags**: Insert native AI Studio tags with 1 click: `<laugh>`, `<sigh>`, `<breath>`, `<short pause>`, `<whisper>`, `<gasp>`, `<emphasis>`.
- **Style Direction Presets**: Storyteller, Cinematic & Dramatic, High-Energy Podcast, Documentary, Whispered / ASMR, Corporate.

### 🎧 Production & Audio Workspace
- **Pacing & Audio Parameters**: Adjust speaking pace (0.8x to 1.25x), temperature, top_p, top_k, seed, and multi-speaker dialogue.
- **Batch Generation**: Generate audio for all chunks with 1 click.
- **Download Options**: Single-chunk audio download, **Download All (.zip)**, or in-browser **Master Audio Stitching** into one seamless track.

---

## 💻 Platforms & Installation

### 🪟 Windows (Standalone `.exe` - No Settings or Setup Required)
Works out-of-the-box on **every Windows version** (Windows 11, 10, 8, 7, 32-bit & 64-bit):
- **Zero Dependencies**: Does NOT require Python, Node.js, .NET, or any command-line setup.
- **Native Window Experience**: Launches in an ultra-clean, borderless desktop window via Microsoft Edge / Chromium application mode.
- **Persistent Storage**: All saved API keys and settings persist permanently in `%APPDATA%\ScriptAudioStudio`.

**How to run on Windows:**
1. Download **`ScriptAudio Studio.exe`** from [Releases](https://github.com/sciencefiction879-cmyk/scriptaudio-studio/releases).
2. Double-click **`ScriptAudio Studio.exe`** to launch!
*(A portable ZIP version `ScriptAudioStudio-v2.1.0-Windows-Portable.zip` is also available).*

### 🍏 macOS (Native `.app` & `.dmg`)
- Pre-built for macOS: **`ScriptAudio Studio.dmg`**
- Mount the DMG and drag **ScriptAudio Studio.app** to your `Applications` folder.

### 🌐 Cross-Platform Web / Browser
Simply open `index.html` in any modern web browser (Edge, Chrome, Brave, Safari, Firefox).

---

## 🛠️ Project Structure

```text
├── index.html                  # Main application UI & layout
├── style.css                   # Custom responsive CSS design system
├── js/
│   ├── app.js                  # Application controller & DOM bindings
│   ├── ai-studio.js            # Google AI Studio API integration & key rotation
│   ├── voices-data.js          # Synchronized catalog of 1,030+ voices
│   ├── chunker.js              # Script chunking and timing engine
│   └── audio-stitcher.js       # Web Audio API multi-chunk audio concatenation
├── data/
│   └── voices.json             # Raw voices dataset
├── assets/
│   ├── AppIcon.ico             # Windows multi-resolution icon
│   ├── AppIcon.icns            # macOS multi-resolution icon
│   └── 7zS.sfx                 # Windows PE32 GUI self-extracting module
├── scripts/
│   └── build_windows_dist.py   # Windows standalone executable builder
└── dist/
    ├── ScriptAudio Studio.exe  # Standalone Windows executable
    └── ScriptAudioStudio-v2.1.0-Windows-Portable.zip
```

---

## 📄 License
MIT License. Built for creators and developers using Google AI Studio & Gemini models.
