import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import "../styles/WaveformCanvas.css";

const waveformCache = new Map();

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!getAudioContext.instance) {
    try {
      getAudioContext.instance = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn("AudioContext could not be created", error);
      getAudioContext.instance = null;
    }
  }
  return getAudioContext.instance;
}

function extractPeaks(audioBuffer, buckets = 160) {
  if (!audioBuffer) {
    return [];
  }
  const channelData = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  const sampleSize = Math.max(1, Math.floor(audioBuffer.length / buckets));
  const peaks = new Float32Array(buckets);

  for (let i = 0; i < buckets; i += 1) {
    const start = i * sampleSize;
    const end = Math.min(start + sampleSize, audioBuffer.length);
    let min = 1;
    let max = -1;

    for (let j = start; j < end; j += 1) {
      let value = 0;
      for (let channel = 0; channel < channelData.length; channel += 1) {
        value += channelData[channel][j] || 0;
      }
      value /= channelData.length || 1;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    const amplitude = Math.max(Math.abs(min), Math.abs(max));
    peaks[i] = amplitude;
  }

  return peaks;
}

function normalizePeaks(peaks) {
  if (!peaks || peaks.length === 0) {
    return [];
  }
  const max = Math.max(...peaks);
  if (!Number.isFinite(max) || max === 0) {
    return Array.from(peaks).map(() => 0.1);
  }
  return Array.from(peaks).map((value) => value / max);
}

export default function WaveformCanvas({ src, progress = 0, accentColor }) {
  const prefersReducedMotion = useMotionPreferences();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [peaks, setPeaks] = useState([]);
  const [containerWidth, setContainerWidth] = useState(0);

  const progressRatio = Math.min(Math.max(progress, 0), 1);

  const tint = useMemo(() => accentColor || "#f472b6", [accentColor]);

  useEffect(() => {
    if (!src || prefersReducedMotion) {
      setPeaks([]);
      return undefined;
    }

    let isActive = true;
    const cached = waveformCache.get(src);
    if (cached) {
      setPeaks(cached);
      return undefined;
    }

    const controller = new AbortController();
    const context = getAudioContext();
    if (!context) {
      return undefined;
    }

    const loadWaveform = async () => {
      try {
        const response = await fetch(src, { signal: controller.signal });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        const rawPeaks = extractPeaks(audioBuffer);
        const normalized = normalizePeaks(rawPeaks);
        if (isActive) {
          waveformCache.set(src, normalized);
          setPeaks(normalized);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.warn("Failed to generate waveform", error);
        }
      }
    };

    loadWaveform();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [prefersReducedMotion, src]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(container);
    setContainerWidth(container.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0 || containerWidth === 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = containerWidth;
    const height = canvas.parentElement?.clientHeight || 100;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);

    const barCount = peaks.length;
    const barWidth = Math.max(2, width / (barCount * 1.2));
    const gap = barWidth * 0.2;
    const centerY = height / 2;
    const availableHeight = height * 0.65;
    const highlightIndex = Math.floor(progressRatio * barCount);

    for (let i = 0; i < barCount; i += 1) {
      const amplitude = Math.max(0.08, peaks[i]);
      const barHeight = Math.min(availableHeight, amplitude * availableHeight);
      const x = i * (barWidth + gap);
      const y = centerY - barHeight / 2;

      const isActive = i <= highlightIndex;
      const gradient = context.createLinearGradient(x, y, x, y + barHeight);
      if (isActive) {
        gradient.addColorStop(0, tint);
        gradient.addColorStop(1, "rgba(129, 140, 248, 0.85)");
      } else {
        gradient.addColorStop(0, "rgba(148, 163, 184, 0.5)");
        gradient.addColorStop(1, "rgba(191, 219, 254, 0.45)");
      }

      context.fillStyle = gradient;
      context.beginPath();
      context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      context.fill();
    }

    context.scale(1 / dpr, 1 / dpr);
  }, [containerWidth, peaks, progressRatio, tint]);

  return (
    <div ref={containerRef} className="waveform">
      <canvas ref={canvasRef} className="waveform__canvas" aria-hidden="true" />
      {peaks.length === 0 ? <div className="waveform__loading" /> : null}
    </div>
  );
}
