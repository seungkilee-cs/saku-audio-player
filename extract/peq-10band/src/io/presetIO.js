import { BAND_LAYOUT } from '../core/peqGraph.js';
import { normalizePreset, validatePreset } from '../presets/presetManager.js';
import { POWERAMP_FREQUENCIES, FILTER_TYPE_MAPPINGS } from './formatDefinitions.js';

/**
 * Detect the format of a preset JSON object
 * @param {Object} json - Parsed JSON object
 * @returns {string} - Format type: 'native', 'autoeq', 'poweramp', or throws error
 */
export function detectPresetFormat(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid JSON: Expected an object');
  }

  if (json.preamp !== undefined && Array.isArray(json.filters) && json.filters[0]?.fc !== undefined) {
    return 'autoeq';
  }

  if (json.name && Array.isArray(json.bands) && json.bands[0]?.frequency !== undefined) {
    return 'native';
  }

  if (json.EQSettings && Array.isArray(json.EQSettings.bands)) {
    return 'poweramp';
  }

  if (Array.isArray(json.bands) && typeof json.bands[0] === 'object') {
    return 'generic';
  }

  throw new Error('Unknown preset format. Supported formats: Native, AutoEq, PowerAmp');
}

export function convertAutoEqToNative(autoEqPreset) {
  if (!autoEqPreset.filters || !Array.isArray(autoEqPreset.filters)) {
    throw new Error('AutoEq preset must have a filters array');
  }

  const selectedFilters = autoEqPreset.filters.slice(0, 10);

  const nativeBands = selectedFilters.map(filter => {
    let nativeType = 'peaking';
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
      frequency: filter.fc,
      type: nativeType,
      gain: filter.gain,
      Q: filter.Q || (nativeType === 'peaking' ? 1.0 : 0.707)
    };
  });

  while (nativeBands.length < 10) {
    const usedFreqs = new Set(nativeBands.map(b => b.frequency));
    const unusedLayoutBand = BAND_LAYOUT.find(layoutBand => !usedFreqs.has(layoutBand.freq));
    if (unusedLayoutBand) {
      nativeBands.push({
        frequency: unusedLayoutBand.freq,
        type: unusedLayoutBand.type,
        gain: 0,
        Q: unusedLayoutBand.type === 'peaking' ? 1.0 : 0.707
      });
    } else {
      nativeBands.push({
        frequency: 1000 + nativeBands.length * 100,
        type: 'peaking',
        gain: 0,
        Q: 1.0
      });
    }
  }

  return {
    name: autoEqPreset.name || 'Imported AutoEq Preset',
    description: `AutoEq preset - ${autoEqPreset.filters.length} filters, ${selectedFilters.length} used`,
    version: '1.0',
    preamp: autoEqPreset.preamp !== undefined ? autoEqPreset.preamp : 0,
    bands: nativeBands,
    source: 'autoeq'
  };
}

export function convertNativeToAutoEq(nativePreset) {
  if (!nativePreset.bands || !Array.isArray(nativePreset.bands)) {
    throw new Error('Native preset must have a bands array');
  }

  const autoEqFilters = nativePreset.bands
    .filter(band => Math.abs(band.gain) > 0.01)
    .map(band => {
      let autoEqType = 'PK';
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

  return {
    name: nativePreset.name,
    preamp: nativePreset.preamp || 0,
    filters: autoEqFilters
  };
}

export function convertNativeToAutoEqText(nativePreset) {
  if (!nativePreset.bands || !Array.isArray(nativePreset.bands)) {
    throw new Error('Native preset must have a bands array');
  }

  const preamp = nativePreset.preamp || 0;
  const activeFilters = nativePreset.bands.filter(band => Math.abs(band.gain) > 0.01);
  const lines = [`Preamp: ${preamp >= 0 ? '+' : ''}${preamp.toFixed(1)} dB`];

  activeFilters.forEach((band, index) => {
    let autoEqType = 'PK';
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

    const filterNum = index + 1;
    const fc = Math.round(band.frequency);
    const gain = band.gain >= 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1);
    const q = band.Q.toFixed(2);
    lines.push(`Filter ${filterNum}: ON ${autoEqType} Fc ${fc} Hz Gain ${gain} dB Q ${q}`);
  });

  return lines.join('\n');
}

export function convertPowerAmpToNative(powerAmpPreset) {
  if (!powerAmpPreset.EQSettings?.bands) {
    throw new Error('PowerAmp preset must have EQSettings.bands array');
  }

  const bands = powerAmpPreset.EQSettings.bands.map((band, index) => {
    const layoutBand = BAND_LAYOUT[index];
    return {
      frequency: layoutBand?.freq || 1000,
      type: index === 0 ? 'lowshelf' : index === BAND_LAYOUT.length - 1 ? 'highshelf' : 'peaking',
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
    source: 'poweramp'
  };
}

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
      nativePreset = {
        name: preset.name || 'Imported Preset',
        description: preset.description || 'Generic EQ preset',
        version: '1.0',
        preamp: preset.preamp || 0,
        bands: preset.bands,
        source: 'generic'
      };
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return normalizePreset(nativePreset);
}

export function parseAutoEqText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  let preamp = 0;
  const filters = [];

  for (const line of lines) {
    const preampMatch = line.match(/Preamp:\s*([+-]?\d+\.?\d*)\s*dB/i);
    if (preampMatch) {
      preamp = parseFloat(preampMatch[1]);
      continue;
    }

    const filterMatch = line.match(/Filter\s+\d+:\s*ON\s+(\w+)\s+Fc\s+(\d+\.?\d*)\s*Hz\s+Gain\s*([+-]?\d+\.?\d*)\s*dB\s+Q\s+(\d+\.?\d*)/i);
    if (filterMatch) {
      const [, type, fc, gain, Q] = filterMatch;
      filters.push({
        type: type.toUpperCase(),
        fc: parseFloat(fc),
        gain: parseFloat(gain),
        Q: parseFloat(Q)
      });
      continue;
    }
  }

  if (filters.length === 0) {
    throw new Error('No valid filters found in AutoEq text.');
  }

  return { name: 'AutoEq Preset', preamp, filters };
}

export function importPresetFromText(text, filename = '') {
  if (text.includes('Preamp:') && text.includes('Filter') && text.includes('Hz')) {
    const autoEqData = parseAutoEqText(text);
    if (filename) {
      const extractedName = filename
        .replace(/\s*ParametricEQ\.(txt|json)$/i, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
      if (extractedName && extractedName !== filename) {
        autoEqData.name = extractedName;
      }
    }
    return convertAutoEqToNative(autoEqData);
  }

  const parsed = JSON.parse(text);
  return convertToNative(parsed);
}

export function exportPreset(preset, format = 'native') {
  let exportData;
  switch (format) {
    case 'autoeq':
      exportData = convertNativeToAutoEq(preset);
      return JSON.stringify(exportData, null, 2);
    case 'autoeq-text':
      return convertNativeToAutoEqText(preset);
    case 'native':
    default:
      exportData = preset;
      return JSON.stringify(exportData, null, 2);
  }
}

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
