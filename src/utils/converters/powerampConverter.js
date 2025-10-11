import { POWERAMP_FREQUENCIES, FILTER_TYPE_MAPPINGS } from '../formatDefinitions.js';

/**
 * Convert Saku preset to PowerAmp XML format
 * @param {Object} preset - Saku preset object
 * @returns {string} PowerAmp XML string
 */
export const convertToPowerAmp = (preset) => {
  const { bands, preampGain, name } = preset;
  
  if (!bands || !Array.isArray(bands)) {
    throw new Error('Invalid preset: bands array is required');
  }
  
  // Map Saku bands to PowerAmp's fixed frequencies
  const powerampBands = POWERAMP_FREQUENCIES.map((targetFreq, index) => {
    // Find the closest Saku band to this PowerAmp frequency
    const closestBand = findClosestBand(bands, targetFreq);
    
    return {
      index,
      frequency: targetFreq,
      gain: closestBand ? closestBand.gain : 0,
      enabled: closestBand ? closestBand.gain !== 0 : false
    };
  });
  
  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<poweramp_equalizer version="1.0">
  <preset name="${escapeXml(name || 'Saku Preset')}">
    <preamp gain="${(preampGain || 0).toFixed(1)}" />
    ${powerampBands.map(band => 
      `<band index="${band.index}" freq="${band.frequency}" gain="${band.gain.toFixed(1)}" enabled="${band.enabled}" />`
    ).join('\n    ')}
  </preset>
</poweramp_equalizer>`;
  
  return xml;
};

/**
 * Find the closest Saku band to a target frequency
 * @param {Array} bands - Array of Saku bands
 * @param {number} targetFreq - Target frequency in Hz
 * @returns {Object|null} Closest band or null
 */
const findClosestBand = (bands, targetFreq) => {
  if (!bands || bands.length === 0) return null;
  
  return bands.reduce((closest, band) => {
    if (!band.freq) return closest;
    
    const currentDistance = Math.abs(Math.log(band.freq) - Math.log(targetFreq));
    const closestDistance = closest ? Math.abs(Math.log(closest.freq) - Math.log(targetFreq)) : Infinity;
    
    return currentDistance < closestDistance ? band : closest;
  }, null);
};

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeXml = (str) => {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Validate PowerAmp preset data
 * @param {Object} preset - Preset to validate
 * @returns {Object} Validation result
 */
export const validatePowerAmpPreset = (preset) => {
  const errors = [];
  const warnings = [];
  
  if (!preset.name || typeof preset.name !== 'string') {
    warnings.push('Preset name is missing or invalid, using default');
  }
  
  if (!preset.bands || !Array.isArray(preset.bands)) {
    errors.push('Preset must have a bands array');
    return { valid: false, errors, warnings };
  }
  
  if (preset.bands.length === 0) {
    warnings.push('Preset has no bands, will export as flat EQ');
  }
  
  // Check for extreme gain values
  const extremeBands = preset.bands.filter(band => Math.abs(band.gain) > 20);
  if (extremeBands.length > 0) {
    warnings.push(`${extremeBands.length} bands have extreme gain values (>±20dB)`);
  }
  
  // Check preamp
  if (preset.preampGain && Math.abs(preset.preampGain) > 20) {
    warnings.push('Preamp gain is extreme (>±20dB)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get PowerAmp format information
 * @returns {Object} Format information
 */
export const getPowerAmpFormatInfo = () => ({
  name: 'PowerAmp XML',
  extension: 'xml',
  mimeType: 'application/xml',
  features: {
    bands: 10,
    fixedFrequencies: true,
    filterTypes: ['peaking'],
    preamp: true,
    maxGain: 20,
    minGain: -20
  },
  limitations: [
    'Only supports 10 fixed frequencies',
    'All filters are converted to peaking type',
    'Q factor is not preserved',
    'Frequency values are mapped to nearest PowerAmp frequency'
  ]
});