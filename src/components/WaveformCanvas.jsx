import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import "../styles/WaveformCanvas.css";

const waveformCache = new Map();
const colorTestContext = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

function sanitizeColor(color, fallback = "#f472b6") {
  if (!colorTestContext) {
    return fallback;
  }
  if (typeof color !== "string") {
    return fallback;
  }
  const trimmed = color.trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    colorTestContext.fillStyle = trimmed;
    return colorTestContext.fillStyle || fallback;
  } catch (err) {
    return fallback;
  }
}

function toRgba(color, alpha, fallback = "rgba(244, 114, 182, 0.25)") {
  const sanitized = sanitizeColor(color);
  const hexMatch = sanitized.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbMatch = sanitized.match(/^rgb(?:a)?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((part) => part.trim());
    const [r, g, b] = parts;
    const numeric = [r, g, b].map((value) => parseFloat(value));
    if (numeric.every((value) => Number.isFinite(value))) {
      return `rgba(${numeric[0]}, ${numeric[1]}, ${numeric[2]}, ${alpha})`;
    }
  }

  return fallback;
}

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

export default function WaveformCanvas({
  src,
  progress = 0,
  accentColor,
  disabled = false,
  onScrub,
  onScrubEnd,
  showGlow = true,
}) {
  const prefersReducedMotion = useMotionPreferences();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [peaks, setPeaks] = useState([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [scrubValue, setScrubValue] = useState(progress);

  const tint = useMemo(() => sanitizeColor(accentColor, "#f472b6"), [accentColor]);
  const glowColor = useMemo(() => toRgba(tint, 0.27), [tint]);
  const activeProgress = isPointerActive ? scrubValue : progress;
  const progressRatio = Math.min(Math.max(activeProgress, 0), 1);

  useEffect(() => {
    if (!isPointerActive) {
      setScrubValue(progress);
    }
  }, [isPointerActive, progress]);

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
    if (!canvas || containerWidth === 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = containerWidth;
    const height = canvas.parentElement?.clientHeight || 120;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.save();
    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);

    const barCount = peaks.length || 96;
    const effectivePeaks = peaks.length ? peaks : new Array(barCount).fill(0.2);
    const barWidth = Math.max(2, width / (barCount * 1.15));
    const gap = barWidth * 0.25;
    const centerY = height / 2;
    const availableHeight = height * 0.72;
    const activeIndex = Math.floor(progressRatio * barCount);

    for (let i = 0; i < barCount; i += 1) {
      const amplitude = Math.max(0.08, effectivePeaks[i]);
      const eased = Math.pow(amplitude, 0.8);
      const barHeight = Math.min(availableHeight, eased * availableHeight);
      const x = i * (barWidth + gap);
      const y = centerY - barHeight / 2;

      const isActive = i <= activeIndex;
      const gradient = context.createLinearGradient(x, y, x, y + barHeight);
      if (isActive) {
        gradient.addColorStop(0, tint);
        gradient.addColorStop(1, "rgba(129, 140, 248, 0.9)");
      } else {
        gradient.addColorStop(0, "rgba(148, 163, 184, 0.35)");
        gradient.addColorStop(1, "rgba(203, 213, 225, 0.25)");
      }

      context.fillStyle = gradient;
      context.beginPath();
      context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      context.fill();
    }

    if (showGlow && !prefersReducedMotion) {
      const glowWidth = Math.max(width * 0.12, 90);
      const glowX = Math.min(width - glowWidth / 2, Math.max(glowWidth / 2, activeIndex * (barWidth + gap)));
      const glowGradient = context.createRadialGradient(glowX, centerY, glowWidth * 0.1, glowX, centerY, glowWidth);
      glowGradient.addColorStop(0, glowColor);
      glowGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = glowGradient;
      context.beginPath();
      context.arc(glowX, centerY, glowWidth, 0, Math.PI * 2);
      context.fill();
    }

    if (isPointerActive) {
      context.fillStyle = "rgba(255, 255, 255, 0.85)";
      const markerX = activeIndex * (barWidth + gap);
      context.fillRect(Math.max(0, markerX - 1), 0, 2, height);
    }

    context.restore();
  }, [containerWidth, peaks, progressRatio, tint, glowColor, showGlow, prefersReducedMotion, isPointerActive]);

  const updateScrub = useCallback(
    (clientX) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const ratio = (clientX - rect.left) / rect.width;
      const clamped = Math.min(Math.max(ratio, 0), 1);
      setScrubValue(clamped);
      onScrub?.(clamped);
    },
    [onScrub],
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      setIsPointerActive(true);
      const point = event.touches?.[0] ?? event;
      updateScrub(point.clientX);
    },
    [disabled, updateScrub],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!isPointerActive || disabled) {
        return;
      }
      const point = event.touches?.[0] ?? event;
      updateScrub(point.clientX);
    },
    [disabled, isPointerActive, updateScrub],
  );

  const endScrub = useCallback(
    (event) => {
      if (!isPointerActive) {
        return;
      }
      const point = event.changedTouches?.[0] ?? event;
      updateScrub(point?.clientX ?? 0);
      setIsPointerActive(false);
      onScrubEnd?.();
    },
    [isPointerActive, onScrubEnd, updateScrub],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (disabled) {
        return;
      }

      const step = event.shiftKey ? 0.05 : 0.01;
      let next = progress;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        next = Math.min(1, progress + step);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        next = Math.max(0, progress - step);
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = 1;
      } else {
        return;
      }

      event.preventDefault();
      setScrubValue(next);
      onScrub?.(next);
      onScrubEnd?.();
    },
    [disabled, onScrub, onScrubEnd, progress],
  );

  return (
    <div
      ref={containerRef}
      className={`waveform${disabled ? " waveform--disabled" : ""}`}
      role="slider"
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number.isFinite(progressRatio) ? progressRatio : 0}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={endScrub}
      onMouseLeave={endScrub}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={endScrub}
    >
      <canvas ref={canvasRef} className="waveform__canvas" aria-hidden="true" />
      {peaks.length === 0 ? <div className="waveform__loading" /> : null}
      {isPointerActive ? <div className="waveform__scrub-indicator" aria-hidden="true" /> : null}
    </div>
  );
}
