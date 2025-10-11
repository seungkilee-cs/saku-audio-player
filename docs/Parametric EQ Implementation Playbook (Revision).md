# Parametric EQ Implementation Playbook (Final Revision)

## - [x] Phase 0 · Environment Verification \& Setup

- Check dependencies

```bash
npm install
npm run lint
```

Confirm the existing project installs and linting passes before adding PEQ logic.
- Create feature branch

```bash
git checkout -b feature/peq-foundation
```

- Performance baseline
    - Record current bundle size and memory footprint for comparison
    - Measure baseline CPU usage during audio playback
    - Document AudioContext latency with `audioContext.outputLatency` (target: <50ms)
- Testing milestone
    - Environment installs cleanly
    - Linting passes
    - Baseline metrics documented for Phase 8 comparison

*

## - [ ] Phase 1 · Audio Infrastructure \& Preamp Backbone

### Context Wiring (`src/context/PlaybackContext.jsx`)

1. Extend initial state with:

```js
{
  peqEnabled: true,
  peqBypass: false,
  peqBands: [], // Will be populated from DEFAULT_PRESET
  preampGain: 0,
  preampAuto: true, // Auto-calculate vs manual override
  currentPresetName: "Flat",
  peqNodes: null // Store node references for cleanup
}
```

2. Add reducer actions:
    - `UPDATE_BAND` - Modify single band parameters
    - `UPDATE_ALL_BANDS` - Load preset atomically
    - `SET_PREAMP` - Manual preamp adjustment
    - `TOGGLE_PREAMP_AUTO` - Switch auto-calculation
    - `TOGGLE_BYPASS` - Enable/disable EQ processing
    - `LOAD_PRESET` - Apply complete preset with metadata
    - `STORE_PEQ_NODES` - Cache node references for cleanup

### Graph Utility (`src/utils/audio/peqGraph.js`)

1. Define canonical band layout (10 bands for AutoEq compatibility):

```js
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
  { freq: 16000, type: "highshelf" }
];
```

2. Implement chain creation:

```js
export function createPeqChain(audioContext) {
  const preampNode = audioContext.createGain();
  preampNode.gain.value = 1.0; // 0dB default
  
  const filters = BAND_LAYOUT.map(({ freq, type }) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.gain.value = 0; // Flat initially
    filter.Q.value = type === "peaking" ? 1.0 : 0.707; // Standard Q values
    return filter;
  });
  
  // Chain: preamp → filter[0] → filter[1] → ... → filter[9]
  let previousNode = preampNode;
  filters.forEach(filter => {
    previousNode.connect(filter);
    previousNode = filter;
  });
  
  return {
    inputNode: preampNode,
    outputNode: filters[filters.length - 1],
    preampNode,
    filters
  };
}
```

3. Implement parameter updates:

```js
export function updatePeqFilters(filters, bands) {
  filters.forEach((filter, index) => {
    if (bands[index]) {
      filter.frequency.value = bands[index].frequency;
      filter.gain.value = bands[index].gain;
      filter.Q.value = bands[index].Q;
      filter.type = bands[index].type;
    }
  });
}

export function updatePreamp(preampNode, gainDb) {
  // Convert dB to linear gain
  preampNode.gain.value = Math.pow(10, gainDb / 20);
}
```

4. Implement cleanup:

```js
export function cleanupPeqChain({ filters, preampNode, inputNode, outputNode }) {
  // Cancel any scheduled parameter automation
  filters.forEach(filter => {
    filter.gain.cancelScheduledValues(0);
    filter.frequency.cancelScheduledValues(0);
    filter.Q.cancelScheduledValues(0);
    filter.disconnect();
  });
  
  preampNode?.disconnect();
  inputNode?.disconnect();
  outputNode?.disconnect();
  
  // Clear array to allow GC
  filters.length = 0;
}
```


### Player Integration (`src/components/AudioPlayer.jsx`)

1. On component mount / track load:

```js
useEffect(() => {
  if (!audioElement || !audioContext) return;
  
  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    const resumeContext = () => {
      audioContext.resume();
      document.removeEventListener('click', resumeContext);
    };
    document.addEventListener('click', resumeContext);
  }
  
  const sourceNode = audioContext.createMediaElementSource(audioElement);
  const peqChain = createPeqChain(audioContext);
  
  // Connect: source → PEQ chain → destination
  sourceNode.connect(peqChain.inputNode);
  peqChain.outputNode.connect(audioContext.destination);
  
  // Store nodes for cleanup and updates
  dispatch({ type: 'STORE_PEQ_NODES', payload: peqChain });
  
  // Apply current EQ state
  updatePeqFilters(peqChain.filters, state.peqBands);
  updatePreamp(peqChain.preampNode, state.preampGain);
  
  return () => cleanupPeqChain(peqChain);
}, [audioElement, audioContext]);
```

2. Handle bypass toggling:

```js
useEffect(() => {
  if (!sourceNode || !peqNodes || !audioContext) return;
  
  if (state.peqBypass) {
    // Direct connection: source → destination
    sourceNode.disconnect();
    sourceNode.connect(audioContext.destination);
  } else {
    // Through EQ: source → PEQ → destination
    sourceNode.disconnect();
    sourceNode.connect(peqNodes.inputNode);
  }
}, [state.peqBypass]);
```


### Testing Milestone (M1)

- Graph verification: Open Chrome DevTools → Web Audio panel
    - Verify chain: `MediaElementSource → Gain (preamp) → BiquadFilter × 10 → Destination`
    - Toggle bypass and confirm routing changes
- AudioContext state:
    - After first user interaction, `audioContext.state === "running"`
    - Confirm gesture-to-resume works on fresh page load
- Performance:
    - CPU usage <10% during playback with PEQ active (check Task Manager)
    - Test with MP3 (44.1kHz) and FLAC (96kHz) files
    - Measure and document `audioContext.outputLatency` (target: <50ms)
