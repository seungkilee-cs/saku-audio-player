import { BAND_LAYOUT } from './audio/peqGraph';
import { validatePreset, normalizePreset } from './peqPresets';

// Storage key for consistent naming
export const STORAGE_PREFIX = 'saku-player';
export const STORAGE_KEYS = {
  PEQ_STATE: `${STORAGE_PREFIX}-peq-state`,
  PRESET_LIBRARY: `${STORAGE_PREFIX}-preset-library`,
  USER_PREFERENCES: `${STORAGE_PREFIX}-prefs`
};

/**
 * Detect the format of a preset JSON object
 * @param {Object} json - Parsed JSON object
 * @returns {string} - Format type: 'native', 'autoeq', 'poweramp', or throws error
 */
export function detectPresetFormat(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid JSON: Expected an object');
  }

  // AutoEq format detection
  if (json.preamp !== undefined && 
      Array.isArray(json.filters) && 
      json.filters.length > 0 &&
      json.filters[0]?.fc !== undefined) {
    return 'autoeq';
  }

  // Native format detection
  if (json.name && 
      Array.isArray(json.bands) && 
      json.bands.length > 0 &&
      json.bands[0]?.frequency !== undefined) {
    return 'native';
  }

  // PowerAmp format detection
  if (json.EQSettings && 
      Array.isArray(json.EQSettings.bands)) {
    return 'poweramp';
  }

  // Generic EQ format (simple bands array)
  if (Array.isArray(json.bands) && 
      json.bands.length > 0 &&
      typeof json.bands[0] === 'object') {
    return 'generic';
  }

  throw new Error('Unknown preset format. Supported formats: Native, AutoEq, PowerAmp');
}

/**
 * Convert AutoEq format to native format
 * Uses dynamic frequency mapping to preserve AutoEq's exact frequencies and gains
 * @param {Object} autoEqPreset - AutoEq format preset
 * @returns {Object} - Native format preset
 */
export function convertAutoEqToNative(autoEqPreset) {
  if (!autoEqPreset.filters || !Array.isArray(autoEqPreset.filters)) {
    throw new Error('AutoEq preset must have a filters array');
  }

  console.log('Converting AutoEq preset with', autoEqPreset.filters.length, 'filters');

  // Strategy: Use AutoEq's exact frequencies and gains (dynamic mapping)
  // This preserves the original AutoEq intent without information loss
  console.log('Using dynamic frequency mapping (preserving AutoEq frequencies)');
  
  // Take up to 10 filters in original order (preserve AutoEq sequence)
  const selectedFilters = autoEqPreset.filters.slice(0, 10);

  console.log('Selected filters in original order:');
  selectedFilters.forEach((filter, i) => {
    console.log(`  ${i + 1}. ${filter.fc}Hz: ${filter.gain > 0 ? '+' : ''}${filter.gain}dB (${filter.type})`);
  });

  // Convert to native bands using AutoEq's exact frequencies
  const nativeBands = selectedFilters.map(filter => {
    // Map AutoEq filter types to native types
    let nativeType = 'peaking'; // Default
    if (filter.type) {
      const autoEqType = filter.type.toUpperCase();
      switch (autoEqType) {
        case 'PK':
        case 'PEAKING':
          nativeType = 'peaking';
          break;
        case 'LSC':
        case 'LOWSHELF':
          nativeType = 'lowshelf';
          break;
        case 'HSC':
        case 'HIGHSHELF':
          nativeType = 'highshelf';
          break;
        case 'NOTCH':
          nativeType = 'notch';
          break;
        default:
          nativeType = 'peaking';
      }
    }

    return {
      frequency: filter.fc, // Use AutoEq's exact frequency!
      type: nativeType,
      gain: filter.gain, // Use AutoEq's exact gain!
      Q: filter.Q || (nativeType === 'peaking' ? 1.0 : 0.707)
    };
  });

  // Fill remaining bands with neutral values if we have fewer than 10
  while (nativeBands.length < 10) {
    // Use remaining frequencies from our standard layout for neutral bands
    const usedFreqs = new Set(nativeBands.map(b => b.frequency));
    const unusedLayoutBand = BAND_LAYOUT.find(layoutBand => 
      !usedFreqs.has(layoutBand.freq)
    );
    
    if (unusedLayoutBand) {
      nativeBands.push({
        frequency: unusedLayoutBand.freq,
        type: unusedLayoutBand.type,
        gain: 0,
        Q: unusedLayoutBand.type === 'peaking' ? 1.0 : 0.707
      });
    } else {
      // Fallback: create a neutral peaking band
      nativeBands.push({
        frequency: 1000 + nativeBands.length * 100, // Spread out frequencies
        type: 'peaking',
        gain: 0,
        Q: 1.0
      });
    }
  }

  // Keep original AutoEq filter order (don't sort by frequency)
  // This preserves the intended filter processing order

  const convertedPreset = {
    name: autoEqPreset.name || 'Imported AutoEq Preset',
    description: `AutoEq preset - ${autoEqPreset.filters.length} filters, ${selectedFilters.length} used in original order`,
    version: '1.0',
    preamp: autoEqPreset.preamp !== undefined ? autoEqPreset.preamp : 0,
    bands: nativeBands,
    source: 'autoeq',
    originalFrequencies: autoEqPreset.filters.map(f => f.fc),
    dynamicFrequencies: true, // Flag to indicate this uses dynamic frequencies
    importDate: new Date().toISOString()
  };

  console.log('=== AUTOEQ CONVERSION DEBUG ===');
  console.log('Original AutoEq preamp:', autoEqPreset.preamp);
  console.log('Converted preset preamp:', convertedPreset.preamp);
  console.log('Original filter order:');
  autoEqPreset.filters.forEach((filter, i) => {
    console.log(`  ${i + 1}. ${filter.fc}Hz: ${filter.gain > 0 ? '+' : ''}${filter.gain}dB (${filter.type})`);
  });
  console.log('Final band order:');
  nativeBands.forEach((band, i) => {
    console.log(`  ${i + 1}. ${band.frequency}Hz: ${band.gain > 0 ? '+' : ''}${band.gain}dB (${band.type})`);
  });
  console.log('=== END DEBUG ===');
  
  return convertedPreset;
}

