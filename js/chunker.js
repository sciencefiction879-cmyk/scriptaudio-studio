/**
 * ScriptAudio Studio - Script Chunker Engine
 * Handles intelligent splitting of long scripts into voiceover-friendly chunks.
 */

const Chunker = {
  // Average reading speed for voiceovers (Words Per Minute)
  WPM: 150,

  /**
   * Calculate word count, char count, and estimated audio duration
   */
  getStats(text) {
    if (!text || !text.trim()) {
      return { words: 0, chars: 0, durationSeconds: 0, durationFormatted: '0m 0s' };
    }

    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const chars = trimmed.length;
    const durationSeconds = Math.ceil((words / this.WPM) * 60);

    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const durationFormatted = `${mins}m ${secs}s`;

    return { words, chars, durationSeconds, durationFormatted };
  },

  /**
   * Main split router based on mode
   */
  splitScript(text, mode = 'words', limit = 250, promptTemplate = '') {
    if (!text || !text.trim()) return [];

    let rawChunks = [];

    switch (mode) {
      case 'words':
        rawChunks = this.splitByWords(text, limit);
        break;
      case 'chars':
        rawChunks = this.splitByChars(text, limit);
        break;
      case 'paragraphs':
        rawChunks = this.splitByParagraphs(text);
        break;
      case 'dialogue':
        rawChunks = this.splitByDialogue(text);
        break;
      default:
        rawChunks = this.splitByWords(text, limit);
    }

    // Map into rich chunk objects
    return rawChunks.map((chunkText, index) => {
      const stats = this.getStats(chunkText);
      const formattedPrompt = promptTemplate 
        ? `${promptTemplate.trim()}\n\n${chunkText.trim()}`
        : chunkText.trim();

      return {
        id: `chunk_${index + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        index: index + 1,
        text: chunkText.trim(),
        formattedPrompt: formattedPrompt,
        words: stats.words,
        chars: stats.chars,
        estDurationSeconds: stats.durationSeconds,
        estDurationFormatted: stats.durationFormatted,
        audioBlob: null,
        audioUrl: null,
        audioFileName: null,
        status: 'pending', // 'pending' | 'generating' | 'ready'
        createdAt: new Date().toISOString()
      };
    });
  },

  /**
   * Split by word limit without cutting off mid-sentence
   */
  splitByWords(text, maxWords) {
    const sentences = this.extractSentences(text);
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;

      // If adding this sentence exceeds maxWords and we already have text in chunk
      if (currentWordCount + sentenceWords > maxWords && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [sentence];
        currentWordCount = sentenceWords;
      } else {
        currentChunk.push(sentence);
        currentWordCount += sentenceWords;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks.length > 0 ? chunks : [text];
  },

  /**
   * Split by character limit without cutting off mid-sentence
   */
  splitByChars(text, maxChars) {
    const sentences = this.extractSentences(text);
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength > maxChars && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [sentence];
        currentLength = sentenceLength;
      } else {
        currentChunk.push(sentence);
        currentLength += sentenceLength + 1; // +1 for space
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks.length > 0 ? chunks : [text];
  },

  /**
   * Split by double line breaks / paragraphs
   */
  splitByParagraphs(text) {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  },

  /**
   * Split by speaker dialogue tags (e.g. SPEAKER:, [NARRATOR], JOHN -)
   */
  splitByDialogue(text) {
    // Regex matches common speaker tags at start of lines
    const speakerRegex = /(?:\n|^)(?=[A-Z0-9_\s]{2,20}:|\[[A-Z0-9_\s]{2,20}\]|^[A-Z][a-z]+\s*-\s*)/;
    const parts = text.split(speakerRegex);
    return parts.map(p => p.trim()).filter(Boolean);
  },

  /**
   * Sentence boundary tokenizer helper
   */
  extractSentences(text) {
    // Matches sentences while respecting abbreviations (e.g. Mr., Dr., etc.)
    const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z0-9"“'‘])/g;
    const lines = text.split(/\n+/);
    const result = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const sentenceParts = line.split(sentenceRegex);
      for (const part of sentenceParts) {
        if (part.trim()) result.push(part.trim());
      }
    }

    return result.length > 0 ? result : [text];
  }
};

if (typeof window !== 'undefined') {
  window.Chunker = Chunker;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Chunker;
}
