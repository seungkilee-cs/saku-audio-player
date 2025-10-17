/**
 * Frequency Response Calculation Utilities
 * 
 * Provides theoretical frequency response calculation for PEQ bands
 * independent of Web Audio API nodes. Useful for visualization and analysis.
 */

/**
 * Generate logarithmic frequency points from 20Hz to 20kHz
 * @param {number} numPoints - Number of frequency points to generate
 * @returns {Float32Array} Array of frequencies in Hz
 */
export function generateFrequencies(numPoints = 512) {
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
}

/**
 * Calculate frequency response for a single EQ band
 * @param {number} frequency - Frequency to calculate response for (Hz)
 * @param {Object} band - EQ band configuration
 * @param {number} band.frequency - Center frequency (Hz)
 * @param {number} band.gain - Gain in dB
 * @param {number} band.Q - Q factor
 * @param {string} band.type - Filter type ('peaking', 'lowshelf', 'highshelf', 'lowpass', 'highpass')
 * @returns {number} Response in dB
 */
export function calculateBandResponse(frequency, band) {
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
}

/**
 * Calculate complete frequency response for multiple EQ bands
 * @param {Array} bands - Array of EQ band configurations
 * @param {Object} options - Calculation options
 * @param {number} options.numPoints - Number of frequency points (default: 512)
 * @param {number} options.minFreq - Minimum frequency in Hz (default: 20)
 * @param {number} options.maxFreq - Maximum frequency in Hz (default: 20000)
 * @returns {Object} Object with frequencies array and magnitudeDb array
 */
export function calculateFrequencyResponse(bands, options = {}) {
  const { numPoints = 512, minFreq = 20, maxFreq = 20000 } = options;
  
  // Generate frequency points
  const frequencies = new Float32Array(numPoints);
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  
  for (let i = 0; i < numPoints; i++) {
    const logFreq = logMin + (i / (numPoints - 1)) * (logMax - logMin);
    frequencies[i] = Math.pow(10, logFreq);
  }
  
  // Calculate response at each frequency point
  const magnitudeDb = new Array(numPoints).fill(0);
  
  for (let i = 0; i < numPoints; i++) {
    const freq = frequencies[i];
    let totalGain = 0;
    
    // Sum contributions from all bands
    bands.forEach(band => {
      if (!band || typeof band.gain !== 'number' || Math.abs(band.gain) < 0.001) {
        return; // Skip flat bands
      }
      
      const bandResponse = calculateBandResponse(freq, band);
      totalGain += bandResponse;
    });
    
    magnitudeDb[i] = Math.max(-48, Math.min(48, totalGain)); // Clamp to reasonable range
  }
  
  return {
    frequencies: Array.from(frequencies),
    magnitudeDb
  };
}

/**
 * Calculate frequency response from PEQProcessor state
 * @param {Object} peqState - State object from PEQProcessor.getState()
 * @param {Object} options - Calculation options (same as calculateFrequencyResponse)
 * @returns {Object} Object with frequencies array and magnitudeDb array
 */
export function calculateProcessorResponse(peqState, options = {}) {
  if (!peqState || !peqState.bands) {
    throw new Error('calculateProcessorResponse requires a valid PEQ state with bands');
  }
  
  return calculateFrequencyResponse(peqState.bands, options);
}

/**
 * Get frequency response at specific frequencies
 * @param {Array} bands - Array of EQ band configurations
 * @param {Array} targetFrequencies - Array of frequencies to calculate response for
 * @returns {Array} Array of response values in dB
 */
export function getResponseAtFrequencies(bands, targetFrequencies) {
  return targetFrequencies.map(freq => {
    let totalGain = 0;
    
    bands.forEach(band => {
      if (!band || typeof band.gain !== 'number' || Math.abs(band.gain) < 0.001) {
        return;
      }
      
      const bandResponse = calculateBandResponse(freq, band);
      totalGain += bandResponse;
    });
    
    return Math.max(-48, Math.min(48, totalGain));
  });
}