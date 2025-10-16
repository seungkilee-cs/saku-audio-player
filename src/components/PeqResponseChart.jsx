import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import '../styles/PeqResponseChart.css';

const PeqResponseChart = ({ height = 300 }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [frequencyData, setFrequencyData] = useState(null);
  const { peqState } = usePlayback();
  const { peqBands, peqNodes } = peqState;

  // Generate logarithmic frequency points from 20Hz to 20kHz
  const generateFrequencies = useCallback((numPoints = 512) => {
    const frequencies = new Float32Array(numPoints);
    const minFreq = 20;
    const maxFreq = 20000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    
    for (let i = 0; i < numPoints; i++) {
      const logFreq = logMin + (i / (numPoints - 1)) * (logMax - logMin);
      frequencies[i] = Math.pow(10, logFreq);
    }
    
    return frequencies;
  }, []);

  // Memoize the band settings to prevent unnecessary recalculations
  const bandSettings = useMemo(() => {
    return peqBands.map(band => ({
      frequency: band.frequency,
      gain: band.gain,
      Q: band.Q,
      type: band.type
    }));
  }, [peqBands]);

  // Calculate theoretical frequency response from EQ band settings
  // This is independent of audio playback - shows what the EQ curve should look like
  const calculateFrequencyResponse = useCallback(() => {
    console.log('PeqResponseChart: Calculating frequency response for', bandSettings?.length || 0, 'bands');
    
    const numPoints = 512;
    const frequencies = generateFrequencies(numPoints);
    const magnitudeDb = new Array(numPoints).fill(0);
    
    // Calculate response for each frequency point based on EQ bands
    for (let i = 0; i < numPoints; i++) {
      const freq = frequencies[i];
      let totalGain = 0;
      
      // Sum contributions from all bands
      bandSettings.forEach(band => {
        if (!band || typeof band.gain !== 'number' || Math.abs(band.gain) < 0.001) {
          return; // Skip flat bands
        }
        
        const bandResponse = calculateBandResponse(freq, band);
        totalGain += bandResponse;
      });
      
      magnitudeDb[i] = Math.max(-48, Math.min(48, totalGain)); // Clamp to reasonable range
    }
    
    console.log('PeqResponseChart: Calculated response with max gain:', Math.max(...magnitudeDb), 'dB');
    
    return {
      frequencies: Array.from(frequencies),
      magnitudeDb
    };
  }, [bandSettings, generateFrequencies]);

  // Calculate frequency response for a single EQ band using simplified but accurate bell curve math
  const calculateBandResponse = (frequency, band) => {
    const { frequency: centerFreq, gain, Q, type } = band;
    
    if (!centerFreq || !gain || Math.abs(gain) < 0.001) {
      return 0;
    }
    
    const qFactor = Q || 1.0;
    
    switch (type) {
      case 'peaking': {
        // Simple but accurate peaking EQ response using bell curve
        // This creates the classic bell-shaped response curve
        
        // Calculate frequency ratio (how far we are from center frequency)
        const ratio = frequency / centerFreq;
        const logRatio = Math.log2(ratio);
        
        // Bandwidth calculation: higher Q = narrower bandwidth
        // Q of 1.0 gives about 2 octave bandwidth, Q of 0.5 gives about 4 octaves
        const bandwidth = 2.0 / qFactor; // octaves
        
        // Bell curve calculation using Gaussian-like function
        // The response falls off as we move away from center frequency
        const normalizedDistance = Math.abs(logRatio) / (bandwidth / 2);
        
        // Use a smooth bell curve that approaches the gain at center frequency
        // and falls off smoothly on both sides
        let response;
        if (normalizedDistance <= 0.01) {
          // Very close to center frequency - return full gain
          response = 1.0;
        } else {
          // Bell curve falloff - this creates the smooth peaking response
          response = 1.0 / (1.0 + Math.pow(normalizedDistance * 2, 2));
        }
        
        return gain * response;
      }
      
      case 'lowshelf': {
        // Low shelf: full gain below cutoff, smooth transition above
        const ratio = frequency / centerFreq;
        if (ratio <= 1) {
          return gain;
        } else {
          // Smooth rolloff above cutoff frequency
          const octaves = Math.log2(ratio);
          const rolloff = 1.0 / (1.0 + octaves * qFactor);
          return gain * rolloff;
        }
      }
      
      case 'highshelf': {
        // High shelf: full gain above cutoff, smooth transition below
        const ratio = frequency / centerFreq;
        if (ratio >= 1) {
          return gain;
        } else {
          // Smooth rolloff below cutoff frequency
          const octaves = Math.log2(1 / ratio);
          const rolloff = 1.0 / (1.0 + octaves * qFactor);
          return gain * rolloff;
        }
      }
      
      case 'lowpass': {
        // Low pass filter response
        const ratio = frequency / centerFreq;
        if (ratio <= 1) {
          return 0; // No change in passband
        } else {
          // Rolloff above cutoff
          const octaves = Math.log2(ratio);
          return -6 * octaves * qFactor; // 6dB/octave per Q
        }
      }
      
      case 'highpass': {
        // High pass filter response
        const ratio = frequency / centerFreq;
        if (ratio >= 1) {
          return 0; // No change in passband
        } else {
          // Rolloff below cutoff
          const octaves = Math.log2(1 / ratio);
          return -6 * octaves * qFactor; // 6dB/octave per Q
        }
      }
      
      default:
        return 0;
    }
  };

  // Draw the frequency response chart
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frequencyData) {
      console.log('PeqResponseChart: Cannot draw - missing canvas or data');
      return;
    }

    // Check if canvas is actually visible (not hidden by CSS)
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.log('PeqResponseChart: Canvas not visible, skipping draw');
      return;
    }

    const ctx = canvas.getContext('2d');
    const { frequencies, magnitudeDb } = frequencyData;
    
    console.log('PeqResponseChart: Drawing chart with', frequencies.length, 'points, max dB:', Math.max(...magnitudeDb), 'min dB:', Math.min(...magnitudeDb));
    
    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    const padding = 40;
    const graphWidth = canvasWidth - 2 * padding;
    const graphHeight = canvasHeight - 2 * padding;
    const dbRange = 24; // -12dB to +12dB visible range
    
    // Draw grid
    drawGrid(ctx, canvasWidth, canvasHeight, padding, graphWidth, graphHeight, dbRange);
    
    // Draw frequency response curve
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let firstPoint = true;
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    
    frequencies.forEach((freq, i) => {
      // Logarithmic X position (20Hz to 20kHz)
      const xPos = padding + ((Math.log10(freq) - logMin) / (logMax - logMin)) * graphWidth;
      
      // Linear Y position (dB) - flip Y axis so positive is up
      // Clamp Y position to stay within graph bounds
      const dbValue = Math.max(-dbRange/2, Math.min(dbRange/2, magnitudeDb[i]));
      const yPos = padding + graphHeight / 2 - (dbValue / dbRange) * graphHeight;
      
      if (firstPoint) {
        ctx.moveTo(xPos, yPos);
        firstPoint = false;
      } else {
        ctx.lineTo(xPos, yPos);
      }
    });
    
    ctx.stroke();
    
    // Draw band markers
    peqBands.forEach(band => {
      if (Math.abs(band.gain) < 0.1) return; // Skip flat bands
      
      const logMin = Math.log10(20);
      const logMax = Math.log10(20000);
      const xPos = padding + ((Math.log10(band.frequency) - logMin) / (logMax - logMin)) * graphWidth;
      
      // Clamp gain to visible range for marker position
      const clampedGain = Math.max(-dbRange/2, Math.min(dbRange/2, band.gain));
      const yPos = padding + graphHeight / 2 - (clampedGain / dbRange) * graphHeight;
      
      // Color based on gain
      ctx.fillStyle = band.gain > 0 ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(xPos, yPos, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add white border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Add frequency label for active bands
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      const freqLabel = band.frequency >= 1000 ? 
        `${(band.frequency / 1000).toFixed(1)}k` : 
        `${Math.round(band.frequency)}`;
      ctx.fillText(freqLabel, xPos, yPos - 8);
    });
    
  }, [frequencyData, peqBands]);

  // Draw grid lines and labels
  const drawGrid = (ctx, canvasWidth, canvasHeight, padding, graphWidth, graphHeight, dbRange) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    
    // Frequency grid lines (logarithmic)
    const freqLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    freqLines.forEach(freq => {
      const logMin = Math.log10(20);
      const logMax = Math.log10(20000);
      const x = padding + ((Math.log10(freq) - logMin) / (logMax - logMin)) * graphWidth;
      
      // Draw vertical line
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvasHeight - padding);
      ctx.stroke();
      
      // Draw frequency label
      ctx.textAlign = 'center';
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
      ctx.fillText(label, x, canvasHeight - padding + 15);
    });
    
    // dB grid lines
    const dbLines = [-12, -6, 0, 6, 12];
    dbLines.forEach(db => {
      const y = padding + graphHeight / 2 - (db / dbRange) * graphHeight;
      
      // Draw horizontal line
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvasWidth - padding, y);
      ctx.stroke();
      
      // Draw dB label
      ctx.textAlign = 'right';
      ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, padding - 5, y + 3);
    });
    
    // Draw center line (0dB) more prominently
    const centerY = padding + graphHeight / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, centerY);
    ctx.lineTo(canvasWidth - padding, centerY);
    ctx.stroke();
  };

  // Schedule chart update with requestAnimationFrame
  const scheduleUpdate = useCallback(() => {
    if (animationFrameRef.current) return;
    
    animationFrameRef.current = requestAnimationFrame(() => {
      const newData = calculateFrequencyResponse();
      setFrequencyData(newData);
      animationFrameRef.current = null;
    });
  }, [calculateFrequencyResponse]);

  // Initial data calculation on mount
  useEffect(() => {
    const initialData = calculateFrequencyResponse();
    setFrequencyData(initialData);
  }, [calculateFrequencyResponse]);

  // Update frequency data when band settings change
  useEffect(() => {
    console.log('PeqResponseChart: Band settings changed, updating chart');
    // Only update if canvas is visible
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        scheduleUpdate();
      } else {
        console.log('PeqResponseChart: Canvas not visible, deferring update');
        // Store the update for when canvas becomes visible
        const checkVisibility = () => {
          const newRect = canvas.getBoundingClientRect();
          if (newRect.width > 0 && newRect.height > 0) {
            scheduleUpdate();
          } else {
            requestAnimationFrame(checkVisibility);
          }
        };
        requestAnimationFrame(checkVisibility);
      }
    }
  }, [bandSettings, scheduleUpdate]);

  // Draw chart when frequency data changes
  useEffect(() => {
    drawChart();
  }, [frequencyData, drawChart]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      scheduleUpdate();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleUpdate]);

  return (
    <div className="peq-response-chart">
      <div className="peq-response-chart__header">
        <h4>Frequency Response</h4>
        <div className="peq-response-chart__legend">
          <span className="legend-item">
            <span className="legend-color legend-color--boost"></span>
            Boost
          </span>
          <span className="legend-item">
            <span className="legend-color legend-color--cut"></span>
            Cut
          </span>
        </div>
      </div>
      <div className="peq-response-chart__container">
        <canvas
          ref={canvasRef}
          className="peq-response-chart__canvas"
          style={{ width: '100%', height: `${height}px` }}
        />

      </div>
    </div>
  );
};

export default PeqResponseChart;