# Parametric EQ Implementation Playbook

This playbook is the companion to `docs/peq-roadmap.md`. Follow each phase sequentially; mark the checkbox after completing the milestone tests. Every step lists the command(s) to run, the files to update, and the feature it enables.

## - [x] Phase 0 · Environment Verification & Setup
- Objective: Ensure the workspace is healthy before layering PEQ features.
- Outcome: Baseline metrics captured; repository ready on a feature branch.
- Steps
  1. Install dependencies (guarantees build parity):
     ```bash
     npm install
     ```
  2. Run lint to confirm current code quality (protects against regressions):
     ```bash
     npm run lint
     ```
  3. Record baseline performance numbers for later comparison:
     - Start the dev server: `npm run dev`
     - Open Chrome Task Manager → log CPU usage during playback.
     - *Skip latency check here*: the real `AudioContext` is created in Phase 1, so capture `audioContext.outputLatency` after the graph exists.
  4. Create a working branch for PEQ work:
     ```bash
     git checkout -b feature/peq-foundation
     ```
- Milestone: Environment installs cleanly, lint passes, and baseline notes are saved in `docs/notes/peq-baseline.md` (create if absent).

## - [x] Phase 1 · Audio Infrastructure & Preamp Backbone (Roadmap Phase 1)
- Objective: Introduce the PEQ audio graph without altering audible output.
- Outcome: `MediaElementSource → preamp → 10 filters → destination` chain established with auto-resume handling.
- Steps
  1. Define PEQ state in `src/context/PlaybackContext.jsx`:
     - Add initial state keys: `peqEnabled`, `peqBypass`, `peqBands`, `preampGain`, `preampAuto`, `currentPresetName`, `peqNodes`.
     - Extend reducer with actions: `UPDATE_BAND`, `UPDATE_ALL_BANDS`, `SET_PREAMP`, `TOGGLE_PREAMP_AUTO`, `TOGGLE_BYPASS`, `LOAD_PRESET`, `STORE_PEQ_NODES`.
  2. Create audio utility module:
     ```bash
     mkdir -p src/utils/audio
     touch src/utils/audio/peqGraph.js
     ```
     - Inside `peqGraph.js`, export `BAND_LAYOUT` (10 entries) and helpers `createPeqChain()`, `updatePeqFilters()`, `updatePreamp()`, `cleanupPeqChain()` exactly as described in `docs/Parametric EQ Implementation Playbook (Revision).md`.
  3. Wire the graph in `src/components/AudioPlayer.jsx`:
     - On mount/track load: create `MediaElementSource`, build PEQ chain, connect nodes, store references via context dispatch.
     - Add gesture-to-resume logic for suspended contexts.
     - Implement cleanup in `useEffect` return.
     - Handle bypass toggle by switching connections.
  4. Optional sanity check:
     ```bash
     npm run dev
     ```
     - Open Chrome DevTools → Web Audio → verify chain.
- Milestone: Audio matches baseline, CPU remains <10%, `audioContext.state` becomes `running` after user gesture, and track switching leaves no stray nodes (verify with heap snapshots).

## - [ ] Phase 2 · Preset Schema, Defaults & Auto Preamp (Roadmap Phase 2)
- Objective: Establish reusable presets and automatic clipping protection.
- Outcome: Context seeded with `DEFAULT_PRESET`, bundled presets available, preamp auto-adjusts to positive gain boosts.
- Steps
  1. ~~Create preset utilities~~ ✅
     ```bash
     mkdir -p src/utils
     touch src/utils/peqPresets.js
     ```
     - Define `DEFAULT_PRESET`, `BUNDLED_PRESETS`, `calculateRecommendedPreamp()`, and `validatePreset()` per the revision doc.
  2. ~~Initialize context state~~ ✅
     - Import `DEFAULT_PRESET` into `PlaybackContext`.
     - Set initial `peqBands`, `preampGain`, `currentPresetName`.
     - On band changes, when `preampAuto` is true, recompute recommended preamp and dispatch `SET_PREAMP`.
  3. Display recommended preamp in the UI (temporary console log is acceptable until Phase 3). **TODO**: For now, log via `window.audioContext` / `window.peqNodes` console script.
  4. Validate presets quickly:
     ```bash
     node -e "import('./src/utils/peqPresets.js').then(m=>console.log(m.DEFAULT_PRESET))"
     ```
- Milestone: Switching between bundled presets (triggered via temporary dev buttons or console) adjusts filters, auto-preamp prevents clipping even at +12 dB boosts, and invalid preset data throws friendly errors.

## - [ ] Phase 3 · Interactive PEQ Panel (Roadmap Phase 3)
- Objective: Deliver a touch-friendly control surface for real-time adjustments.
- Outcome: Users interact with sliders, dropdowns, and global controls to shape audio instantly.
- Steps
  1. Scaffold new components:
     ```bash
     touch src/components/PeqPanel.jsx
     touch src/components/BandControl.jsx
     touch src/styles/PeqPanel.css
     ```
  2. Implement `PeqPanel` structure using the layout snippet from the revision doc (global controls + `BandGrid`).
  3. Implement `BandControl` with vertical gain slider, Q control, type selector, numeric displays; ensure slider `onInput` updates filters immediately via context.
  4. Style `PeqPanel.css` for desktop/mobile (min 44×44 px targets, focus rings, column layout that collapses on narrow screens).
  5. Hook the panel into `AudioPlayer.jsx` or a dedicated settings route so it renders alongside the player.
  6. Run the app:
     ```bash
     npm run dev
     ```
     - Test on desktop and a mobile simulator (Chrome dev tools → device toolbar) for ergonomics.
- Milestone: Slider tweaks produce immediate audible change without pops, reset/bypass works, and mobile interactions (scroll, pinch zoom) remain stable.

## - [ ] Phase 4 · Frequency Response Visualization (Roadmap Phase 4)
- Objective: Provide visual feedback that mirrors audible changes.
- Outcome: Dynamic chart shows combined filter response in real time.
- Steps
  1. Create chart component:
     ```bash
     touch src/components/PeqResponseChart.jsx
     touch src/styles/PeqResponseChart.css
     ```
  2. Use `getFrequencyResponse()` to sample ≥512 log-spaced points for each filter, combine magnitudes (sum in dB), and render an SVG or Canvas plot with frequency/dB gridlines.
  3. Subscribe to context changes to update the chart. Throttle redraws with `requestAnimationFrame`.
  4. Embed the chart above or below the slider grid in `PeqPanel`.
  5. Performance test:
     ```bash
     npm run dev
     ```
     - While dragging sliders rapidly, watch FPS meter (Chrome → Rendering panel) to ensure smooth updates.
- Milestone: Visual curve matches expected shapes (bell/shelf) and stays smooth during live adjustments.

## - [ ] Phase 5 · Preset Import/Export & AutoEq Compatibility (Roadmap Phase 5)
- Objective: Let users share presets and load popular headphone corrections.
- Outcome: JSON import/export pipeline supports native and AutoEq formats with validation.
- Steps
  1. Create preset I/O helper:
     ```bash
     touch src/utils/peqIO.js
     ```
     - Implement `detectPresetFormat()`, `serializePreset()`, `deserializePreset()`, and AutoEq mapping per revision doc.
  2. Add UI controls in `PeqPanel` (or global toolbar):
     - “Save preset” button triggers JSON download via `Blob` and hidden anchor.
     - “Load preset” button reveals visually hidden `<input type="file" accept="application/json">`.
  3. Handle errors gracefully (toast banner or inline message).
  4. Test workflows:
     ```bash
     npm run dev
     ```
     - Export a preset, re-import it, and diff JSON to confirm equality.
     - Download an AutoEq preset (e.g., Sony WH-1000XM4) and load it; verify frequencies/gains match source.
- Milestone: Users can round-trip presets and load AutoEq files without manual editing; malformed files produce descriptive errors.

## - [ ] Phase 6 · Local Persistence (Roadmap Phase 6)
- Objective: Preserve user settings between sessions with graceful fallbacks.
- Outcome: EQ state auto-saves and restores while handling storage limits and private browsing.
- Steps
  1. Implement debounced persistence in `PlaybackContext` or a dedicated hook using `setTimeout`/`clearTimeout` around `localStorage.setItem('audio-player-peq-state', json)`.
  2. Wrap writes in `try/catch` to detect `QuotaExceededError`; when caught, store minimal preset ID instead and surface a toast/console warning.
  3. On app init, attempt to load stored state; if unavailable or invalid, use `DEFAULT_PRESET`.
  4. Add “Reset saved EQ” control that clears storage and reverts UI.
  5. Verification steps:
     - Adjust sliders → refresh page → confirm state persists.
     - Clear storage via new control → refresh → confirm reset to flat.
     - Test in incognito; ensure no errors are thrown.
- Milestone: State reliably restores on reload, and the app handles storage limitations gracefully.

## - [ ] Phase 7 · Advanced Enhancements (Roadmap Phase 7)
- Objective: Elevate the experience for power users.
- Outcome: Clipping feedback, quick A/B toggling, preset library management, optional format exporters.
- Steps
  1. Add clipping monitor using an `AnalyserNode`; flash UI indicator when peaks exceed 0 dBFS even with preamp.
  2. Implement keyboard shortcuts (e.g., `B` to bypass, arrow keys to cycle presets) using global listeners.
  3. Build preset library UI (list with create/duplicate/delete); persist to localStorage or future storage service.
  4. Extend `peqIO.js` with converters for PowerAmp/Qudelix if needed.
  5. Regression pass:
     ```bash
     npm run lint
     npm run dev
     ```
- Milestone: Advanced controls operate without regressions; power users can manage multiple presets and monitor clipping easily.

## - [ ] Phase 8 · Cross-Browser & Device QA (Roadmap Phase 8)
- Objective: Confirm consistent behaviour across supported platforms before release.
- Outcome: Documented QA matrix covering Chrome, Firefox, Safari (macOS/iOS), and Android.
- Steps
  1. Build production bundle for testing:
     ```bash
     npm run build
     ```
  2. Host locally (or via `npm run preview`) and test:
     - Safari/iOS: Verify autoplay resume, touch controls, and frequency response parity.
     - Firefox: Check filter behaviour, latency, and DevTools graph.
     - Android Chrome: Measure CPU usage, confirm sliders remain responsive, test background playback.
  3. Log findings per device/browser in `docs/qa/peq-cross-browser.md`.
- Milestone: All supported platforms validated; any issues are logged with remediation plans.

## Ongoing Workflow
- After each phase:
  - Run lint and applicable tests.
  - Update the corresponding checkbox in this document.
  - Commit with contextual message (e.g., `feat(peq): wire audio graph infrastructure`).
  - Sync `docs/peq-roadmap.md` notes if scope or milestones changed.