/**
 * Convert native format to AutoEq format for export
 * @param {Object} nativePreset - Native format preset
 * @returns {Object} - AutoEq format preset
 */
export function convertNativeToAutoEq(nativePreset) {
  if (!nativePreset.bands || !Array.isArray(nativePreset.bands)) {
    throw new Error('Native preset must have a bands array');
  }

  const autoEqFilters = nativePreset.bands
    .filter(band => Math.abs(band.gain) > 0.01) // Skip flat bands
    .map(band => {
      // Map native types to AutoEq types
      let autoEqType = 'PK'; // Default to peaking
      switch (band.type?.toLowerCase()) {
        case 'peaking':
          autoEqType = 'PK';
          break;
        case 'lowshelf':
          autoEqType = 'LSC';
          break;
        case 'highshelf':
          autoEqType = 'HSC';
          break;
        case 'notch':
          autoEqType = 'NOTCH';
          break;
        default:
          autoEqType = 'PK';
      }

      return {
        type: autoEqType,
        fc: band.frequency,
        Q: band.Q,
        gain: band.gain
      };
    });

  const result = {
    name: nativePreset.name,
    preamp: nativePreset.preamp || 0,
    filters: autoEqFilters
  };

  console.log('=== EXPORT TO AUTOEQ DEBUG ===');
  console.log('Native preset preamp:', nativePreset.preamp);
  console.log('Exported preamp:', result.preamp);
  console.log('Native bands order:');
  nativePreset.bands.forEach((band, i) => {
    console.log(`  ${i + 1}. ${band.frequency}Hz: ${band.gain > 0 ? '+' : ''}${band.gain}dB (${band.type})`);
  });
  console.log('Exported filters order:');
  result.filters.forEach((filter, i) => {
    console.log(`  ${i + 1}. ${filter.fc}Hz: ${filter.gain > 0 ? '+' : ''}${filter.gain}dB (${filter.type})`);
  });
  console.log('=== END EXPORT DEBUG ===');

  return result;
}

/**
 * Convert native preset to AutoEq ParametricEQ.txt text format
 * @param {Object} nativePreset - Native format preset
 * @returns {string} - AutoEq ParametricEQ.txt format string
 */
export function convertNativeToAutoEqText(nativePreset) {
  if (!nativePreset.bands || !Array.isArray(nativePreset.bands)) {
    throw new Error('Native preset must have a bands array');
  }

  let textContent = '';
  
  // Add preamp line
  const preamp = nativePreset.preamp || 0;
  textContent += `Preamp: ${preamp >= 0 ? '+' : ''}${preamp.toFixed(1)} dB\n`;
  
  // Add filter lines
  const activeFilters = nativePreset.bands.filter(band => Math.abs(band.gain) > 0.01);
  
  activeFilters.forEach((band, index) => {
    // Map native types to AutoEq types
    let autoEqType = 'PK'; // Default to peaking
    switch (band.type?.toLowerCase()) {
      case 'peaking':
        autoEqType = 'PK';
        break;
      case 'lowshelf':
        autoEqType = 'LSC';
        break;
      case 'highshelf':
        autoEqType = 'HSC';
        break;
      case 'notch':
        autoEqType = 'NOTCH';
        break;
      default:
        autoEqType = 'PK';
    }

    // Format: Filter 1: ON PK Fc 105 Hz Gain 2.9 dB Q 0.70
    const filterNum = index + 1;
    const fc = Math.round(band.frequency);
    const gain = band.gain >= 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1);
    const q = band.Q.toFixed(2);
    
    textContent += `Filter ${filterNum}: ON ${autoEqType} Fc ${fc} Hz Gain ${gain} dB Q ${q}\n`;
  });

  console.log('=== EXPORT TO AUTOEQ TEXT DEBUG ===');
  console.log('Generated AutoEq text:');
  console.log(textContent);
  console.log('=== END EXPORT TEXT DEBUG ===');

  return textContent;
}

