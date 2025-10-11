import { FILTER_TYPE_MAPPINGS, QUDELIX_FREQUENCY_RANGE } from '../formatDefinitions.js';

/**
 * Convert Saku preset to Qudelix JSON format
 * @param {Object} preset - Saku preset object
 * @returns {string} Qudelix JSON string
 */
export const convertToQudelix = (preset) => {
  const { bands, preampGain, name, description } = preset;
  
  if (!bands || !Array.isArray(bands)) {
    throw new Error('Invalid preset: bands array is required');
  }
  
  // Convert Saku bands to Qudelix format
  const qudelixBands = bands
    .filter(band => band.freq && band.freq >= QUDELIX_FREQUENCY_RANGE.min && band.freq <= QUDELIX_FREQUENCY_RANGE.max)
    .map((band, index) => ({
      id: index,
      frequency: Math.round(band.freq),
      gain: parseFloat(band.gain.toFixed(1)),
      q: parseFloat((band.q || 1.0).toFixed(2)),
      type: mapFilterType(band.type),
      enabled: band.gain !== 0
    }));
  
  // Qudelix preset structure
  const qudelixPreset = {
    name: name || 'Saku Preset',
    description: description || 'Exported from Saku Audio Player',
    version: "1.0",
    created: new Date().toISOString(),
    eq: {
      enabled: true,
      preamp: parseFloat((preampGain || 0).toFixed(1)),
      bands: qudelixBands
    },
    metadata: {
      source: 'Saku Audio Player',
      originalBandCount: bands.length,
      exportedBandCount: qudelixBands.length
    }
  };
  
  return JSON.stringify(qudelixPreset, null, 2);
};

/**
 * Convert Qudelix preset to Saku format
 * @param {string|Object} qudelixData - Qudelix JSON string or object
 * @returns {Object} Saku preset object
 */
export const convertFromQudelix = (qudelixData) => {
  let preset;
  
  if (typeof qudelixData === 'string') {
    try {
      preset = JSON.parse(qudelixData);
    } catch {
      throw new Error('Invalid Qudelix JSON format');
    }
  } else {
    preset = qudelixData;
  }
  
  if (!preset.eq || !preset.eq.bands) {
    throw new Error('Invalid Qudelix preset: missing EQ data');
  }
  
  // Convert Qudelix bands to Saku format
  const sakuBands = preset.eq.bands.map(band => ({
    freq: band.frequency,
    gain: band.gain,
    q: band.q || 1.0,
    type: FILTER_TYPE_MAPPINGS.qudelixToSaku[band.type] || 'peaking'
  }));
  
  return {
    name: preset.name || 'Qudelix Preset',
    description: preset.description || 'Imported from Qudelix',
    bands: sakuBands,
    preampGain: preset.eq.preamp || 0,
    source: 'qudelix'
  };
};

/**
 * Map Saku filter type to Qudelix filter type
 * @param {string} sakuType - Saku filter type
 * @returns {string} Qudelix filter type
 */
const mapFilterType = (sakuType) => {
  return FILTER_TYPE_MAPPINGS.sakuToQudelix[sakuType] || 'bell';
};

/**
 * Validate Qudelix preset data
 * @param {Object} preset - Preset to validate
 * @returns {Object} Validation result
 */
export const validateQudelixPreset = (preset) => {
  const errors = [];
  const warnings = [];
  
  if (!preset.name || typeof preset.name !== 'string') {
    warnings.push('Preset name is missing or invalid, using default');
  }
  
  if (!preset.bands || !Array.isArray(preset.bands)) {
    errors.push('Preset must have a bands array');
    return { valid: false, errors, warnings };
  }
  
  // Check frequency ranges
  const outOfRangeBands = preset.bands.filter(band => 
    !band.freq || 
    band.freq < QUDELIX_FREQUENCY_RANGE.min || 
    band.freq > QUDELIX_FREQUENCY_RANGE.max
  );
  
  if (outOfRangeBands.length > 0) {
    warnings.push(`${outOfRangeBands.length} bands have frequencies outside Qudelix range (${QUDELIX_FREQUENCY_RANGE.min}-${QUDELIX_FREQUENCY_RANGE.max} Hz)`);
  }
  
  // Check for extreme gain values
  const extremeBands = preset.bands.filter(band => Math.abs(band.gain) > 12);
  if (extremeBands.length > 0) {
    warnings.push(`${extremeBands.length} bands have extreme gain values (>±12dB), may cause distortion`);
  }
  
  // Check Q values
  const extremeQBands = preset.bands.filter(band => band.q && (band.q < 0.1 || band.q > 10));
  if (extremeQBands.length > 0) {
    warnings.push(`${extremeQBands.length} bands have extreme Q values, may cause instability`);
  }
  
  // Check preamp
  if (preset.preampGain && Math.abs(preset.preampGain) > 12) {
    warnings.push('Preamp gain is extreme (>±12dB), may cause clipping');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get Qudelix format information
 * @returns {Object} Format information
 */
export const getQudelixFormatInfo = () => ({
  name: 'Qudelix JSON',
  extension: 'json',
  mimeType: 'application/json',
  features: {
    bands: 'variable (up to 10 recommended)',
    variableFrequencies: true,
    filterTypes: ['bell', 'low_shelf', 'high_shelf', 'low_pass', 'high_pass'],
    preamp: true,
    qFactor: true,
    maxGain: 12,
    minGain: -12,
    frequencyRange: `${QUDELIX_FREQUENCY_RANGE.min}-${QUDELIX_FREQUENCY_RANGE.max} Hz`
  },
  limitations: [
    'Maximum 10 bands recommended for optimal performance',
    'Gain range typically ±12dB',
    'Very high Q values may cause instability',
    'Some filter types may not be supported on all Qudelix firmware versions'
  ]
});

/**
 * Optimize Qudelix preset for best performance
 * @param {Object} preset - Saku preset to optimize
 * @returns {Object} Optimized preset
 */
export const optimizeForQudelix = (preset) => {
  const optimized = { ...preset };
  
  // Limit to 10 bands for optimal performance
  if (optimized.bands.length > 10) {
    // Keep the 10 bands with highest absolute gain values
    optimized.bands = optimized.bands
      .sort((a, b) => Math.abs(b.gain) - Math.abs(a.gain))
      .slice(0, 10)
      .sort((a, b) => a.freq - b.freq); // Re-sort by frequency
  }
  
  // Clamp gain values to safe range
  optimized.bands = optimized.bands.map(band => ({
    ...band,
    gain: Math.max(-12, Math.min(12, band.gain)),
    q: Math.max(0.1, Math.min(10, band.q || 1.0))
  }));
  
  // Clamp preamp
  if (optimized.preampGain) {
    optimized.preampGain = Math.max(-12, Math.min(12, optimized.preampGain));
  }
  
  return optimized;
};