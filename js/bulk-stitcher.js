/**
 * ScriptAudio Studio - Audio Assembly, Missing Chunk Verifier, Format Encoder & ZIP Packager
 * 
 * CRITICAL RULES:
 * 1. Chunks from different V scripts must NEVER be mixed together!
 * 2. Strict numeric chunk ordering (1, 2, 3... 10, 11 - never alphabetical).
 * 3. Missing Chunk Protection: Verifies every required chunk is available before merging.
 * 4. Outputs one final MP3 or WAV per V script (e.g. V1.mp3, V2.mp3).
 * 5. Packages all final script files into a clean ZIP on Download All.
 */

const BulkStitcher = {
  /**
   * Decode an Audio Blob into an AudioBuffer using Web Audio API
   */
  async decodeBlobToAudioBuffer(blob, audioContext) {
    const arrayBuffer = await blob.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  },

  /**
   * Concatenate an array of AudioBuffers into one seamless AudioBuffer
   */
  concatenateAudioBuffers(buffers, audioContext, gapSeconds = 0.3) {
    if (!buffers || buffers.length === 0) {
      throw new Error('No audio buffers provided for concatenation.');
    }

    const sampleRate = buffers[0].sampleRate;
    const numberOfChannels = Math.max(...buffers.map(b => b.numberOfChannels));
    const pauseSamples = Math.floor(sampleRate * gapSeconds);

    let totalSamples = 0;
    buffers.forEach((b, idx) => {
      totalSamples += b.length;
      if (idx < buffers.length - 1) {
        totalSamples += pauseSamples;
      }
    });

    const masterBuffer = audioContext.createBuffer(numberOfChannels, totalSamples, sampleRate);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const masterData = masterBuffer.getChannelData(channel);
      let offset = 0;

      for (let i = 0; i < buffers.length; i++) {
        const buf = buffers[i];
        const srcData = buf.getChannelData(channel < buf.numberOfChannels ? channel : 0);
        masterData.set(srcData, offset);
        offset += buf.length;
        if (i < buffers.length - 1) {
          offset += pauseSamples;
        }
      }
    }

    return masterBuffer;
  },

  /**
   * Encode AudioBuffer to standard 16-bit PCM WAV Blob
   */
  encodeWavBlob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const numSamples = audioBuffer.length;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF identifier
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this._writeString(view, 8, 'WAVE');

    // fmt subchunk
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data subchunk
    this._writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave samples into 16-bit integers
    let offset = 44;
    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }

    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        // Clamp to [-1.0, 1.0]
        sample = Math.max(-1, Math.min(1, sample));
        // Scale to 16-bit signed integer
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  },

  /**
   * Encode AudioBuffer to MP3 Blob using lamejs
   */
  encodeMp3Blob(audioBuffer, kbps = 192) {
    if (typeof lamejs === 'undefined') {
      console.warn('[BulkStitcher] lamejs not found, falling back to WAV format.');
      return this.encodeWavBlob(audioBuffer);
    }

    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;

    const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
    const mp3Data = [];

    // Convert float32 [-1.0, 1.0] to int16 [-32768, 32767]
    const leftFloat = audioBuffer.getChannelData(0);
    const rightFloat = numChannels > 1 ? audioBuffer.getChannelData(1) : leftFloat;

    const leftInt16 = new Int16Array(numSamples);
    const rightInt16 = new Int16Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      let l = Math.max(-1, Math.min(1, leftFloat[i]));
      leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;

      if (numChannels > 1) {
        let r = Math.max(-1, Math.min(1, rightFloat[i]));
        rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
      }
    }

    // Encode in chunks of 1152 samples (standard MP3 frame size)
    const chunkSize = 1152;
    for (let i = 0; i < numSamples; i += chunkSize) {
      const leftChunk = leftInt16.subarray(i, i + chunkSize);
      let mp3buf;
      if (numChannels === 1) {
        mp3buf = mp3Encoder.encodeBuffer(leftChunk);
      } else {
        const rightChunk = rightInt16.subarray(i, i + chunkSize);
        mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      }
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const endBuf = mp3Encoder.flush();
    if (endBuf.length > 0) {
      mp3Data.push(endBuf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  },

  _writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  },

  /**
   * CRITICAL: Validate, assemble, and merge all chunks for a single V script.
   * Enforces:
   *  - Parent Script ID containment (never mix chunks)
   *  - Missing chunk verification
   *  - Strict numeric ordering (1, 2, 3... 10)
   * 
   * @param {string} scriptId - E.g. "V1"
   * @param {Array<Object>} chunks - Array of chunk records for this script
   * @param {string} format - "mp3" or "wav"
   * @returns {Promise<Object>} { scriptId, blob, format, filename, duration }
   */
  async assembleScriptAudio(scriptId, chunks, format = 'mp3', gapSeconds = 0.3) {
    if (!chunks || chunks.length === 0) {
      throw new Error(`No chunks found for Script [${scriptId}].`);
    }

    // 1. Verify all chunks belong to this scriptId
    for (const c of chunks) {
      if (c.script_id !== scriptId) {
        throw new Error(`Integrity Violation: Chunk [${c.chunk_name}] belongs to [${c.script_id}], not [${scriptId}]!`);
      }
    }

    // 2. Strict Numeric Sorting (never alphabetical: 1, 2, 3... 9, 10, 11)
    const sortedChunks = chunks.slice().sort((a, b) => a.chunk_number - b.chunk_number);

    // 3. Missing Chunk Protection:
    // Check that chunk numbers form a continuous 1..N sequence and are all COMPLETED with valid audio
    const missingOrIncomplete = [];
    const audioBlobs = [];

    for (let i = 0; i < sortedChunks.length; i++) {
      const c = sortedChunks[i];
      const expectedNum = i + 1;

      if (c.chunk_number !== expectedNum) {
        missingOrIncomplete.push(`Missing Chunk #${expectedNum} (found #${c.chunk_number})`);
      }

      if (c.status !== 'COMPLETED') {
        missingOrIncomplete.push(`${c.chunk_name} (Status: ${c.status})`);
        continue;
      }

      const blob = await BulkStorage.getAudioBlob(c.chunk_id);
      if (!blob) {
        missingOrIncomplete.push(`${c.chunk_name} (Audio data missing in storage)`);
        continue;
      }

      audioBlobs.push(blob);
    }

    if (missingOrIncomplete.length > 0) {
      const errDetail = missingOrIncomplete.join(', ');
      throw new Error(`Cannot merge [${scriptId}] — missing or incomplete chunks: ${errDetail}`);
    }

    // 4. Decode all audio blobs and stitch them
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const decodedBuffers = [];
      for (let i = 0; i < audioBlobs.length; i++) {
        const buf = await this.decodeBlobToAudioBuffer(audioBlobs[i], audioContext);
        decodedBuffers.push(buf);
      }

      // Concatenate sequentially
      const masterBuffer = this.concatenateAudioBuffers(decodedBuffers, audioContext, gapSeconds);
      const durationSeconds = masterBuffer.duration;

      // 5. Encode into selected format
      let finalBlob;
      const cleanFormat = (format || 'mp3').toLowerCase();
      if (cleanFormat === 'mp3') {
        finalBlob = this.encodeMp3Blob(masterBuffer, 192);
      } else {
        finalBlob = this.encodeWavBlob(masterBuffer);
      }

      const filename = `${scriptId}.${cleanFormat}`;

      // Save merged audio in IndexedDB for instant replay & resume
      await BulkStorage.saveMergedAudio(scriptId, finalBlob, cleanFormat, durationSeconds);

      return {
        scriptId: scriptId,
        blob: finalBlob,
        format: cleanFormat,
        filename: filename,
        duration: durationSeconds,
        chunkCount: sortedChunks.length
      };
    } finally {
      if (audioContext.state !== 'closed') {
        await audioContext.close();
      }
    }
  },

  /**
   * Package all final merged script files into a ZIP archive for Download All
   * @param {Array<Object>} mergedResults - Array of { scriptId, blob, format, filename, duration }
   * @returns {Promise<Blob>} ZIP Blob
   */
  async createDownloadAllZip(mergedResults, projectName = 'ScriptAudio_Voiceovers') {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is required for packaging the Download All ZIP archive.');
    }

    const zip = new JSZip();

    // 1. Add each final audio file (e.g. V1.mp3, V2.mp3)
    let totalDuration = 0;
    const manifestLines = [
      '=====================================================================',
      '🎙️ ScriptAudio Studio - Bulk Voiceover Production Manifest',
      '=====================================================================',
      `Generated on: ${new Date().toLocaleString()}`,
      `Total Final Scripts: ${mergedResults.length}`,
      '---------------------------------------------------------------------',
      'Files included:'
    ];

    mergedResults.forEach(item => {
      zip.file(item.filename, item.blob);
      totalDuration += item.duration || 0;
      const mins = Math.floor(item.duration / 60);
      const secs = Math.floor(item.duration % 60);
      manifestLines.push(`• ${item.filename}  (${item.chunkCount || 0} chunks, duration: ${mins}m ${secs}s)`);
    });

    const totalMins = Math.floor(totalDuration / 60);
    const totalSecs = Math.floor(totalDuration % 60);
    manifestLines.push('---------------------------------------------------------------------');
    manifestLines.push(`Total Voiceover Duration: ${totalMins}m ${totalSecs}s`);
    manifestLines.push('=====================================================================');

    // 2. Add manifest README.txt
    zip.file('README_MANIFEST.txt', manifestLines.join('\r\n'));

    // 3. Generate ZIP Blob
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }
};

window.BulkStitcher = BulkStitcher;
