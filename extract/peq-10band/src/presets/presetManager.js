import { BAND_LAYOUT } from '../core/peqGraph.js';

const DEFAULT_PEAKING_Q = 1.0;
const DEFAULT_SHELF_Q = Math.SQRT1_2;

export const DEFAULT_PRESET = Object.freeze({
  name: 'Flat',
  description: 'No equalization – natural sound',
  version: '1.0',
  preamp: 0,
  bands: Object.freeze(
    BAND_LAYOUT.map(({ freq, type }) =>
      Object.freeze({
        frequency: freq,
        type,
        gain: 0,
        Q: type === 'peaking' ? DEFAULT_PEAKING_Q : DEFAULT_SHELF_Q,
      }),
    ),
  ),
});

export const BUNDLED_PRESETS = {
  FLAT: DEFAULT_PRESET,
  BASS_BOOST: Object.freeze({
    name: 'Bass Boost',
    description: 'Enhanced low-end for EDM and hip-hop',
    version: '1.0',
    preamp: -6,
    bands: Object.freeze([
      { frequency: 60, type: 'lowshelf', gain: 6, Q: DEFAULT_SHELF_Q },
      { frequency: 150, type: 'peaking', gain: 4, Q: DEFAULT_PEAKING_Q },
      { frequency: 400, type: 'peaking', gain: 0, Q: DEFAULT_PEAKING_Q },
      { frequency: 1000, type: 'peaking', gain: 0, Q: DEFAULT_PEAKING_Q },
      { frequency: 2400, type: 'peaking', gain: -1, Q: 1.2 },
      { frequency: 4800, type: 'peaking', gain: -1.5, Q: 1.1 },
      { frequency: 9600, type: 'peaking', gain: -1.5, Q: 1.0 },
      { frequency: 12000, type: 'peaking', gain: 0, Q: 1.0 },
      { frequency: 14000, type: 'peaking', gain: 0, Q: 1.0 },
      { frequency: 16000, type: 'highshelf', gain: 0, Q: DEFAULT_SHELF_Q },
    ]),
  }),
  VOCAL_CLARITY: Object.freeze({
    name: 'Vocal Clarity',
    description: 'Presence boost for podcasts and vocal mixes',
    version: '1.0',
    preamp: -4,
    bands: Object.freeze([
      { frequency: 60, type: 'lowshelf', gain: -2, Q: DEFAULT_SHELF_Q },
      { frequency: 150, type: 'peaking', gain: -1, Q: DEFAULT_PEAKING_Q },
      { frequency: 400, type: 'peaking', gain: 1, Q: 1.2 },
      { frequency: 1000, type: 'peaking', gain: 2.5, Q: 1.4 },
      { frequency: 2400, type: 'peaking', gain: 3.5, Q: 1.2 },
      { frequency: 4800, type: 'peaking', gain: 2, Q: 1.0 },
      { frequency: 9600, type: 'peaking', gain: 1, Q: 0.9 },
      { frequency: 12000, type: 'peaking', gain: 0.5, Q: 0.9 },
      { frequency: 14000, type: 'peaking', gain: 0, Q: 1.0 },
      { frequency: 16000, type: 'highshelf', gain: 1.5, Q: DEFAULT_SHELF_Q },
    ]),
  }),
};

export function clonePreset(preset) {
  if (!preset) return null;
  return {
    ...preset,
    bands: (preset.bands ?? []).map((band) => ({ ...band })),
  };
}

export function calculateRecommendedPreamp(bands = []) {
  if (!bands.length) {
    return 0;
  }
  const maxGain = bands.reduce((max, band) => {
    const gain = typeof band.gain === 'number' ? band.gain : 0;
    return gain > max ? gain : max;
  }, 0);
  return maxGain > 0 ? -maxGain : 0;
}

export function validatePreset(preset) {
  if (!preset || typeof preset !== 'object') {
    throw new Error('Preset must be an object');
  }
  if (typeof preset.name !== 'string' || !preset.name.trim()) {
    throw new Error('Preset must include a name');
  }
  if (!Array.isArray(preset.bands) || preset.bands.length === 0) {
    throw new Error('Preset must include a bands array');
  }

  preset.bands.forEach((band, index) => {
    if (typeof band.frequency !== 'number' || band.frequency < 20 || band.frequency > 20000) {
      throw new Error(`Band ${index} has an invalid frequency: ${band.frequency}`);
    }
    if (typeof band.gain !== 'number' || band.gain < -24 || band.gain > 24) {
      throw new Error(`Band ${index} has an invalid gain: ${band.gain}`);
    }
    if (typeof band.Q !== 'number' || band.Q <= 0 || band.Q > 10) {
      throw new Error(`Band ${index} has an invalid Q: ${band.Q}`);
    }
    if (!band.type || !['peaking', 'lowshelf', 'highshelf', 'notch'].includes(band.type)) {
      throw new Error(`Band ${index} has an invalid type: ${band.type}`);
    }
  });

  return true;
}

export function getBundledPreset(key) {
  return BUNDLED_PRESETS[key] ? clonePreset(BUNDLED_PRESETS[key]) : null;
}

export function listBundledPresets() {
  return Object.keys(BUNDLED_PRESETS);
}

export function ensureBandsCount(bands = [], target = BAND_LAYOUT.length) {
  if (bands.length >= target) {
    return bands.map((band) => ({ ...band }));
  }
  const missing = BAND_LAYOUT.slice(bands.length).map(({ freq, type }) => ({
    frequency: freq,
    type,
    gain: 0,
    Q: type === 'peaking' ? DEFAULT_PEAKING_Q : DEFAULT_SHELF_Q,
  }));
  return [...bands.map((band) => ({ ...band })), ...missing];
}

export function normalizePreset(preset) {
  validatePreset(preset);
  const bands = ensureBandsCount(preset.bands);
  
  // Preserve explicit preamp values, including negative values and zero
  // Only calculate recommended preamp if preamp is undefined or null
  const preamp = (preset.preamp !== undefined && preset.preamp !== null) 
    ? preset.preamp 
    : calculateRecommendedPreamp(bands);
    
  return {
    ...preset,
    preamp,
    bands,
  };
}

export const PRESET_VERSION = '1.0';