- Stability:
    - Switch tracks 5+ times and verify old nodes disconnect (no heap growth)
    - Open DevTools Memory profiler and take heap snapshots to confirm cleanup
- Audio quality: Play reference track and confirm no audible artifacts with flat EQ (all bands 0dB)

*

## - [ ] Phase 2 · Preset Schema, Band Defaults \& Preamp Logic

### Schema Definition (`src/utils/peqPresets.js`)

1. Define preset structure:

```js
export const DEFAULT_PRESET = {
  name: "Flat",
  description: "No equalization - natural sound",
  version: "1.0",
  preamp: 0,
  bands: BAND_LAYOUT.map(({ freq, type }) => ({
    frequency: freq,
    type,
    gain: 0,
    Q: type === "peaking" ? 1.0 : 0.707
  }))
};

export const BUNDLED_PRESETS = {
  FLAT: DEFAULT_PRESET,
  
  BASS_BOOST: {
    name: "Bass Boost",
    description: "Enhanced low-end for EDM and hip-hop",
    version: "1.0",
    preamp: -6, // Compensate for boosts
    bands: [
      { frequency: 60, type: "lowshelf", gain: 6, Q: 0.707 },
      { frequency: 150, type: "peaking", gain: 4, Q: 1.0 },
      { frequency: 400, type: "peaking", gain: 0, Q: 1.0 },
      // ... remaining bands
    ]
  },
  
  VOCAL_CLARITY: {
    name: "Vocal Clarity",
    description: "Boost presence for podcasts and vocals",
    version: "1.0",
    preamp: -4,
    bands: [
      { frequency: 60, type: "lowshelf", gain: -2, Q: 0.707 },
      { frequency: 150, type: "peaking", gain: 0, Q: 1.0 },
      { frequency: 400, type: "peaking", gain: 2, Q: 1.2 },
      { frequency: 1000, type: "peaking", gain: 3, Q: 1.5 },
      { frequency: 2400, type: "peaking", gain: 4, Q: 1.2 },
      { frequency: 4800, type: "peaking", gain: 2, Q: 1.0 },
      // ... remaining bands
    ]
  }
};
```

2. Implement preamp calculation:

```js
export function calculateRecommendedPreamp(bands) {
  const maxPositiveGain = Math.max(0, ...bands.map(b => b.gain));
  return -maxPositiveGain; // Negative to prevent clipping
}

export function validatePreset(preset) {
  if (!preset.name || !Array.isArray(preset.bands)) {
    throw new Error("Invalid preset structure");
  }
  
  preset.bands.forEach((band, idx) => {
    if (typeof band.frequency !== 'number' || band.frequency < 20 || band.frequency > 20000) {
      throw new Error(`Invalid frequency at band ${idx}: ${band.frequency}`);
    }
    if (typeof band.gain !== 'number' || band.gain < -24 || band.gain > 24) {
      throw new Error(`Invalid gain at band ${idx}: ${band.gain}`);
    }
    if (typeof band.Q !== 'number' || band.Q < 0.1 || band.Q > 10) {
      throw new Error(`Invalid Q at band ${idx}: ${band.Q}`);
    }
    if (!['peaking', 'lowshelf', 'highshelf', 'notch'].includes(band.type)) {
      throw new Error(`Invalid filter type at band ${idx}: ${band.type}`);
    }
  });
  
  return true;
}
```


### State Behavior

1. Initialize context with `DEFAULT_PRESET` on app load
2. When `preampAuto` is enabled:
    - Recalculate recommended preamp whenever any band gain changes
    - Display recommended value in UI
    - Apply automatically unless user manually overrides
3. When user manually adjusts preamp:
    - Set `preampAuto: false`
    - Show indicator that auto-compensation is disabled
    - Provide "Reset to Auto" button

### Testing Milestone (M2)

- Preset switching:
    - Load "Bass Boost" → verify all 10 bands update correctly
    - Check Web Audio panel: filter gains match preset values
    - Switch between presets rapidly → no audio glitches or stuttering
- Preamp calculation:
    - Set all bands to +12dB → recommended preamp should be -12dB
    - Apply preamp → play loud music at full volume → no audible clipping/distortion
    - Verify `preampNode.gain.value === Math.pow(10, -12/20)` (~0.251)
- Frequency accuracy:
    - Use spectrum analyzer tool (online or browser extension)
    - Play pink noise through "Bass Boost" preset
    - Confirm low-frequency boost visible at ~60-150Hz
- Validation:
    - Attempt to load invalid preset with gain = 999 → graceful error message
    - Load preset with only 5 bands → remaining 5 bands zeroed out correctly

*

## - [ ] Phase 3 · PEQ Panel UI \& Interaction

### Component Structure (`src/components/PeqPanel.jsx`)

1. Layout hierarchy:

```jsx
<PeqPanel>
  <GlobalControls>
    <PresetSelector presets={BUNDLED_PRESETS} />
    <BypassToggle />
    <PreampControl auto={preampAuto} recommended={recommendedPreamp} />
    <ResetButton />
  </GlobalControls>
  
  <BandGrid>
    {bands.map((band, index) => (
      <BandControl
        key={index}
        band={band}
        onChange={(updates) => handleBandUpdate(index, updates)}
      />
    ))}
  </BandGrid>
</PeqPanel>
```

2. BandControl component (individual band):

```jsx
<BandControl>
  <FrequencyLabel>{frequency}Hz</FrequencyLabel>
  <GainSlider
    vertical
    min={-12}
    max={12}
    step={0.1}
    value={gain}
    onChange={(e) => handleGainChange(parseFloat(e.target.value))}
  />
  <GainDisplay>{gain.toFixed(1)} dB</GainDisplay>
  <QSlider
    min={0.4}
    max={5.0}
    step={0.01}
    value={Q}
    onChange={(e) => handleQChange(parseFloat(e.target.value))}
    disabled={type !== "peaking"}
  />
  <TypeSelector value={type} options={["peaking", "lowshelf", "highshelf", "notch"]} />
</BandControl>
```


### Interaction Model

1. Immediate audio parameter updates (no debouncing):

```js
function handleGainChange(bandIndex, newGain) {
  // Update Web Audio node immediately
  if (peqNodes?.filters[bandIndex]) {
    peqNodes.filters[bandIndex].gain.value = newGain;
  }
  
  // Update React state (will re-render UI)
  dispatch({ type: 'UPDATE_BAND', payload: { index: bandIndex, gain: newGain } });
  
  // Recalculate recommended preamp if auto-enabled
  if (state.preampAuto) {
    const newPreamp = calculateRecommendedPreamp(updatedBands);
    dispatch({ type: 'SET_PREAMP', payload: newPreamp });
    updatePreamp(peqNodes.preampNode, newPreamp);
  }
  
  // Schedule debounced operations (non-audio)
  scheduleChartUpdate();
  scheduleStorageSave();
}
```

2. Debounced operations (500ms delay):

```js
const debouncedChartUpdate = useMemo(
  () => debounce(() => updateFrequencyChart(), 500),
  []
);

const debouncedStorageSave = useMemo(
  () => debounce(() => saveToLocalStorage(), 500),
  []
);
```

3. Optional haptic feedback (mobile):

```js
function triggerHaptic() {
  if ('vibrate' in navigator && isMobileDevice()) {
    navigator.vibrate(10); // 10ms pulse
  }
}
```


### Styling \& Accessibility (`src/styles/PeqPanel.css`)

1. Touch targets:

```css
.band-slider {
  min-width: 44px;
  min-height: 44px;
  touch-action: none; /* Prevent scroll interference */
}
```

2. Focus states (WCAG AA compliant):

```css
.band-slider:focus {
  outline: 2px solid #4a90e2;
  outline-offset: 2px;
}

.band-slider:focus:not(:focus-visible) {
  outline: none;
}
```

3. Responsive layout:

```css
.band-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 16px;
}

@media (max-width: 768px) {
  .band-grid {
    grid-template-columns: repeat(5, 1fr); /* 2 rows of 5 */
    gap: 12px;
  }
}

@media (orientation: portrait) and (max-width: 480px) {
  .band-grid {
    grid-template-columns: repeat(2, 1fr); /* Vertical scroll */
  }
}
```

4. Keyboard navigation:
    - Arrow keys: Fine-tune slider values (±0.1dB)
    - Shift + Arrow keys: Coarse adjustment (±1.0dB)
    - Tab: Navigate between controls
    - Space/Enter: Activate buttons
    - `B` key: Toggle bypass (global)

### Testing Milestone (M3)

- Responsiveness:
    - Drag gain slider rapidly up/down → audio responds instantly without pops/clicks
    - Adjust Q value while tone plays → hear bandwidth change smoothly
    - Use keyboard arrows → verify fine/coarse control works
- Extreme values:
    - Set all bands to +12dB → verify preamp auto-adjusts to -12dB
    - Play loud music → no distortion or clipping artifacts
    - Set all bands to -12dB → music should be very quiet but clean
- Mobile ergonomics (test on real devices):
    - iPhone: Vertical sliders respond to touch, haptics trigger (if enabled)
    - Android: Pinch zoom disabled on sliders, no accidental scrolling
    - Tablet: Landscape orientation shows all 10 bands without scrolling
- Accessibility:
    - Use keyboard only (no mouse) → all controls reachable and operable
    - Screen reader test (VoiceOver/TalkBack) → slider values announced
    - High contrast mode → focus indicators visible

*

## - [ ] Phase 4 · Frequency Response Visualization

### Component Implementation (`src/components/PeqResponseChart.jsx`)

1. Canvas setup:

```jsx
function PeqResponseChart({ bands, width = 800, height = 300 }) {
  const canvasRef = useRef(null);
  const [frequencyData, setFrequencyData] = useState(null);
  
  // Sample frequency response
  useEffect(() => {
    if (!peqNodes?.filters) return;
    
    const numPoints = 512;
    const frequencies = new Float32Array(numPoints);
    const magnitudeResponse = new Float32Array(numPoints);
    const phaseResponse = new Float32Array(numPoints);
    
    // Logarithmic frequency distribution (20Hz - 20kHz)
    for (let i = 0; i < numPoints; i++) {
      frequencies[i] = 20 * Math.pow(1000, i / numPoints); // 20Hz to 20kHz log scale
    }
    
    // Initialize combined magnitude to 0dB (1.0 linear)
    const combinedMagnitude = new Float32Array(numPoints).fill(1.0);
    
    // Multiply magnitude responses from all filters
    peqNodes.filters.forEach(filter => {
      filter.getFrequencyResponse(frequencies, magnitudeResponse, phaseResponse);
      
      for (let i = 0; i < numPoints; i++) {
        combinedMagnitude[i] *= magnitudeResponse[i];
      }
    });
    
    // Convert to dB
    const magnitudeDb = Array.from(combinedMagnitude, mag => 20 * Math.log10(mag));
    
    setFrequencyData({ frequencies: Array.from(frequencies), magnitudeDb });
  }, [bands, peqNodes]);
  
  return <canvas ref={canvasRef} width={width} height={height} />;
}
```

2. Rendering logic:

