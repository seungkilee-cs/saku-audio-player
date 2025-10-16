import { createPeqChain, updatePeqFilters, updatePreamp, cleanupPeqChain } from './core/peqGraph.js';
import { normalizePreset, clonePreset, DEFAULT_PRESET } from './presets/presetManager.js';

const DEFAULT_OPTIONS = {
  preset: null,
  bands: null,
  preamp: null,
  bypass: false,
  description: 'PEQ Processor Initial State'
};

const EVENTS = {
  BAND_CHANGE: 'bandchange',
  PREAMP_CHANGE: 'preampchange',
  PRESET_LOAD: 'presetload',
  BYPASS_CHANGE: 'bypasschange',
  STATE_CHANGE: 'statechange'
};

function ensurePreset(options = {}) {
  const merged = { ...DEFAULT_OPTIONS, ...options };

  if (merged.preset) {
    return normalizePreset(merged.preset);
  }

  const basePreset = {
    name: 'Custom Preset',
    description: merged.description,
    preamp: merged.preamp ?? DEFAULT_PRESET.preamp,
    bands: merged.bands ?? DEFAULT_PRESET.bands
  };

  // normalizePreset clones but we also want to avoid frozen DEFAULT_PRESET bands
  return normalizePreset({
    ...basePreset,
    bands: basePreset.bands.map((band) => ({ ...band }))
  });
}

function cloneBands(bands = []) {
  return bands.map((band) => ({ ...band }));
}

export class PEQProcessor {
  constructor(audioContext, options = {}) {
    if (!audioContext) {
      throw new Error('PEQProcessor requires a valid AudioContext instance');
    }

    this.context = audioContext;
    this.listeners = new Map();

    const preset = ensurePreset(options);

    this.chain = createPeqChain(this.context, preset.bands);
    this.state = {
      name: preset.name,
      description: preset.description,
      preamp: preset.preamp,
      bands: cloneBands(preset.bands),
      bypass: Boolean(options.bypass)
    };

    // Routing: external input -> (wet path -> PEQ) + (dry path) -> output
    this.inputNode = this.context.createGain();
    this.outputNode = this.context.createGain();
    this.dryGain = this.context.createGain();
    this.wetGain = this.context.createGain();

    this.inputNode.connect(this.chain.inputNode);
    this.chain.outputNode.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    updatePeqFilters(this.chain.filters, this.state.bands);
    updatePreamp(this.chain.preampNode, this.state.preamp);
    this._applyBypass();
  }

  get events() {
    return EVENTS;
  }

  connect(destination) {
    this.outputNode.connect(destination);
  }

  disconnect(destination) {
    this.outputNode.disconnect(destination);
  }

  on(event, handler) {
    if (!event || typeof handler !== 'function') return () => {};
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(handler);
    this.listeners.set(event, listeners);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.delete(handler);
    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event, payload) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.warn(`PEQProcessor listener for event "${event}" failed`, error);
      }
    });
  }

  updateBand(index, changes) {
    if (index < 0 || index >= this.state.bands.length) {
      throw new RangeError(`Band index ${index} is out of range`);
    }
    if (!changes || typeof changes !== 'object') {
      return;
    }

    const nextBands = cloneBands(this.state.bands);
    nextBands[index] = {
      ...nextBands[index],
      ...changes
    };

    this.state.bands = nextBands;
    updatePeqFilters(this.chain.filters, this.state.bands);
    this.emit(EVENTS.BAND_CHANGE, { index, band: { ...this.state.bands[index] } });
    this.emit(EVENTS.STATE_CHANGE, this.getState());
  }

  updateBands(updates = []) {
    if (!Array.isArray(updates)) {
      throw new TypeError('updateBands expects an array of updates');
    }

    const nextBands = cloneBands(this.state.bands);

    updates.forEach((update) => {
      if (!update || typeof update !== 'object') return;
      const { index } = update;
      if (index === undefined || index < 0 || index >= nextBands.length) return;
      nextBands[index] = {
        ...nextBands[index],
        ...update
      };
    });

    this.state.bands = nextBands;
    updatePeqFilters(this.chain.filters, this.state.bands);
    this.emit(EVENTS.BAND_CHANGE, { bands: cloneBands(this.state.bands) });
    this.emit(EVENTS.STATE_CHANGE, this.getState());
  }

  setPreamp(preampDb = 0) {
    if (typeof preampDb !== 'number') {
      throw new TypeError('setPreamp expects a numeric gain value');
    }
    this.state.preamp = preampDb;
    updatePreamp(this.chain.preampNode, preampDb);
    this.emit(EVENTS.PREAMP_CHANGE, preampDb);
    this.emit(EVENTS.STATE_CHANGE, this.getState());
  }

  setBypass(enabled) {
    this.state.bypass = Boolean(enabled);
    this._applyBypass();
    this.emit(EVENTS.BYPASS_CHANGE, this.state.bypass);
    this.emit(EVENTS.STATE_CHANGE, this.getState());
  }

  _applyBypass() {
    if (this.state.bypass) {
      this.dryGain.gain.value = 1;
      this.wetGain.gain.value = 0;
    } else {
      this.dryGain.gain.value = 0;
      this.wetGain.gain.value = 1;
    }
  }

  loadPreset(preset) {
    const normalized = normalizePreset(preset);
    this.state = {
      ...this.state,
      name: normalized.name,
      description: normalized.description,
      preamp: normalized.preamp,
      bands: cloneBands(normalized.bands)
    };
    updatePeqFilters(this.chain.filters, this.state.bands);
    updatePreamp(this.chain.preampNode, this.state.preamp);
    this.emit(EVENTS.PRESET_LOAD, this.getState());
    this.emit(EVENTS.STATE_CHANGE, this.getState());
  }

  getState() {
    return {
      name: this.state.name,
      description: this.state.description,
      preamp: this.state.preamp,
      bands: cloneBands(this.state.bands),
      bypass: this.state.bypass
    };
  }

  setState(state) {
    if (!state || typeof state !== 'object') {
      throw new TypeError('setState expects a state object');
    }
    if (state.bands) {
      this.state.bands = cloneBands(state.bands);
      updatePeqFilters(this.chain.filters, this.state.bands);
    }
    if (typeof state.preamp === 'number') {
      this.state.preamp = state.preamp;
      updatePreamp(this.chain.preampNode, this.state.preamp);
    }
    if (typeof state.bypass === 'boolean') {
      this.state.bypass = state.bypass;
      this._applyBypass();
    }
    if (state.name) {
      this.state.name = state.name;
    }
    if (state.description) {
      this.state.description = state.description;
    }
    this.emit(EVENTS.STATE_CHANGE, this.getState());
  }

  destroy() {
    try {
      this.disconnect();
    } catch (error) {
      console.warn('PEQProcessor disconnect failed during destroy', error);
    }
    cleanupPeqChain(this.chain);
    this.inputNode.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.outputNode.disconnect();
    this.listeners.clear();
  }
}
