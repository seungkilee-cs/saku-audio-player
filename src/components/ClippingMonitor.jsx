import React, { useState, useEffect, useRef } from "react";
import "../styles/ClippingMonitor.css";

const ClippingMonitor = ({ peqChain }) => {
  const [isClipping, setIsClipping] = useState(false);
  const [peakLevel, setPeakLevel] = useState(0);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const dataArrayRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const smoothedPeakRef = useRef(0);

  useEffect(() => {
    // Get audioContext from global window object (set by AudioPlayer)
    const audioContext = window.audioContext;

    if (!audioContext || !peqChain?.outputNode) {
      cleanup();
      return;
    }

    try {
      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;

      // Connect analyser as a tap (non-intrusive monitoring)
      // Don't disconnect the main audio path!
      peqChain.outputNode.connect(analyser);
      // The main audio path remains: peqChain.outputNode -> audioContext.destination

      // Setup data array
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      startMonitoring();

      return cleanup;
    } catch (error) {
      console.warn("ClippingMonitor: Failed to setup analyser:", error);
      cleanup();
    }
  }, [peqChain]);

  const startMonitoring = () => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!analyser || !dataArray) return;

    const checkClipping = () => {
      try {
        const now = performance.now();

        // Update only every 500ms (2 FPS) for very stable display
        if (now - lastUpdateRef.current < 500) {
          animationRef.current = requestAnimationFrame(checkClipping);
          return;
        }
        lastUpdateRef.current = now;

        analyser.getFloatTimeDomainData(dataArray);

        // Find peak level in current buffer
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const abs = Math.abs(dataArray[i]);
          if (abs > peak) peak = abs;
        }

        // Apply heavy smoothing to prevent nauseating flips
        const smoothingFactor = 0.1; // Much lower = much more smoothing
        smoothedPeakRef.current =
          smoothedPeakRef.current * (1 - smoothingFactor) +
          peak * smoothingFactor;

        // Only update display if change is significant (>1dB)
        const currentDb =
          smoothedPeakRef.current > 0
            ? 20 * Math.log10(smoothedPeakRef.current)
            : -60;
        const lastDb = peakLevel > 0 ? 20 * Math.log10(peakLevel) : -60;

        if (Math.abs(currentDb - lastDb) > 1.0) {
          setPeakLevel(smoothedPeakRef.current);
        }

        // Clipping threshold: 0.99 (approximately -0.09 dB)
        const hasClipping = peak >= 0.99; // Use raw peak for clipping detection
        setIsClipping(hasClipping);

        animationRef.current = requestAnimationFrame(checkClipping);
      } catch (monitorError) {
        console.warn("ClippingMonitor: Error during monitoring:", monitorError);
        cleanup();
      }
    };

    checkClipping();
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (analyserRef.current) {
      try {
        // Only disconnect the analyser, don't touch the main audio path
        analyserRef.current.disconnect();
      } catch {
        // Ignore disconnect errors during cleanup
      }
      analyserRef.current = null;
    }

    dataArrayRef.current = null;
    lastUpdateRef.current = 0;
    smoothedPeakRef.current = 0;
    setIsClipping(false);
    setPeakLevel(0);
  };

  // Convert linear peak to dB for display
  const peakDb = peakLevel > 0 ? (20 * Math.log10(peakLevel)).toFixed(1) : "-∞";

  return (
    <div className={`clipping-monitor ${isClipping ? "clipping" : ""}`}>
      <div className="clipping-indicator" />
      <div className="clipping-info">
        <span className="clipping-label">CLIP</span>
        <span className="peak-level">{peakDb} dB</span>
      </div>
    </div>
  );
};

export default ClippingMonitor;