```js
useEffect(() => {
  if (!frequencyData || !canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const { frequencies, magnitudeDb } = frequencyData;
  
  // Clear canvas
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  drawGrid(ctx, canvas.width, canvas.height);
  
  // Draw frequency response curve
  ctx.strokeStyle = '#4a90e2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  const padding = 40;
  const graphWidth = canvas.width - 2 * padding;
  const graphHeight = canvas.height - 2 * padding;
  const dbRange = 24; // -12dB to +12dB
  
  frequencies.forEach((freq, i) => {
    // Logarithmic X position
    const xPos = padding + (Math.log10(freq / 20) / Math.log10(1000)) * graphWidth;
    
    // Linear Y position (dB)
    const yPos = padding + graphHeight / 2 - (magnitudeDb[i] / dbRange) * graphHeight;
    
    if (i === 0) {
      ctx.moveTo(xPos, yPos);
    } else {
      ctx.lineTo(xPos, yPos);
    }
  });
  
  ctx.stroke();
  
  // Draw band markers
  bands.forEach(band => {
    const xPos = padding + (Math.log10(band.frequency / 20) / Math.log10(1000)) * graphWidth;
    ctx.fillStyle = band.gain > 0 ? '#4ade80' : (band.gain < 0 ? '#f87171' : '#94a3b8');
    ctx.beginPath();
    ctx.arc(xPos, padding + graphHeight / 2 - (band.gain / dbRange) * graphHeight, 4, 0, 2 * Math.PI);
    ctx.fill();
  });
  
}, [frequencyData, bands]);
```

3. Grid and labels:

```js
function drawGrid(ctx, width, height) {
  const padding = 40;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  
  // Frequency grid lines (logarithmic)
  [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(freq => {
    const x = padding + (Math.log10(freq / 20) / Math.log10(1000)) * (width - 2 * padding);
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const label = freq >= 1000 ? `${freq / 1000}k` : freq;
    ctx.fillText(label, x, height - padding + 15);
  });
  
  // dB grid lines
  [-12, -6, 0, 6, 12].forEach(db => {
    const y = padding + (height - 2 * padding) / 2 - (db / 24) * (height - 2 * padding);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, padding - 5, y + 3);
  });
}
```

4. Frame-synchronized updates:

```js
let updateScheduled = false;

function scheduleChartUpdate() {
  if (updateScheduled) return;
  
  updateScheduled = true;
  requestAnimationFrame(() => {
    // Trigger re-render (React will handle actual redraw)
    setRefreshTrigger(prev => prev + 1);
    updateScheduled = false;
  });
}
```


### Testing Milestone (M4)

- Curve accuracy:
    - Set 60Hz lowshelf to +6dB → verify curve shows shelf shape rising at low frequencies
    - Set 1kHz peaking to -6dB, Q=2.0 → verify narrow dip at 1kHz
    - Set 16kHz highshelf to +6dB → verify shelf shape rising at high frequencies
    - Compare visual curve against reference EQ charts from audio engineering resources
- Real-time responsiveness:
    - Drag gain slider → chart updates smoothly synchronized with audio
    - Measure frame rate with DevTools Performance tab → should maintain 60 FPS
    - Rapid slider changes → chart should never lag >1 frame behind
- Visual clarity:
    - Band markers clearly visible at expected frequencies
    - Grid labels readable at all zoom levels
    - Color coding (green=boost, red=cut) intuitive
- Performance:
    - Profile chart rendering → should take <5ms per frame
    - No memory leaks after 100+ chart updates (check heap snapshots)

*

## - [ ] Phase 5 · Preset Import/Export \& AutoEq Compatibility

### Storage Key Convention (`src/constants/storage.js`)

```js
export const STORAGE_PREFIX = "saku-player"; // Replace with your app name
export const STORAGE_KEYS = {
  PEQ_STATE: `${STORAGE_PREFIX}-peq-state`,
  PRESET_LIBRARY: `${STORAGE_PREFIX}-preset-library`,
  USER_PREFERENCES: `${STORAGE_PREFIX}-prefs`
};
```


### Format Detection \& Conversion (`src/utils/peqIO.js`)

1. Format detection:

```js
export function detectPresetFormat(json) {
  // AutoEq format detection
  if (json.preamp !== undefined && 
      Array.isArray(json.filters) && 
      json.filters[0]?.fc !== undefined) {
    return 'autoeq';
  }
  
  // Native format
  if (json.name && 
      Array.isArray(json.bands) && 
      json.bands[0]?.frequency !== undefined) {
    return 'native';
  }
  
  // Legacy PowerAmp format
  if (json.EQSettings && Array.isArray(json.EQSettings.bands)) {
    return 'poweramp';
  }
  
  throw new Error('Unknown preset format. Supported: Native, AutoEq, PowerAmp');
}
```

2. AutoEq to Native conversion (Option A: Fixed Layout with Nearest-Neighbor Mapping):

```js
export function convertAutoEqToNative(autoEqPreset) {
  // AutoEq format: { preamp, filters: [{ type, fc, Q, gain }, ...] }
  
  const nativeBands = BAND_LAYOUT.map(layoutBand => {
    // Find closest AutoEq filter by frequency
    const nearestFilter = autoEqPreset.filters.reduce((closest, filter) => {
      const currentDist = Math.abs(Math.log(filter.fc) - Math.log(layoutBand.freq));
      const closestDist = Math.abs(Math.log(closest.fc) - Math.log(layoutBand.freq));
      return currentDist < closestDist ? filter : closest;
    });
    
    // Map to native format, preserving filter type preference
    return {
      frequency: layoutBand.freq, // Use fixed layout frequency
      type: nearestFilter.type.toLowerCase(), // AutoEq uses "PK", "LSC", "HSC"
      gain: nearestFilter.gain,
      Q: nearestFilter.Q
    };
  });
  
  return {
    name: autoEqPreset.name || "Imported AutoEq",
    description: `AutoEq preset - frequencies mapped to nearest standard bands`,
    version: "1.0",
    preamp: autoEqPreset.preamp || 0,
    bands: nativeBands,
    source: "autoeq",
    originalFrequencies: autoEqPreset.filters.map(f => f.fc) // Track original for reference
  };
}
```

3. Native to AutoEq export:

```js
export function convertNativeToAutoEq(nativePreset) {
  return {
    name: nativePreset.name,
    preamp: nativePreset.preamp,
    filters: nativePreset.bands
      .filter(band => Math.abs(band.gain) > 0.01) // Skip flat bands
      .map(band => ({
        type: band.type.toUpperCase() === 'PEAKING' ? 'PK' :
              band.type.toUpperCase() === 'LOWSHELF' ? 'LSC' :
              band.type.toUpperCase() === 'HIGHSHELF' ? 'HSC' : 'PK',
        fc: band.frequency,
        Q: band.Q,
        gain: band.gain
      }))
  };
}
```

4. PowerAmp format support (bonus):

```js
export function convertPowerAmpToNative(powerAmpPreset) {
  // PowerAmp uses different structure: { EQSettings: { bands: [...], preamp: ... } }
  const bands = powerAmpPreset.EQSettings.bands.map((band, index) => ({
    frequency: BAND_LAYOUT[index]?.freq || 1000,
    type: index === 0 ? 'lowshelf' : 
          index === BAND_LAYOUT.length - 1 ? 'highshelf' : 'peaking',
    gain: band.gain,
    Q: band.Q || 1.0
  }));
  
  return {
    name: powerAmpPreset.name || "PowerAmp Preset",
    description: "Imported from PowerAmp",
    version: "1.0",
    preamp: powerAmpPreset.EQSettings.preamp || 0,
    bands
  };
}
```


### Export Flow

1. Save as Native JSON:

```js
export function exportPresetAsJSON(preset) {
  const json = JSON.stringify(preset, null, 2); // Pretty-print with 2-space indent
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${sanitizeFilename(preset.name)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  
  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}
```

2. Export as AutoEq format:

```js
export function exportPresetAsAutoEq(nativePreset) {
  const autoEqFormat = convertNativeToAutoEq(nativePreset);
  const json = JSON.stringify(autoEqFormat, null, 2);
  
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${sanitizeFilename(nativePreset.name)}_autoeq.json`;
  document.body.appendChild(anchor);
  anchor.click();
  
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
```


### Import Flow

1. File upload handler:

```jsx
function PresetImport({ onLoad }) {
  const fileInputRef = useRef(null);
  
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      // Detect format and convert to native
      const format = detectPresetFormat(json);
      let nativePreset;
      
      switch (format) {
        case 'autoeq':
          nativePreset = convertAutoEqToNative(json);
          break;
        case 'poweramp':
          nativePreset = convertPowerAmpToNative(json);
          break;
        case 'native':
          nativePreset = json;
          break;
      }
      
      // Validate before loading
      validatePreset(nativePreset);
      
      // Load atomically using React 18 transition
      startTransition(() => {
        onLoad(nativePreset);
      });
      
      showToast(`Loaded "${nativePreset.name}" (${format} format)`, 'success');
      
    } catch (error) {
      console.error('Import failed:', error);
      showToast(`Import failed: ${error.message}`, 'error');
    }
    
    // Reset input for re-uploads
    event.target.value = '';
  };
  
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <button onClick={() => fileInputRef.current?.click()}>
        Load Preset
      </button>
    </>
  );
}
```

2. Drag-and-drop support (bonus):

```jsx
function useDragAndDrop(onDrop) {
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
    
    const handleDrop = async (e) => {
      e.preventDefault();
      
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/json') {
        const text = await file.text();
        const json = JSON.parse(text);
        onDrop(json);
      }
    };
    
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [onDrop]);
}
```


### Testing Milestone (M5)

- Round-trip accuracy:
    - Create custom preset with specific values (e.g., 1kHz = +3.7dB, Q=1.23)
    - Export as native JSON → Import → Verify all values match exactly (to 0.01 precision)
    - Export as AutoEq format → Import into another tool → Verify compatibility
- AutoEq preset validation:
    - Download official AutoEq preset from GitHub (e.g., `Sennheiser HD 650.json`)
    - Import into app → Verify frequencies map to nearest BAND_LAYOUT positions
    - Play audio with headphones → Subjective improvement in tonal balance
    - Compare loaded values against original JSON → Document any frequency mapping differences
- Format detection:
    - Test with AutoEq file → correctly detected and converted
    - Test with PowerAmp file → correctly detected and converted
    - Test with invalid JSON → graceful error message, state unchanged
    - Test with valid JSON but wrong schema → helpful error explaining format mismatch
- Error handling:
    - Upload file with gain=999 → validation error, preset not loaded
    - Upload file with frequency=0 → validation error shown
    - Upload file mid-playback → no audio glitches during import
- Real headphone testing:
    - Load AutoEq preset for owned headphones
    - A/B compare with bypass using reference tracks (vocals, acoustic instruments)
    - Verify perceived frequency response matches AutoEq's target (more neutral/flat)

*

## - [ ] Phase 6 · Local Persistence \& Preset Library

### Auto-Save Implementation

1. Debounced state serialization:

```js
import { STORAGE_KEYS } from '../constants/storage';

// In PlaybackContext or custom hook
const debouncedSave = useMemo(
  () => debounce((state) => {
    try {
      const serialized = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        preset: {
          name: state.currentPresetName,
          preamp: state.preampGain,
          preampAuto: state.preampAuto,
          bands: state.peqBands,
          bypass: state.peqBypass
        }
      };
      
      const json = JSON.stringify(serialized);
      localStorage.setItem(STORAGE_KEYS.PEQ_STATE, json);
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, storing minimal state');
        
        // Fallback: only store preset name and bypass state
        const minimal = JSON.stringify({
          presetName: state.currentPresetName,
          bypass: state.peqBypass
        });
        
        try {
          localStorage.setItem(STORAGE_KEYS.PEQ_STATE, minimal);
        } catch (e) {
          console.error('Unable to save EQ state:', e);
          showToast('Unable to save EQ settings (storage full)', 'warning');
        }
      } else {
        console.error('Failed to save EQ state:', error);
      }
    }
  }, 500),
  []
);