/**
 * Convert PowerAmp format to native format
 * @param {Object} powerAmpPreset - PowerAmp format preset
 * @returns {Object} - Native format preset
 */
export function convertPowerAmpToNative(powerAmpPreset) {
  if (!powerAmpPreset.EQSettings?.bands) {
    throw new Error('PowerAmp preset must have EQSettings.bands array');
  }

  const bands = powerAmpPreset.EQSettings.bands.map((band, index) => {
    const layoutBand = BAND_LAYOUT[index];
    return {
      frequency: layoutBand?.freq || 1000,
      type: index === 0 ? 'lowshelf' : 
            index === BAND_LAYOUT.length - 1 ? 'highshelf' : 'peaking',
      gain: band.gain || 0,
      Q: band.Q || (index === 0 || index === BAND_LAYOUT.length - 1 ? 0.707 : 1.0)
    };
  });

  return {
    name: powerAmpPreset.name || 'PowerAmp Preset',
    description: 'Imported from PowerAmp',
    version: '1.0',
    preamp: powerAmpPreset.EQSettings.preamp || 0,
    bands,
    source: 'poweramp',
    importDate: new Date().toISOString()
  };
}

/**
 * Convert any supported format to native format
 * @param {Object} preset - Preset in any supported format
 * @returns {Object} - Native format preset
 */
