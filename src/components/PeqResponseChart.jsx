import React, { useRef, useEffect, useState, useCallback } from 'react';
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

  // Calculate combined frequency response
  const calculateFrequencyResponse = useCallback(() => {
    console.log('PeqResponseChart: peqNodes:', peqNodes);
    console.log('PeqResponseChart: peqNodes?.filters:', peqNodes?.filters);
    
    const numPoints = 512;
    const frequencies = generateFrequencies(numPoints);
    
    if (!peqNodes?.filters || peqNodes.filters.length === 0) {
      console.log('PeqResponseChart: No peqNodes or filters available - showing flat response');
      // Return flat response (0dB) when no audio nodes available
      return {
        frequencies: Array.from(frequencies),
        magnitudeDb: new Array(numPoints).fill(0)
      };
    }
    
    console.log('PeqResponseChart: Calculating response with', peqNodes.filters.length, 'filters');

    const magnitudeResponse = new Float32Array(numPoints);
    const phaseResponse = new Float32Array(numPoints);
    
    // Initialize combined magnitude to 1.0 (0dB)
    const combinedMagnitude = new Float32Array(numPoints).fill(1.0);
    
    // Multiply magnitude responses from all filters
    peqNodes.filters.forEach(filter => {
      try {
        filter.getFrequencyResponse(frequencies, magnitudeResponse, phaseResponse);
        
        for (let i = 0; i < numPoints; i++) {
          combinedMagnitude[i] *= magnitudeResponse[i];
        }
      } catch (error) {
        console.warn('Failed to get frequency response from filter:', error);
      }
    });
    
    // Convert to dB and clamp extreme values
    const magnitudeDb = Array.from(combinedMagnitude, mag => {
      const db = 20 * Math.log10(Math.max(mag, 0.001)); // Prevent log(0)
      return Math.max(-48, Math.min(48, db)); // Clamp to reasonable range
    });
    
    return {
      frequencies: Array.from(frequencies),
      magnitudeDb
    };
  }, [peqNodes, generateFrequencies]);

  // Draw the frequency response chart
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frequencyData) {
      console.log('PeqResponseChart: Cannot draw - missing canvas or data');
      return;
    }

    const ctx = canvas.getContext('2d');
    const { frequencies, magnitudeDb } = frequencyData;
    
    console.log('PeqResponseChart: Drawing chart with', frequencies.length, 'points');
    
    // Set canvas size for high DPI displays
    const rect = canvas.getBoundingClientRect();
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
    
    // Test: Draw a simple line to verify canvas is working
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding + graphHeight / 2);
    ctx.lineTo(canvasWidth - padding, padding + graphHeight / 2);
    ctx.stroke();
    
    // Draw grid
    drawGrid(ctx, canvasWidth, canvasHeight, padding, graphWidth, graphHeight, dbRange);
    
    // Draw frequency response curve
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let firstPoint = true;
    frequencies.forEach((freq, i) => {
      // Logarithmic X position (20Hz to 20kHz)
      const logMin = Math.log10(20);
      const logMax = Math.log10(20000);
      const xPos = padding + ((Math.log10(freq) - logMin) / (logMax - logMin)) * graphWidth;
      
      // Linear Y position (dB) - flip Y axis so positive is up
      const yPos = padding + graphHeight / 2 - (magnitudeDb[i] / dbRange) * graphHeight;
      
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
      const yPos = padding + graphHeight / 2 - (band.gain / dbRange) * graphHeight;
      
      // Color based on gain
      ctx.fillStyle = band.gain > 0 ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(xPos, yPos, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add white border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
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

  // Update frequency data when bands or nodes change
  useEffect(() => {
    scheduleUpdate();
  }, [peqBands, peqNodes, scheduleUpdate]);

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
        {!peqNodes?.filters && (
          <div className="peq-response-chart__overlay">
            <p>Start playing audio for live response</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeqResponseChart;