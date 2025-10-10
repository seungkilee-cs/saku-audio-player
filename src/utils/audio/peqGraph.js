const DEFAULT_PEAKING_Q = 1.0;
const DEFAULT_SHELF_Q = Math.SQRT1_2; // ~0.707 for Butterworth-style shelves

export const BAND_LAYOUT = [
  { freq: 60, type: "lowshelf" },
  { freq: 150, type: "peaking" },
  { freq: 400, type: "peaking" },
  { freq: 1000, type: "peaking" },
  { freq: 2400, type: "peaking" },
  { freq: 4800, type: "peaking" },
  { freq: 9600, type: "peaking" },
  { freq: 12000, type: "peaking" },
  { freq: 14000, type: "peaking" },
  { freq: 16000, type: "highshelf" },
];

function createFilterNode(audioContext, band) {
  const filter = audioContext.createBiquadFilter();
  filter.type = band.type;
  filter.frequency.value = band.frequency;
  filter.Q.value = band.Q || (band.type === "peaking" ? DEFAULT_PEAKING_Q : DEFAULT_SHELF_Q);
  filter.gain.value = band.gain || 0;
  return filter;
}

export function createPeqChain(audioContext, customBands = null) {
  if (!audioContext) {
    throw new Error("createPeqChain received an invalid AudioContext");
  }

  const preampNode = audioContext.createGain();
  preampNode.gain.value = 1; // 0 dB baseline

  // Use custom bands if provided, otherwise use default layout
  const bandsToUse = customBands || BAND_LAYOUT.map(({ freq, type }) => ({
    frequency: freq,
    type,
    gain: 0,
    Q: type === "peaking" ? DEFAULT_PEAKING_Q : DEFAULT_SHELF_Q
  }));

  const filters = bandsToUse.map((band) => createFilterNode(audioContext, band));

  let previousNode = preampNode;
  filters.forEach((filter) => {
    previousNode.connect(filter);
    previousNode = filter;
  });

  const inputNode = preampNode;
  const outputNode = filters.length > 0 ? filters[filters.length - 1] : preampNode;

  return {
    inputNode,
    outputNode,
    preampNode,
    filters,
  };
}

export function updatePeqFilters(filters = [], bands = []) {
  filters.forEach((filter, index) => {
    const band = bands[index];
    if (!band) return;

    if (typeof band.frequency === "number") {
      filter.frequency.value = band.frequency;
    }
    if (typeof band.gain === "number") {
      filter.gain.value = band.gain;
    }
    if (typeof band.Q === "number") {
      filter.Q.value = band.Q;
    }
    if (band.type && band.type !== filter.type) {
      filter.type = band.type;
    }
  });
}

export function updatePreamp(preampNode, gainDb = 0) {
  if (!preampNode) return;
  const linearGain = Math.pow(10, gainDb / 20);
  preampNode.gain.value = linearGain;
}

export function cleanupPeqChain(nodes) {
  if (!nodes) {
    return;
  }

  const { filters = [], preampNode, inputNode, outputNode } = nodes;

  filters.forEach((filter) => {
    try {
      filter.gain.cancelScheduledValues(0);
      filter.frequency.cancelScheduledValues(0);
      filter.Q.cancelScheduledValues(0);
      filter.disconnect();
    } catch (err) {
      console.warn("Failed to cleanup filter node", err);
    }
  });

  [preampNode, inputNode, outputNode].forEach((node) => {
    if (!node) return;
    try {
      node.disconnect();
    } catch (err) {
      console.warn("Failed to disconnect node", err);
    }
  });
}
