# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (base: /saku-audio-player/ for GitHub Pages)
npm run lint       # ESLint on src/ (js, jsx)
npm run test       # Run Vitest
npm run format     # Prettier on src/
npm run deploy     # Build + deploy to GitHub Pages via gh-pages
```

To run a single test file: `npx vitest run src/path/to/file.test.js`

## Architecture

Saku is a fully client-side audio player with a 10-band parametric equalizer (PEQ), built with React 19 + Vite. All processing runs in the browser — no backend.

### State Management

All global state lives in `src/context/PlaybackContext.jsx` using React Context + `useReducer`. This manages the playlist, currently playing track, PEQ band state (10 bands + preamp), AutoEQ cache, and preset library. Most components consume this context via `useContext`.

### Audio Pipeline

The Web Audio API processes audio in real time. Each EQ band maps to a `BiquadFilterNode`. Frequency response visualization is calculated in `src/utils/audio/peqGraph.js`. The PEQ component tree:

- `PeqPanel` → `BandControl` (×10) + `PeqResponseChart` + `PresetLibrary` + `AutoEqSearchPanel` + `ClippingMonitor`

### Component Hierarchy

```
FluxStudio (root)
└── AppLayout
    ├── Sidebar left  → Playlist → Track items
    ├── Sidebar right → PeqPanel
    └── Center        → AudioPlayer (TrackInfo, WaveformCanvas, AudioControls, VolumeControl)
```

### Layout & Responsiveness

Left/right sidebars collapse on screens narrower than 1280px. Keyboard shortcuts (`A`=add files, `E`=EQ panel, `P`=playlist, `Space`=play/pause, etc.) are registered in `src/hooks/`.

### Preset Formats

EQ presets can be imported/exported in multiple formats. Converters live in `src/utils/converters/`:
- AutoEQ text format
- PowerAmp XML
- Qudelix JSON

The AutoEQ integration fetches from the GitHub API to search ~8,850+ presets by headphone model.

### Persistence

User data (EQ state, presets) is persisted to `localStorage`. There is no `.env` or server configuration.

### Build Notes

- Dev base path: `/`
- Production base path: `/saku-audio-player/` (configured in `vite.config.js` for GitHub Pages)
- Vitest runs in jsdom environment
- `music-metadata` is included in Vite's `optimizeDeps`
