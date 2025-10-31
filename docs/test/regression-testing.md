# Regression Testing Strategy

## Overview
This document outlines automated and manual regression coverage for the Saku Audio Player. It covers three primary domains:

1. Player (audio playback and controls)
2. Playlist (track management and drag-and-drop)
3. Parametric EQ (signal processing, presets, persistence)

Recommended tooling includes:
- **Vitest/Jest** with React Testing Library for unit and integration tests
- **MSW (Mock Service Worker)** for network/API mocking (AutoEQ search/downloads)
- **Playwright** (or Cypress) for end-to-end browser verification across Chromium and Firefox
- **GitHub Actions** for CI automation of both unit and E2E suites

---

## Player Coverage

### Unit / Component
- Render metadata and respond to prop changes (title, artist, album, codec)
- `AudioPlayer` interactions: play/pause toggles, volume adjustments, seek updates
- Repeat/off/all/one state transitions
- Shuffle toggle and order management
- Visual toggle states: waveform, ambient glow, petals
- Guard rails around autoplay policies (mock `play` and ensure user gesture requirement)

### Context / Reducer
- `playNext` / `playPrevious` behavior in repeat and shuffle modes
- `removeTrackAt`, `moveTrack`, `insertTracksAt` invariants (current index, shuffle order, object URL alignment)

### E2E / Playwright
- Load demo tracks, click play, ensure UI state changes
- Trigger keyboard shortcuts (Space, N, B, M) to validate playback control wiring
- Seek via drag on progress bar and assert time updates
- Toggle shuffle and ensure order changes across multiple next operations
- Validate audio element readiness using small fixture files and `readyState`

### Manual Sanity (per release)
- Browser autoplay handling in Chrome/Firefox
- Volume/mute persistence between tracks
- Waveform rendering and scrubbing accuracy

---

## Playlist Coverage

### Unit / Component
- Render list with active class, remove button, keyboard Delete handling
- Drag-and-drop reordering: simulate `dragStart` / `dragEnter` / `drop` to ensure `onMoveTrack` called with correct indices
- External drop detection using custom `DataTransfer` helper, verifying `onInsertTracks`
- Reset button states and upload button file selection callbacks

### Context / Reducer
- `moveTrackState` and `insertTracksState` keep object URL arrays aligned
- Multiple track removal uses `removeTracksState` to collapse indices correctly

### E2E / Playwright
- Reorder tracks via drag gesture and verify UI order plus active track continuity
- Drop mocked file/folder to specific index and ensure playlist inserts item in that slot
- Reset playlist returns to bundled tracks and resets active index

### Manual Sanity
- Directory drop on macOS/Windows browsers
- Keyboard navigation of playlist items (focus outline, Enter/Space activation)

---

## Parametric EQ Coverage

### Unit / Reducer
- Band updates adjust gain/frequency/Q as expected
- Auto-preamp calculations respond to cumulative gain changes
- Preset loader normalizes data (ensure missing fields handled)
- Local storage persistence: load/save cycle using mocked storage

### Component / Integration
- Slider interactions update displayed values and dispatch context actions
- Toggle bypass, auto preamp, and auto EQ state transitions
- AutoEQ search/import flows using MSW to mock GitHub API responses
- Response chart renders safely with empty/malformed data

### E2E / Playwright
- Import preset via UI and ensure curve updates
- Toggle bypass and verify audio graph connections (mock or inspect context state)
- Persist settings across reload by reading localStorage values

### Manual Sanity
- Visual verification of response chart and clipping indicator
- Cross-browser slider behavior (vertical sliders in Safari/Firefox/Chromium)

---

## Tooling & Setup

### Dependencies (dev)
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install --save-dev msw
npm install --save-dev playwright @playwright/test
```

### Vitest/Jest Configuration
- Add `setupTests.ts` (or `.js`) to extend jest-dom, mock AudioContext/HTMLMediaElement
- Configure Vitest in `vite.config.ts` with `test` block pointing to setup file

```ts
// vite.config.ts (excerpt)
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
  },
});
```

### Playwright Configuration
```bash
npx playwright install
```
Create `playwright.config.ts` covering Chromium & Firefox, base URL `http://localhost:5173`, and fixtures for audio files.

### CI Integration (GitHub Actions)
- Workflow running `npm ci`, `npm run build`, `npm run test -- --runInBand`, and `npx playwright test`
- Cache `~/.cache/msw` and Playwright browsers to speed up builds

---

## Regression Checklist (per release)

| Area | Test | Type |
| --- | --- | --- |
| Player | Play/pause/seek/volume/shuffle | Playwright |
| Player | Context reducers invariants | Unit |
| Playlist | Drag reorder & insertion | Component + Playwright |
| Playlist | Keyboard Delete/Enter operations | Unit |
| PEQ | Band adjustments & persistence | Unit |
| PEQ | AutoEQ import flow | Integration (MSW) |
| PEQ | Bypass & response chart | Playwright |
| General | Bundled vs. uploaded track handling | Integration |
| General | Browser autoplay compliance | Manual |

Maintain this matrix and update it as new features land to ensure continuous regression coverage.
