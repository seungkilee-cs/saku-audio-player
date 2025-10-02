# Saku Audio Player Codebase Audit (2025-10-02)

## Overview
- **Project summary** Single-page audio player built with Vite + React (`src/index.jsx`) that provides a demo playback UI (`TestPlayer.jsx`) and placeholder upload page (`UploadPlaylist.jsx`).
- **Entrypoints** `src/index.jsx` mounts routes for home, player, and upload. Static assets under `src/assets/` supply bundled demo audio and artwork via `import.meta.glob`.
- **Primary concerns** Heavy synchronous metadata parsing in `src/assets/meta/tracks.js`, inconsistent dependency manifests, several unused/buggy components, and multiple small UX/accessibility gaps.

## Architecture & Code Structure
- **Component layout** UI split across presentational components (`AudioPlayer.jsx`, `Playlist.jsx`, `TrackInfo.jsx`, etc.) with CSS modules in `src/styles/`. State management relies solely on React hooks per component.
- **Asset handling** `src/assets/audio/index.js` and `src/assets/img/index.js` eagerly import every media file, which increases bundle size and blocks tree-shaking. Metadata generation in `tracks.js` fetches each bundled audio file at runtime.
- **Utilities** `util/timeUtils.js` provides simple time formatting. `util/static-track-list-generator.js` is orphaned, never executed, and references DOM APIs without context.
- **Routing** `react-router-dom` v7 `BrowserRouter` is initialized with `basename="/saku-audio-player/"` to support GitHub Pages deployment.

## Dependency Review
- **React 19 adoption** `package.json` pins `react@^19.0.0` and `react-router-dom@^7.4.0`, both relatively new major releases. Confirm build/test coverage before upgrading production, or consider staying on the last stable LTS if issues arise.
- **music-metadata** v11 in root `package.json` runs in the browser but adds ~600 kB compressed. Consider dynamic importing or server-side preprocessing for large libraries.
- **Duplicate manifest** `src/components/package.json` is a legacy CRA manifest targeting React 17. It should be removed to avoid tooling confusion and dependency drift.
- **Dev tooling** Minimal testing/storybook infrastructure; no linting configuration is present beyond default Vite behavior.

## Security & Vulnerability Assessment
- **Unvalidated file parsing** `FileUploader.jsx` imports `generateTracks` expecting local file parsing, but `tracks.js` only handles bundled files and issues network `fetch` calls. Extending this path to local uploads without strict validation risks processing untrusted blobs entirely client-side, potentially exposing metadata parser vulnerabilities. Restrict accepted mimetypes, add size limits, and sandbox parsing if user uploads are enabled.
- **Global keyboard listeners** `AudioControls.jsx` and `VolumeControl.jsx` attach `document` keydown handlers without scoping to focused elements. Malicious pages embedded alongside the player could trigger navigation or volume changes unexpectedly. Gate handlers on `document.activeElement` or wrap in focus management.
- **Deployment script** `git-deploy.sh` runs `git checkout master` and force-pushes branches. If executed in CI or a shared environment, it may mutate history unexpectedly. Require explicit confirmation, detect default branch dynamically, and avoid storing credentials in environment variables.
- **Resource exposure** Bundling raw audio files exposes full-resolution media publicly. Confirm licensing and consider watermarking or streaming for proprietary content.

## Functional & Code Quality Issues
- **Metadata property mismatch** `src/assets/meta/tracks.js` exports `code: metadata.format.codec`, but `AudioPlayer.jsx` and `TrackInfo.jsx` expect `codec`. Result: codec info is always `undefined`. Rename the field consistently.
- **Progress bar props** `ProgressBar.jsx` accepts `trackStyling` and uses it inline, yet `AudioPlayer.jsx` never supplies it. The result is `background: undefined` and limited styling control. Either compute styling in `AudioPlayer.jsx` or remove the prop.
- **Duration handling** `ProgressBar.jsx` sets `max={duration || `${duration}`}`. When `duration` is `NaN`, the input receives the literal string `"NaN"`, breaking scrubbing. Clamp to `0` when `duration` is not finite.
- **Redundant format import** `TrackInfo.jsx` imports `formatTime` but also receives it via props; the local import is unused. Remove to prevent confusion.
- **Audio element lifecycle** `AudioPlayer.jsx` recreates `new Audio(audioSrc)` when tracks change, but does not preload metadata or handle autoplay rejections (e.g., browsers blocking play without user interaction). Add `audioRef.current.load()` and guard `play()` promises.
- **Sequential metadata loading** `tracks.js` fetches each audio file sequentially inside a `for...of` loop, exacerbating startup delay. Use `Promise.all` for parallel loading and cache results.
- **Placeholder components** `Volume.jsx` and `util/static-track-list-generator.js` are unused stubs. Keeping them invites dead-code drift.
- **Error paths** `TestPlayer.jsx` logs metadata fetch errors but keeps the UI in a perpetual "Loading Tracks..." state. Provide user-facing feedback and retry options.

## Performance & UX Observations
- **Initial bundle weight** Eager imports of every audio track significantly increase build size and time-to-interactive. Consider lazy-loading demo tracks or swapping to streaming URLs.
- **Keyboard accessibility** Volume changes require mouse clicks, progress bar lacks keyboard cues, and buttons rely on SVG icons without text. Add focus indicators, ARIA labels (beyond play/pause), and keyboard shortcuts scoped to the player.
- **Responsive behavior** CSS files are desktop-oriented; playlist and controls overflow on smaller screens. Introduce breakpoints and flex wrapping.
- **Color contrast** Random HSL backdrop colors can conflict with white text. Select colors based on track artwork or ensure minimum contrast ratios.

## Recommended Fixes (Prioritized)
- **Align metadata schema** Update `tracks.js` to expose `codec` (and other fields) consistently; adjust consumers accordingly.
- **Refine progress bar logic** Pass explicit styling data, clamp `duration`, and support keyboard interactions (`aria-valuenow`, `aria-valuemax`).
- **Parallelize metadata loading** Replace the sequential loop with `Promise.all` over `Object.entries(audio)`; show a loader while metadata resolves.
- **Clean dependency artifacts** Delete `src/components/package.json`, add a single authoritative `package.json`, and set up ESLint/Prettier for consistency.
- **Harden global listeners** Wrap key handlers in focus checks or convert to `useEffect` on elements with `tabIndex` to avoid unintended triggers.
- **Improve error handling** In `TestPlayer.jsx`, surface errors to the UI and offer a retry button or fallback playlist.

## Longer-Term Improvements
- **File upload roadmap** Implement a dedicated metadata extraction path for user-uploaded audio, ideally off-main-thread (Web Worker) to keep the UI responsive.
- **Testing infrastructure** Add unit tests for utilities (`util/timeUtils.js`) and integration tests for playback workflows. Consider Playwright for end-to-end coverage.
- **State management** Extract playlist and playback logic into a context or custom hook to simplify reuse and upcoming features (queue, shuffle).
- **Design polish** Introduce theme support, consistent typography, and spacing tokens. Evaluate CSS-in-JS or Tailwind if scaling styles beyond current scope.
- **Analytics & telemetry** If deployed publicly, add opt-in analytics to monitor errors and track usage for future prioritization.

## Appendix: Files of Interest
- **Playback core** `src/components/AudioPlayer.jsx`
- **Metadata loader** `src/assets/meta/tracks.js`
- **UI shell** `src/components/TestPlayer.jsx`, `src/components/Home.jsx`
- **Deployment helper** `git-deploy.sh`
- **Utility & legacy files** `util/static-track-list-generator.js`, `src/components/Volume.jsx`
