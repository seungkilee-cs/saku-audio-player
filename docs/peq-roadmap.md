# Parametric EQ Roadmap

## Vision & Scope
- **Goal**: Deliver a browser-native, parametric equalizer that mirrors professional desktop workflows while remaining deployable as a static SPA.
- **Core Principles**: Web Audio API implementation, 10-band AutoEq-compatible layout, real-time responsiveness, preset portability, and accessibility across desktop/mobile.
- **Success Metric**: By Phase 8, end users can load/headphone presets, visualize impact, and retain settings across sessions on any major browser.

## Feature Progression

### Phase 0 · Environment Baseline (Complete)
- **What we build**: Project hygiene checks (install, lint) and capture baseline performance metrics (bundle size, CPU usage, `audioContext.outputLatency`).
- **User milestone**: None. Internal team records current player behaviour to compare against future PEQ-enabled builds.

### Phase 1 · Audio Infrastructure & Preamp Backbone
- **What we build**: Global PEQ state in `PlaybackContext`, canonical `BAND_LAYOUT`, `createPeqChain()` with preamp + 10 filters, track lifecycle cleanup, gesture-to-resume handling.
- **User milestone**: With EQ bypassed (all 0 dB), audio sounds identical to baseline across multiple tracks and formats (MP3, FLAC) while Web Audio graph confirms new chain.

### Phase 2 · Preset Schema, Defaults & Auto Preamp
- **What we build**: `DEFAULT_PRESET` + bundled curves, validation helpers, automatic preamp calculation, UI indicators for auto/manual preamp mode.
- **User milestone**: Switching between bundled presets audibly changes tonal balance without clipping; recommended preamp updates in real time.

### Phase 3 · Interactive PEQ Panel
- **What we build**: `PeqPanel` UI with vertical gain sliders, frequency/Q controls, filter type selector, global preset/bypass/preamp controls, mobile-friendly layout & haptic cues.
- **User milestone**: Users drag sliders and immediately hear changes, reset to flat, bypass EQ, and adjust preamp from the interface on desktop or mobile.

### Phase 4 · Frequency Response Visualization
- **What we build**: `PeqResponseChart` rendering aggregated filter response via `getFrequencyResponse()`, overlaid gridlines, performance-tuned redraw cycle.
- **User milestone**: As users tweak bands, the chart updates instantly, matching perceived tonal changes (e.g., bell curves for mids, shelves for highs).

### Phase 5 · Preset Import/Export & AutoEq Compatibility
- **What we build**: Unified preset I/O utilities, format detection, AutoEq mapping, JSON export/import flows, error handling.
- **User milestone**: Users export their current EQ as JSON and import official AutoEq headphone presets to reproduce known targets without manual edits.

### Phase 6 · Local Persistence
- **What we build**: Debounced localStorage sync, quota-aware fallbacks, clear/reset controls, graceful degradation in private browsing.
- **User milestone**: After closing and reopening the player, the last-used preset, band settings, and preamp are restored automatically.

### Phase 7 · Advanced Enhancements
- **What we build**: Clipping indicator, A/B comparison shortcut, preset library management (create/duplicate/delete), optional format exports (PowerAmp, Qudelix).
- **User milestone**: Power users monitor clipping, toggle EQ instantly, and manage multiple custom presets within the UI.

### Phase 8 · Cross-Browser & Device QA
- **What we build**: Structured QA runs on Chrome, Safari (desktop/iOS), Firefox, and Android; documentation of any platform-specific adjustments.
- **User milestone**: Verified consistent behaviour and performance across all supported browsers/devices, ready for public release.

## Modular Blueprint
- **Audio Graph Layer** (`src/utils/audio/peqGraph.js`): `BAND_LAYOUT`, chain creation, parameter updates, cleanup helpers.
- **State & Presets** (`src/context/PlaybackContext.jsx`, `src/utils/peqPresets.js`): Reducer actions, preset definitions, validation, auto-preamp logic.
- **User Interface** (`src/components/PeqPanel.jsx`, `src/components/PeqResponseChart.jsx`, supporting CSS): Band controls, global controls, visualization canvas, touch/keyboard ergonomics.
- **Preset I/O** (`src/utils/peqIO.js`): Format detection, AutoEq mapping, JSON import/export, error messages.
- **Persistence Layer**: LocalStorage helpers, quota handling, reset utilities.
- **Enhancement Suite**: Clipping monitors, shortcuts, preset library management, additional format exporters.
- **QA & Tooling**: CPU/latency profiling scripts, device matrix, browser-specific workarounds.

## End-User Milestone Matrix
| Phase | Visible Feature | Validation Checklist |
| --- | --- | --- |
| 1 | Silent infrastructure | Audio identical to baseline, Web Audio graph updated |
| 2 | Bundled presets | No clipping after switching presets; auto preamp indicator responds |
| 3 | Interactive panel | Sliders affect sound instantly; mobile controls usable |
| 4 | Response chart | Graph matches audible changes with smooth redraws |
| 5 | Preset I/O | AutoEq JSON loads successfully; exports re-import without drift |
| 6 | Persistence | State survives reload; reset clears storage |
| 7 | Advanced tools | Clipping indicator and preset library operate reliably |
| 8 | Cross-browser | Behaviour confirmed on Chrome, Firefox, Safari, Android |

## Open Questions
- Do we need additional preset metadata (author, device target, versioning)?
- Should we support >10 bands or parametric shelf slopes for advanced users?
- Is a spectrum analyzer or waveform overlay required alongside the response chart?
- What analytics (if any) are necessary to monitor preset usage post-launch?

## References & Benchmarks
- **Web Audio**: `BiquadFilterNode`, `AudioContext`, `getFrequencyResponse()` (MDN).
- **Preset Ecosystem**: AutoEq repository, PowerAmp/Qudelix formats.
- **Inspirations**: `teropa/weq8`, `jorgegio/Groove-EQ`, Chrome DevTools Web Audio diagnostics.
