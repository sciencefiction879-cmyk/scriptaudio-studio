/**
 * ScriptAudio Studio - Audio Stitcher & Merger Engine
 * Concatenates individual audio clip blobs into a seamless master audio track using Web Audio API.
 */

const AudioStitcher = {
  /**
   * Merge array of audio Blobs in order
   * @param {Array<Blob>} audioBlobs Array of audio blobs
   * @param {Number} pauseDurationSeconds Brief silence gap between chunks (default 0.4s)
   * @returns {Promise<Blob>} Master WAV Audio Blob
   */
  async stitchAudioBlobs(audioBlobs, pauseDurationSeconds = 0.4) {
    if (!audioBlobs || audioBlobs.length === 0) {
      throw new Error('No audio clips provided for stitching.');
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decodedBuffers = [];

    // Decode all audio blobs into AudioBuffers
    for (let i = 0; i < audioBlobs.length; i++) {
      const blob = audioBlobs[i];
      if (!blob) continue;

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        decodedBuffers.push(audioBuffer);
      } catch (err) {
        console.error(`Error decoding audio blob index ${i}:`, err);
        throw new Error(`Could not decode audio clip #${i + 1}. Please ensure it is a valid audio file (MP3/WAV/AAC).`);
      }
    }

    if (decodedBuffers.length === 0) {
      throw new Error('No valid audio buffers decoded.');
    }

    // Calculate total duration and channels
    const sampleRate = decodedBuffers[0].sampleRate;
    const numberOfChannels = Math.max(...decodedBuffers.map(b => b.numberOfChannels));
    const pauseSamples = Math.floor(sampleRate * pauseDurationSeconds);

    let totalSamples = 0;
    decodedBuffers.forEach(buffer => {
      totalSamples += buffer.length + pauseSamples;
    });

    // Create target AudioBuffer for concatenated audio
    const masterBuffer = audioContext.createBuffer(numberOfChannels, totalSamples, sampleRate);

    // Copy audio data channel by channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const masterChannelData = masterBuffer.getChannelData(channel);
      let offset = 0;

      for (let i = 0; i < decodedBuffers.length; i++) {
        const buffer = decodedBuffers[i];
        // If mono buffer copied to stereo master, duplicate channel 0
        const bufferChannelData = buffer.getChannelData(channel < buffer.numberOfChannels ? channel : 0);

        masterChannelData.set(bufferChannelData, offset);
        offset += buffer.length + pauseSamples;
      }
    }

    // Encode master AudioBuffer to WAV Blob
    const wavBlob = AIStudio.audioBufferToWav(masterBuffer);
    
    // Close context
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }

    return wavBlob;
  }
};

window.AudioStitcher = AudioStitcher;