// Trigger on state changes
useEffect(() => {
  if (state.peqBands.length > 0) {
    debouncedSave(state);
  }
}, [state.peqBands, state.preampGain, state.peqBypass]);
```

2. Load on initialization:

```js
function loadSavedState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PEQ_STATE);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Validate version compatibility
    if (parsed.version !== "1.0") {
      console.warn('Incompatible saved state version, using defaults');
      return null;
    }
    
    // Validate structure
    if (!parsed.preset || !Array.isArray(parsed.preset.bands)) {
      console.warn('Invalid saved state structure, using defaults');
      return null;
    }
    
    // Validate each band
    validatePreset(parsed.preset);
    
    return parsed.preset;
    
  } catch (error) {
    console.error('Failed to load saved EQ state:', error);
    return null;
  }
}

// In context initialization
const initialState = {
  ...defaultState,
  ...(loadSavedState() || { bands: DEFAULT_PRESET.bands })
};
```


### Preset Library Management

1. Library storage structure:

```js
// Stored in localStorage under STORAGE_KEYS.PRESET_LIBRARY
{
  version: "1.0",
  presets: [
    {
      id: "uuid-1",
      name: "My Bass Boost",
      created: "2025-10-06T14:30:00Z",
      modified: "2025-10-06T15:45:00Z",
      preset: { /* full preset data */ }
    },
    // ... more presets
  ]
}
```

2. Library operations:

```js
export function usePresetLibrary() {
  const [library, setLibrary] = useState({ presets: [] });
  
  // Load library on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRESET_LIBRARY);
      if (stored) {
        setLibrary(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load preset library:', error);
    }
  }, []);
  
  // Save library to storage
  const saveLibrary = useCallback((newLibrary) => {
    try {
      const json = JSON.stringify(newLibrary);
      localStorage.setItem(STORAGE_KEYS.PRESET_LIBRARY, json);
      setLibrary(newLibrary);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage full. Delete old presets to make room.');
      }
      throw error;
    }
  }, []);
  
  const addPreset = useCallback((preset) => {
    const newEntry = {
      id: crypto.randomUUID(),
      name: preset.name,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      preset
    };
    
    saveLibrary({
      version: "1.0",
      presets: [...library.presets, newEntry]
    });
  }, [library, saveLibrary]);
  
  const updatePreset = useCallback((id, updatedPreset) => {
    const updated = library.presets.map(entry =>
      entry.id === id
        ? { ...entry, preset: updatedPreset, modified: new Date().toISOString() }
        : entry
    );
    
    saveLibrary({ ...library, presets: updated });
  }, [library, saveLibrary]);
  
  const deletePreset = useCallback((id) => {
    const filtered = library.presets.filter(entry => entry.id !== id);
    saveLibrary({ ...library, presets: filtered });
  }, [library, saveLibrary]);
  
  const duplicatePreset = useCallback((id) => {
    const original = library.presets.find(entry => entry.id === id);
    if (!original) return;
    
    const duplicate = {
      ...original.preset,
      name: `${original.preset.name} (Copy)`
    };
    
    addPreset(duplicate);
  }, [library, addPreset]);
  
  return {
    presets: library.presets,
    addPreset,
    updatePreset,
    deletePreset,
    duplicatePreset
  };
}
```

3. Clear all saved data:

```jsx
function ClearDataButton() {
  const handleClear = () => {
    if (confirm('Clear all saved EQ settings and presets? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEYS.PEQ_STATE);
      localStorage.removeItem(STORAGE_KEYS.PRESET_LIBRARY);
      
      // Reset to defaults
      dispatch({ type: 'LOAD_PRESET', payload: DEFAULT_PRESET });
      
      showToast('All EQ data cleared', 'info');
    }
  };
  
  return <button onClick={handleClear}>Clear Saved EQ Data</button>;
}
```


### Testing Milestone (M6)

- Persistence across sessions:
    - Adjust multiple bands to unique values
    - Close browser tab completely (not just refresh)
    - Reopen app → verify all settings restored exactly
    - Check Web Audio panel → filters show correct parameters
- Storage limit handling:
    - Fill localStorage to near-capacity (save many large presets)
    - Attempt to save another preset → graceful error message shown
    - Existing data remains intact, app continues functioning
    - Delete old presets → verify space reclaimed and new saves work
- Private/Incognito mode:
    - Open app in incognito window
    - Adjust EQ settings → verify they work during session
    - Close and reopen incognito → settings reset to defaults (expected behavior)
    - No console errors or crashes related to storage
- Clear functionality:
    - Save several custom presets to library
    - Click "Clear Saved EQ Data"
    - Refresh page → defaults restored, library empty
    - localStorage inspector shows keys removed
- Library operations:
    - Save 5 different presets to library
    - Switch between them → instant loading, audio updates correctly
    - Duplicate a preset → verify copy created with "(Copy)" suffix
    - Delete a preset → confirm removal from list
    - Modify and re-save existing preset → "modified" timestamp updates

*

## - [ ] Phase 7 · Advanced Enhancements

### Clipping Indicator

1. Implementation:

```js
function useClippingDetector(audioContext, sourceNode) {
  const [isClipping, setIsClipping] = useState(false);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  
  useEffect(() => {
    if (!audioContext || !sourceNode) return;
    
    // Create analyser node
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    
    // Connect in parallel (doesn't affect audio path)
    sourceNode.connect(analyser);
    analyserRef.current = analyser;
    
    const dataArray = new Uint8Array(analyser.fftSize);
    let clippingFrames = 0;
    
    // Monitor in animation loop
    function checkClipping() {
      analyser.getByteTimeDomainData(dataArray);
      
      // Check for values at or near max (127-128 for signed byte)
      const hasClipping = dataArray.some(value => {
        const normalized = (value - 128) / 128.0; // -1 to +1
        return Math.abs(normalized) > 0.99;
      });
      
      if (hasClipping) {
        clippingFrames++;
        if (clippingFrames > 3) { // Sustained clipping
          setIsClipping(true);
        }
      } else {
        clippingFrames = 0;
        setIsClipping(false);
      }
      
      animationRef.current = requestAnimationFrame(checkClipping);
    }
    
    checkClipping();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      analyser.disconnect();
    };
  }, [audioContext, sourceNode]);
  
  return isClipping;
}

