/**
 * Format definitions for preset import/export
 */

export const EXPORT_FORMATS = {
  NATIVE: {
    id: 'native',
    name: 'Saku Native JSON',
    extension: 'json',
    mimeType: 'application/json',
    description: 'Native format with full feature support'
  },
  AUTOEQ: {
    id: 'autoeq',
    name: 'AutoEq ParametricEQ.txt',
    extension: 'txt',
    mimeType: 'text/plain',
    description: 'AutoEq text format for headphone corrections'
  },
  POWERAMP: {
    id: 'poweramp',
    name: 'PowerAmp XML',
    extension: 'xml',
    mimeType: 'application/xml',
    description: 'PowerAmp equalizer preset format'
  },
  QUDELIX: {
    id: 'qudelix',
    name: 'Qudelix JSON',
    extension: 'json',
    mimeType: 'application/json',
    description: 'Qudelix 5K DAC/Amp preset format'
  }
};

// PowerAmp uses fixed 10-band frequencies (Hz)
export const POWERAMP_FREQUENCIES = [
  60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000
];

// Qudelix 5K supports variable frequencies but has preferred ranges
export const QUDELIX_FREQUENCY_RANGE = {
  min: 20,
  max: 20000,
  preferredBands: 10
};

// Filter type mappings between formats
export const FILTER_TYPE_MAPPINGS = {
  // Saku -> PowerAmp (PowerAmp only supports peaking filters)
  sakuToPowerAmp: {
    'peaking': 'peaking',
    'lowshelf': 'peaking', // Convert to peaking at low frequency
    'highshelf': 'peaking', // Convert to peaking at high frequency
    'lowpass': 'peaking',
    'highpass': 'peaking'
  },
  
  // Saku -> Qudelix
  sakuToQudelix: {
    'peaking': 'bell',
    'lowshelf': 'low_shelf',
    'highshelf': 'high_shelf',
    'lowpass': 'low_pass',
    'highpass': 'high_pass'
  },
  
  // Qudelix -> Saku
  qudelixToSaku: {
    'bell': 'peaking',
    'low_shelf': 'lowshelf',
    'high_shelf': 'highshelf',
    'low_pass': 'lowpass',
    'high_pass': 'highpass'
  }
};