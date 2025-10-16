# @saku/peq-10band

Standalone 10-band parametric equalizer utilities extracted from Saku Audio Player. Built for the Web Audio API with zero runtime dependencies.

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

## API Overview

- `PEQProcessor` Class interface
- `createPeqChain`, `updatePeqFilters`, `updatePreamp`, `cleanupPeqChain`
- Preset helpers: `DEFAULT_PRESET`, `normalizePreset`, `validatePreset`, `listBundledPresets`
- Import/export helpers: `importPresetFromText`, `convertToNative`, `exportPreset`

See inline JSDoc comments for details.
