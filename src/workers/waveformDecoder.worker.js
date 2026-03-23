// Runs in a Web Worker — no DOM access, no AudioContext singleton shared with the main thread.

function extractPeaks(audioBuffer, buckets) {
  const channelData = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  const sampleSize = Math.max(1, Math.floor(audioBuffer.length / buckets));
  const peaks = new Float32Array(buckets);

  for (let i = 0; i < buckets; i += 1) {
    const start = i * sampleSize;
    const end = Math.min(start + sampleSize, audioBuffer.length);
    let sumSquares = 0;
    let count = 0;

    for (let j = start; j < end; j += 1) {
      let value = 0;
      for (let ch = 0; ch < channelData.length; ch += 1) {
        value += channelData[ch][j] || 0;
      }
      value /= channelData.length || 1;
      sumSquares += value * value;
      count += 1;
    }

    peaks[i] = count > 0 ? Math.sqrt(sumSquares / count) : 0;
  }

  return peaks;
}

function normalizePeaks(peaks) {
  const max = Math.max(...peaks);
  if (!Number.isFinite(max) || max === 0) {
    return Array.from(peaks).map(() => 0.1);
  }
  return Array.from(peaks).map((v) => {
    const normalized = v / max;
    return Math.min(1, Math.max(0, Math.pow(normalized, 1.3)));
  });
}

self.addEventListener("message", async ({ data }) => {
  const { src, buckets = 160 } = data;

  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // OfflineAudioContext is available in Workers and provides decodeAudioData.
    // The render params (1, 1, 44100) are dummies — we only need the decoded AudioBuffer.
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const raw = extractPeaks(audioBuffer, buckets);
    const normalized = normalizePeaks(raw);

    self.postMessage({ peaks: Array.from(normalized) });
  } catch (error) {
    if (error.name !== "AbortError") {
      self.postMessage({ error: error.message });
    }
  }
});
