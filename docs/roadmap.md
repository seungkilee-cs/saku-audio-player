# Saku Audio Player — Revamp Roadmap

Suggestions for UI improvements, new features, and performance optimizations based on the current codebase.

---

## UI / UX Revamp

### Layout & Visual Design

**Unified dark theme with glassmorphism panels**
The current sidebar panels use flat cards. Switching to translucent glass surfaces (`backdrop-filter: blur`) with subtle borders would give the app a cohesive, modern feel without overhauling the design system — just update `--surface` and shadow tokens in `design-system.css`.

**Compact / expanded layout toggle**
Add a toggle that collapses the EQ and playlist sidebars into icon-bar rails (similar to VS Code's activity bar). The center AudioPlayer would fill the full width. State can live in context or localStorage alongside existing prefs.

**Track artwork as ambient background**
The `showAmbientGlow` toggle is already in state. Extend it: blur + darken the current track's album art and use it as a full-bleed background. This is already partially wired — `PetalField.jsx` covers this role but animated SVG petals feel disconnected from the music. A real album art blur would be more cohesive.

**Consistent spacing pass**
Several components mix raw `px` values with design tokens. A one-time pass to enforce `--spacing-*` variables across all 27 CSS files would eliminate visual inconsistencies (uneven padding in `BandControl`, `TrackInfo`, `VolumeControl`).

**Sidebar resize handles**
Allow users to drag the left/right sidebar widths. Store widths in localStorage. This is especially useful when the preset library name list gets long or the AutoEQ search results are wide.

### Playlist

**Now-playing auto-scroll**
The playlist does not auto-scroll to the active track when playback advances (e.g. after shuffle or end-of-track). Add a `useEffect` in `Playlist.jsx` that calls `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on the active item ref whenever `currentTrackIndex` changes.

**Track duration in playlist rows**
`music-metadata` already parses duration. Display it right-aligned in each row (formatted as `m:ss`). This requires passing the duration through `playlistActions` and rendering it in the track row component.

**Search / filter bar**
A small text input above the playlist that filters visible tracks by title or artist (client-side, no state changes needed — just a local `useState` filter in `Playlist.jsx`).

**Bulk operations**
Select multiple tracks with Shift+click / Ctrl+click, then delete or move as a group. The reducer already supports individual remove; extend it with a `REMOVE_TRACKS` action that takes an array of indices.

**Playlist tabs / queues**
Support multiple named playlists (tabs at the top of the sidebar). Only one is "active" for playback at a time. State shape change: replace `tracks[]` with `playlists: [{ id, name, tracks[] }]` + `activePlaylistId`.

### EQ Panel

**Band frequency labels always visible**
Currently, frequency labels on `BandControl` may only show on hover. Make them permanently visible as small text below each slider — they are critical for users adjusting EQ by memory.

**Drag-to-draw EQ curve**
Allow users to click-drag directly on the `PeqResponseChart` canvas to set band gains. Map canvas X position to the nearest band frequency and Y position to gain. This is the interaction pattern used in Equalizer APO's Peace UI and would be a major UX win.

**Band enable/disable toggles**
Add a small checkbox or dot per band so users can disable individual bands without zeroing the gain. Useful for A/B comparing a single band's contribution. Requires a `enabled` field per band in the state shape.

**EQ diff view**
When loading an AutoEQ preset, show an overlay on `PeqResponseChart` of the *previous* curve in a muted color so the user can see what changed. Store the "before" state in a `lastCurve` ref inside the chart component.

**Frequency response overlay comparison**
Let users pin up to 3 saved presets as overlays on the chart simultaneously — useful when choosing between headphone EQ profiles.

### Audio Player

**Mini player mode**
When the user scrolls down or collapses both sidebars, offer a docked mini player at the bottom: just track title, play/pause, and progress bar. No layout change is needed — just conditionally render a slim bar when the main player is out of viewport (IntersectionObserver).

**Sleep timer**
A dropdown to stop playback after N minutes. Pure JS: `setTimeout(() => dispatch({ type: 'PAUSE' }), ms)`. Show a countdown badge on the controls.

**Crossfade**
On track end, fade out the current track's GainNode while fading in the next track's. Requires a second `<audio>` element and brief overlap. The GainNode is already in the Web Audio chain — add a short ramp via `gainNode.gain.linearRampToValueAtTime`.

**Replay gain / loudness normalization**
`music-metadata` exposes ReplayGain tags (`replaygain_track_gain`). Apply the track gain value to the preamp GainNode on track load. Add a toggle in settings.

---

## New Features

### Cross-Session History
Track play counts and last-played timestamps per file (keyed by filename + size hash). Show a "Recently Played" section at the top of the playlist. Persist in `localStorage["saku-history"]`.

### EQ Preset Tagging & Search
Each preset has a `name` and `description`. Add a `tags[]` field (e.g. `["bass boost", "headphones", "flat"]`) and a filter/search bar in `PresetLibrary`. No backend needed.

### Hotkey Cheat Sheet Overlay
`?` key opens a full-screen overlay listing all keyboard shortcuts. This already exists as a modal — just ensure it's triggered by `?` and that the shortcut map is single-sourced so adding a new shortcut updates both behavior and the overlay automatically.

### Export Playlist as M3U
Generate a `.m3u` file from the current playlist. Since files are local, use relative paths. Pure client-side: `Blob` + `URL.createObjectURL`. Add a button in the playlist header.

### Waveform Re-enable & Improvements
`showWaveform` is hardcoded to `false` (line 649 of `AudioPlayer.jsx`). Re-enable it and:
- Add a toggle button in the player UI
- Show chapter/section markers if the audio file embeds them (music-metadata supports this)
- Color the played portion differently from unplayed

### Spectrum Analyzer
Add a real-time frequency spectrum bar (using `AnalyserNode`) alongside or below the waveform. This is additive — tap off the existing Web Audio chain with an `AnalyserNode`, render to a Canvas with `requestAnimationFrame`. Respect `prefers-reduced-motion`.

### WASAPI / Exclusive Mode (Electron only)
If/when the Electron wrapper is built, expose WASAPI exclusive mode for bit-perfect output on Windows. Not actionable for the web app.

---

## Performance Optimizations

### Web Worker for Waveform Decoding
**Problem:** `AudioContext.decodeAudioData()` in `WaveformCanvas.jsx` blocks the main thread for large files (>10 MB), freezing the UI.
**Fix:** Move decoding into a Web Worker using `OfflineAudioContext`. The worker receives an `ArrayBuffer`, decodes it, extracts RMS peaks, and posts the float array back. The main thread only renders. The existing `waveformCache` Map can stay — just populate it from the worker result.

### OffscreenCanvas for PEQ Chart
**Problem:** `PeqResponseChart.jsx` redraws the grid on every frame even when no bands changed, and runs the 512-point frequency response calculation on the main thread.
**Fix:**
1. Cache the static grid as a separate `OffscreenCanvas` drawn once; composite it onto the main canvas.
2. Move the `calculateBandResponse()` loop into a Web Worker or at minimum memoize it with a hash of the band state so it only recalculates when a band changes.

### Canvas Render Guard When Panel Hidden
**Problem:** `PeqResponseChart` and `WaveformCanvas` may schedule `requestAnimationFrame` callbacks even when their containing panel is collapsed or off-screen.
**Fix:** Use an `IntersectionObserver` to pause `rAF` loops when the canvas is not visible. Both components already have `useEffect` cleanup — just gate the loop start on intersection.

### Debounce Band Slider Updates
**Problem:** Dragging a gain slider fires `UPDATE_BAND` on every `mousemove`, causing a context re-render + audio node param update + chart redraw on every pixel of drag.
**Fix:** Use `audioParam.linearRampToValueAtTime` for the Web Audio update (already smooth) but debounce the React state dispatch to ~50 ms. The audio will stay responsive while React renders less frequently.

### Virtualize Long Playlists
**Problem:** Rendering hundreds of track rows in `Playlist.jsx` creates large DOM trees.
**Fix:** Use `@tanstack/react-virtual` (or a manual windowing approach) to only render visible rows. Given the simple row structure, a manual implementation is ~50 lines.

### Lazy-load music-metadata
**Problem:** `music-metadata` is a large dependency included in the main bundle.
**Fix:** Dynamic `import('music-metadata')` inside the file-drop handler. This moves the library to a lazy chunk that only loads when the user actually drops a file, improving initial load time.

### Reduce localStorage Write Frequency
**Problem:** PEQ state is debounced at 1000 ms but playlist operations (add, remove, reorder) write synchronously.
**Fix:** Wrap all `localStorage` writes in a unified flush queue debounced at 500 ms. This avoids redundant serialization when the user drags to reorder multiple tracks quickly.

---

## Code Quality / DX

- **Remove `window.__SAKU_DEBUG__`** from the production bundle. Gate it behind `import.meta.env.DEV`.
- **Single-source the keyboard shortcut map** so the help overlay and `useKeyboardShortcuts` never drift out of sync.
- **Add React error boundaries** around `AudioPlayer`, `PeqPanel`, and `Playlist` so a crash in one panel does not take down the whole app.
- **TypeScript** (at least for `PlaybackContext` and `peqGraph.js`): the PEQ band shape is referenced in 12+ files — a shared `Band` interface would prevent silent type errors during refactors.