export function convertToNative(preset) {
  const format = detectPresetFormat(preset);
  
  let nativePreset;
  switch (format) {
    case 'autoeq':
      nativePreset = convertAutoEqToNative(preset);
      break;
    case 'poweramp':
      nativePreset = convertPowerAmpToNative(preset);
      break;
    case 'native':
      nativePreset = preset;
      break;
    case 'generic':
      // Try to normalize generic format
      nativePreset = {
        name: preset.name || 'Imported Preset',
        description: preset.description || 'Generic EQ preset',
        version: '1.0',
        preamp: preset.preamp || 0,
        bands: preset.bands,
        source: 'generic',
        importDate: new Date().toISOString()
      };
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  // Validate and normalize the result
  return normalizePreset(nativePreset);
}

/**
 * Export preset as file download (JSON or text depending on format)
 * @param {Object} preset - Preset to export
 * @param {string} format - Export format ('native', 'autoeq', or 'autoeq-text')
 * @param {string} filename - Optional custom filename
 */
export function exportPresetAsJSON(preset, format = 'native', filename = null) {
  let exportData;
  let defaultFilename;
  let mimeType;
  let isTextFormat = false;

  switch (format) {
    case 'autoeq':
      exportData = convertNativeToAutoEq(preset);
      defaultFilename = `${sanitizeFilename(preset.name)}_autoeq.json`;
      mimeType = 'application/json';
      break;
    case 'autoeq-text':
      exportData = convertNativeToAutoEqText(preset);
      defaultFilename = `${sanitizeFilenamePreserveSpaces(preset.name)} ParametricEQ.txt`;
      mimeType = 'text/plain';
      isTextFormat = true;
      break;
    case 'native':
    default:
      exportData = preset;
      defaultFilename = `${sanitizeFilename(preset.name)}.json`;
      mimeType = 'application/json';
      break;
  }

  // Create content based on format
  const content = isTextFormat ? exportData : JSON.stringify(exportData, null, 2);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || defaultFilename;
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  console.log(`Exported preset "${preset.name}" as ${format} format`);
}

/**
 * Parse AutoEq ParametricEQ.txt format
 * @param {string} text - ParametricEQ.txt content
 * @returns {Object} - AutoEq format object
 */
export function parseAutoEqText(text) {
  console.log('Parsing AutoEq text...');
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let preamp = 0;
  const filters = [];
  let name = 'AutoEq Preset';

  console.log('Processing', lines.length, 'lines');

  for (const line of lines) {
    console.log('Processing line:', line);
    
    // Parse preamp line: "Preamp: -4.1 dB"
    const preampMatch = line.match(/Preamp:\s*([+-]?\d+\.?\d*)\s*dB/i);
    if (preampMatch) {
      preamp = parseFloat(preampMatch[1]);
      console.log('Found preamp:', preamp);
      continue;
    }

    // Parse filter line: "Filter 1: ON LSC Fc 105 Hz Gain 2.9 dB Q 0.70"
    const filterMatch = line.match(/Filter\s+\d+:\s*ON\s+(\w+)\s+Fc\s+(\d+\.?\d*)\s*Hz\s+Gain\s*([+-]?\d+\.?\d*)\s*dB\s+Q\s+(\d+\.?\d*)/i);
    if (filterMatch) {
      const [, type, fc, gain, Q] = filterMatch;
      const filter = {
        type: type.toUpperCase(),
        fc: parseFloat(fc),
        gain: parseFloat(gain),
        Q: parseFloat(Q)
      };
      filters.push(filter);
      console.log('Found filter:', filter);
      continue;
    }

    console.log('Line did not match any pattern:', line);
  }

  console.log('Parsed', filters.length, 'filters with preamp', preamp);

  if (filters.length === 0) {
    throw new Error(`No valid filters found in AutoEq text. 
Expected format: "Filter 1: ON PK Fc 105 Hz Gain -2.1 dB Q 0.70"
Found ${lines.length} lines but none matched the filter pattern.
First few lines: ${lines.slice(0, 3).join('; ')}`);
  }

  return {
    name,
    preamp,
    filters
  };
}

/**
 * Import preset from text content (JSON or AutoEq ParametricEQ.txt)
 * @param {string} text - File content
 * @param {string} filename - Original filename for context
 * @returns {Object} - Native format preset
 */
export function importPresetFromText(text, filename = '') {
  console.log('Importing preset from text, filename:', filename);
  console.log('Text preview:', text.substring(0, 100));
  
  // Check if it looks like AutoEq format first (more reliable)
  if (text.includes('Preamp:') && text.includes('Filter') && text.includes('Hz')) {
    console.log('Detected AutoEq ParametricEQ.txt format');
    try {
      const autoEqData = parseAutoEqText(text);
      
      // Use filename for better naming if available
      if (filename) {
        console.log('Original filename:', filename);
        const extractedName = filename
          .replace(/\s*ParametricEQ\.(txt|json)$/i, '') // Remove ParametricEQ.txt suffix
          .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
          .replace(/\b\w/g, l => l.toUpperCase()) // Title case
          .trim();
        
        console.log('Extracted name:', extractedName);
        
        if (extractedName && extractedName !== filename) {
          autoEqData.name = extractedName;
        }
      }
      
      return convertAutoEqToNative(autoEqData);
    } catch (textError) {
      console.error('AutoEq parsing failed:', textError);
      throw new Error(`Could not parse AutoEq format: ${textError.message}`);
    }
  }
  
  // Try JSON format
  try {
    console.log('Attempting JSON parse');
    const parsed = JSON.parse(text);
    return convertToNative(parsed);
  } catch (jsonError) {
    console.error('JSON parsing failed:', jsonError);
    throw new Error(`Could not parse file. Expected JSON or AutoEq ParametricEQ.txt format.\nError: ${jsonError.message}`);
  }
}

/**
 * Import preset from JSON text (legacy function for backward compatibility)
 * @param {string} jsonText - JSON string
 * @returns {Object} - Native format preset
 */
export function importPresetFromJSON(jsonText) {
  return importPresetFromText(jsonText);
}

/**
 * Sanitize filename for safe file downloads
 * @param {string} name - Original name
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(name) {
  return name
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'preset';
}

/**
 * Sanitize filename while preserving spaces and case (for AutoEq format)
 * @param {string} name - Original filename
 * @returns {string} - Sanitized filename with spaces and case preserved
 */
function sanitizeFilenamePreserveSpaces(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove only truly problematic characters
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim() || 'preset';
}

/**
 * Validate imported preset and provide user-friendly error messages
 * @param {Object} preset - Preset to validate
 * @returns {Object} - Validation result with success/error info
 */
export function validateImportedPreset(preset) {
  try {
    validatePreset(preset);
    return {
      success: true,
      preset: normalizePreset(preset),
      message: `Successfully validated preset "${preset.name}"`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Validation failed: ${error.message}`
    };
  }
}

/**
 * Create a preset library entry with metadata
 * @param {Object} preset - Native format preset
 * @returns {Object} - Library entry with metadata
 */
export function createLibraryEntry(preset) {
  return {
    ...preset,
    id: generatePresetId(preset),
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    usage: 0,
    favorite: false
  };
}

/**
 * Generate unique ID for preset
 * @param {Object} preset - Preset object
 * @returns {string} - Unique ID
 */
function generatePresetId(preset) {
  const timestamp = Date.now();
  const nameHash = preset.name.replace(/\s+/g, '-').toLowerCase();
  return `${nameHash}-${timestamp}`;
}