// UI component
function ClippingIndicator({ isClipping }) {
  return (
    <div className={`clipping-indicator ${isClipping ? 'active' : ''}`}>
      {isClipping && (
        <>
          <WarningIcon />
          <span>Clipping detected - reduce gain or preamp</span>
        </>
      )}
    </div>
  );
}
```


### Keyboard Shortcuts

1. Global shortcuts:

```js
function useKeyboardShortcuts(actions) {
  useEffect(() => {
    function handleKeyPress(event) {
      // Don't trigger if user is typing in input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (event.key.toLowerCase()) {
        case 'b':
          actions.toggleBypass();
          showToast(state.peqBypass ? 'EQ Enabled' : 'EQ Bypassed', 'info');
          break;
          
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            actions.resetToFlat();
            showToast('Reset to flat EQ', 'info');
          }
          break;
          
        case '[':
          actions.previousPreset();
          break;
          
        case ']':
          actions.nextPreset();
          break;
          
        case '0':
          actions.loadPreset('FLAT');
          break;
          
        // Number keys 1-9 for quick preset access
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          const presetIndex = parseInt(event.key) - 1;
          if (presetLibrary[presetIndex]) {
            actions.loadPreset(presetLibrary[presetIndex]);
          }
          break;
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [actions, state, presetLibrary]);
}
```


### A/B Comparison Mode

1. Implementation with memory:

```js
function useABComparison() {
  const [stateA, setStateA] = useState(null);
  const [stateB, setStateB] = useState(null);
  const [activeState, setActiveState] = useState('A');
  
  const captureA = useCallback((currentState) => {
    setStateA({
      preamp: currentState.preampGain,
      bands: [...currentState.peqBands],
      name: currentState.currentPresetName
    });
    setActiveState('A');
  }, []);
  
  const captureB = useCallback((currentState) => {
    setStateB({
      preamp: currentState.preampGain,
      bands: [...currentState.peqBands],
      name: currentState.currentPresetName
    });
    setActiveState('B');
  }, []);
  
  const toggleAB = useCallback(() => {
    const nextState = activeState === 'A' ? 'B' : 'A';
    const preset = nextState === 'A' ? stateA : stateB;
    
    if (preset) {
      dispatch({ type: 'LOAD_PRESET', payload: preset });
      setActiveState(nextState);
      showToast(`Switched to ${nextState}: ${preset.name}`, 'info');
    }
  }, [activeState, stateA, stateB]);
  
  return { captureA, captureB, toggleAB, activeState, canToggle: stateA && stateB };
}
```


### Preset Search \& Filter

1. Search implementation:

```jsx
function PresetLibraryBrowser({ presets, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, created, modified
  
  const filteredPresets = useMemo(() => {
    let filtered = presets.filter(preset =>
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.preset.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created) - new Date(a.created);
        case 'modified':
          return new Date(b.modified) - new Date(a.modified);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [presets, searchTerm, sortBy]);
  
  return (
    <div className="preset-browser">
      <input
        type="text"
        placeholder="Search presets..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="name">Name</option>
        <option value="created">Date Created</option>
        <option value="modified">Last Modified</option>
      </select>
      
      <div className="preset-list">
        {filteredPresets.map(preset => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onSelect={() => onSelect(preset.preset)}
            onDelete={() => deletePreset(preset.id)}
            onDuplicate={() => duplicatePreset(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}
```


### Export Additional Formats

1. PowerAmp export:

```js
export function exportAsPowerAmp(nativePreset) {
  const powerAmpFormat = {
    name: nativePreset.name,
    EQSettings: {
      preamp: nativePreset.preamp,
      bands: nativePreset.bands.map(band => ({
        gain: band.gain,
        freq: band.frequency,
        Q: band.Q
      }))
    }
  };
  
  const json = JSON.stringify(powerAmpFormat, null, 2);
  downloadAsFile(json, `${sanitizeFilename(nativePreset.name)}_poweramp.json`);
}
```

2. Qudelix export:

```js
export function exportAsQudelix(nativePreset) {
  // Qudelix format (similar to AutoEq but specific schema)
  const qudelixFormat = {
    PresetName: nativePreset.name,
    PreAmp: nativePreset.preamp,
    PEQ: nativePreset.bands.map((band, index) => ({
      BandIndex: index,
      FilterType: band.type === 'peaking' ? 0 : band.type === 'lowshelf' ? 1 : 2,
      Frequency: band.frequency,
      Gain: band.gain,
      Q: band.Q
    }))
  };
  
  const json = JSON.stringify(qudelixFormat, null, 2);
  downloadAsFile(json, `${sanitizeFilename(nativePreset.name)}_qudelix.json`);
}
```


### Testing Milestone (M7)

- Clipping indicator:
    - Set all bands to +12dB, disable preamp auto → indicator activates immediately
    - Play loud music → red warning visible
    - Enable preamp auto → indicator clears
    - Verify indicator doesn't trigger false positives with quiet music
- Keyboard shortcuts:
    - Press `B` during playback → instant bypass toggle
    - Press `[` and `]` → cycle through presets smoothly
    - Press number keys → quick preset loading works
    - Type in search box → shortcuts disabled (no interference)
- A/B comparison:
    - Load "Bass Boost", capture as A
    - Load "Vocal Clarity", capture as B
    - Toggle A/B → instant switching, audio changes audibly
    - Verify visual indication of active state
- Preset search:
    - Add 10+ presets with varied names
    - Search for partial term → correct results filtered
    - Sort by date → most recent appears first
    - Clear search → all presets visible again
- Format exports:
    - Export as PowerAmp → load in PowerAmp app (if available) → verify compatibility
    - Export as Qudelix → verify JSON structure matches Qudelix schema documentation
    - Export as AutoEq → re-import to verify round-trip works

*

## - [ ] Phase 8 · Cross-Browser \& Device QA

### Browser Matrix

1. Chrome/Chromium (Desktop):
    - Baseline reference platform
    - Verify all features work as expected
    - Document performance metrics (CPU, memory, latency)
2. Safari (macOS):
    - Test AudioContext resume on user gesture (strict autoplay policy)
    - Verify BiquadFilterNode frequency responses match Chrome
    - Check for rendering differences in visualization canvas
    - Test with Apple Silicon and Intel Macs if possible
3. Firefox (Desktop):
    - Confirm filter responses identical to Chrome
    - Test localStorage behavior (similar quota but different implementation)
    - Verify keyboard shortcuts work (Firefox has different event handling)
4. Safari (iOS):
    - Test on iPhone and iPad (different screen sizes/orientations)
    - Verify touch targets meet 44×44px minimum
    - Test haptic feedback with `navigator.vibrate()`
    - Confirm AudioContext works with iOS silent mode switch
    - Test background playback behavior (may be restricted)
5. Chrome (Android):
    - Test on mid-range device (not just flagship)
    - Measure CPU usage during playback + EQ (target: <20% on mid-range)
    - Verify sliders responsive on 60Hz vs 120Hz displays
    - Test with different Android versions (11, 12, 13, 14)
6. Samsung Internet (bonus):
    - Large user base in certain regions
    - Chromium-based but has quirks
    - Test basic functionality

### Device Testing Checklist

Desktop (Windows/Mac/Linux):

- [ ] Audio plays through EQ chain without glitches
- [ ] Frequency response visualization renders smoothly (60 FPS)
- [ ] Keyboard shortcuts work as expected
- [ ] File import/export functional
- [ ] localStorage persistence works
- [ ] CPU usage <10% during playback

Mobile (iOS):

- [ ] Touch targets appropriately sized
- [ ] Vertical sliders respond to touch without page scrolling
- [ ] Pinch zoom disabled on EQ panel
- [ ] Orientation change preserves state
- [ ] Safari autoplay restrictions handled gracefully
- [ ] No audio dropouts when screen locks

Mobile (Android):

- [ ] Performance acceptable on mid-range device
- [ ] No thermal throttling during extended use
- [ ] Chrome Web Audio implementation matches desktop
- [ ] File picker works for importing presets
- [ ] localStorage reliable across sessions

Tablet (iPad/Android):

- [ ] Layout adapts to larger screen
- [ ] All 10 bands visible without scrolling in landscape
- [ ] Touch and keyboard input both functional
- [ ] Split-screen multitasking doesn't break audio


### Performance Budgets

Document and verify:

- Bundle size: PEQ feature adds <10KB gzipped to total bundle
- Memory usage: Heap growth <5MB after loading 10 presets
- CPU usage: <10% on desktop, <20% on mobile during active playback
- Audio latency: `audioContext.outputLatency` <50ms
- Frame rate: Visualization maintains 60 FPS during slider adjustments
- localStorage: Total storage <1MB for typical usage (10-20 presets)


### Known Limitations Documentation

Create a compatibility matrix documenting:

- Browsers that don't support Web Audio API (IE11, old mobile browsers)
- Mobile browsers with autoplay restrictions
- Browsers with limited localStorage (private mode)
- Devices with high-latency audio paths
- Any discovered quirks or workarounds


### Testing Milestone (M8)

- Cross-browser report:
    - Document test results for each browser/platform
    - Log any deviations in behavior or performance
    - Note workarounds implemented for specific browsers
- Performance validation:
    - All metrics within budget targets
    - No memory leaks detected in 1-hour stress test
    - Audio remains glitch-free under all tested conditions
- Accessibility audit:
    - WCAG 2.1 Level AA compliance verified
    - Screen reader testing completed
    - Keyboard-only navigation functional
    - Color contrast ratios meet standards
- Real-world testing:
    - 3+ people with different headphones test AutoEq presets
    - Collect feedback on perceived audio quality improvement
    - Verify subjective EQ effectiveness matches expectations

*

## Final Milestone Checklist

M0 (Phase 0): Environment ready, baseline metrics documented
M1 (Phase 1): Audio graph functional, performance acceptable, cleanup working
M2 (Phase 2): Presets load correctly, preamp prevents clipping, validation robust
M3 (Phase 3): UI responsive, mobile-friendly, accessibility compliant
M4 (Phase 4): Visualization accurate, smooth rendering, matches audio output
M5 (Phase 5): Import/export reliable, AutoEq compatible, error handling graceful
M6 (Phase 6): Persistence works, storage limits handled, library functional
M7 (Phase 7): Advanced features stable, shortcuts working, formats supported
M8 (Phase 8): Cross-browser tested, performance budgets met, documentation complete

*

## Appendix: Useful Resources

- Web Audio API Reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- BiquadFilterNode Documentation: https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
- AutoEq Repository: https://github.com/jaakkopasanen/AutoEq
- AutoEq Headphone Presets: https://github.com/jaakkopasanen/AutoEq/tree/master/results
- Chrome DevTools Audio Panel: https://developer.chrome.com/docs/devtools/webaudio
- Web Audio API Performance: https://developers.google.com/web/updates/2018/09/audio-worklet

*

## Notes on Implementation Order

This plan follows a bottom-up approach:

1. Build stable audio foundation first (can't test anything without working audio)
2. Add visual feedback early (crucial for debugging and user confidence)
3. Implement data persistence before advanced features (ensures work isn't lost)
4. Polish and optimize last (premature optimization avoided)

Each phase is independently testable, allowing for incremental delivery and early user feedback.

