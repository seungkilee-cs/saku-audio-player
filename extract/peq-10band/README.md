# @saku/peq-10band

Standalone 10-band parametric equalizer utilities with frequency response calculation, extracted from Saku Audio Player. Built for the Web Audio API with zero runtime dependencies.

## Installation

```bash
npm install @saku/peq-10band
```

## Quick Start

```javascript
import { PEQProcessor, DEFAULT_PRESET } from '@saku/peq-10band';

const audioContext = new AudioContext();
const source = audioContext.createMediaElementSource(audioElement);

const peq = new PEQProcessor(audioContext, {
  preset: DEFAULT_PRESET,
  bypass: false
});

source.connect(peq.inputNode);
peq.outputNode.connect(audioContext.destination);

peq.updateBand(0, { gain: 3 });
peq.setPreamp(-3);
```

## Frequency Response Visualization

Calculate theoretical frequency response for visualization or analysis:

```javascript
import { calculateFrequencyResponse, calculateProcessorResponse } from '@saku/peq-10band';

// Calculate response from band array
const bands = [
  { frequency: 60, gain: 3, Q: 1.0, type: 'lowshelf' },
  { frequency: 1000, gain: -2, Q: 2.0, type: 'peaking' }
];

const response = calculateFrequencyResponse(bands);
console.log(response.frequencies); // [20, 21.2, 22.5, ...] Hz
console.log(response.magnitudeDb); // [0.1, 0.2, 0.3, ...] dB

// Or calculate from PEQProcessor state
const peqResponse = calculateProcessorResponse(peq.getState());

// Get response at specific frequencies
import { getResponseAtFrequencies } from '@saku/peq-10band';
const specificResponse = getResponseAtFrequencies(bands, [100, 1000, 10000]);
```

## API Overview

### Core Processing
- `PEQProcessor` - Main EQ processor class
- `createPeqChain`, `updatePeqFilters`, `updatePreamp`, `cleanupPeqChain` - Low-level Web Audio utilities

### Frequency Response
- `calculateFrequencyResponse(bands, options)` - Calculate response from band array
- `calculateProcessorResponse(peqState, options)` - Calculate response from processor state
- `calculateBandResponse(frequency, band)` - Calculate single band response
- `generateFrequencies(numPoints)` - Generate logarithmic frequency array
- `getResponseAtFrequencies(bands, frequencies)` - Get response at specific frequencies

### Presets & I/O
- `DEFAULT_PRESET`, `normalizePreset`, `validatePreset`, `listBundledPresets` - Preset utilities
- `importPresetFromText`, `convertToNative`, `exportPreset` - Import/export helpers

See inline JSDoc comments for detailed documentation.
