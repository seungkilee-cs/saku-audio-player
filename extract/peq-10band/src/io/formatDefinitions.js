export const EXPORT_FORMATS = {
  NATIVE: {
    id: 'native',
    name: 'PEQ Native JSON',
    extension: 'json',
    mimeType: 'application/json',
    description: 'Native format with full feature support'
  },
  AUTOEQ_TEXT: {
    id: 'autoeq-text',
    name: 'AutoEq ParametricEQ.txt',
    extension: 'txt',
    mimeType: 'text/plain',
    description: 'AutoEq text format for headphone corrections'
  },
  AUTOEQ_JSON: {
    id: 'autoeq',
    name: 'AutoEq JSON',
    extension: 'json',
    mimeType: 'application/json',
    description: 'AutoEq JSON format'
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

export const POWERAMP_FREQUENCIES = [
  60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000
];

export const QUDELIX_FREQUENCY_RANGE = {
  min: 20,
  max: 20000,
  preferredBands: 10
};

export const FILTER_TYPE_MAPPINGS = {
  sakuToPowerAmp: {
    peaking: 'peaking',
    lowshelf: 'peaking',
    highshelf: 'peaking',
    lowpass: 'peaking',
    highpass: 'peaking'
  },
  sakuToQudelix: {
    peaking: 'bell',
    lowshelf: 'low_shelf',
    highshelf: 'high_shelf',
    lowpass: 'low_pass',
    highpass: 'high_pass'
  },
  qudelixToSaku: {
    bell: 'peaking',
    low_shelf: 'lowshelf',
    high_shelf: 'highshelf',
    low_pass: 'lowpass',
    high_pass: 'highpass'
  }
};
