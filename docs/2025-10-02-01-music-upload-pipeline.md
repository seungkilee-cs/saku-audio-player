# Music Upload Pipeline Plan — 2025-10-02

## Objectives
- **Enable user-supplied audio** Allow visitors to upload local audio files and hear them through the existing player interface.
- **Share playback state** Replace per-component track state with a shared context so uploads and demo playlists use the same plumbing.
- **Preserve demo content** Keep the static demo playlist as a fallback when no uploads exist.

## Scope & Deliverables
- **Context layer** New `PlaybackContext` that stores track metadata, current index, loading/error state, and exposes helpers for replacing/advancing tracks.
- **Metadata adapters** Refactor `src/assets/meta/tracks.js` to expose `loadBundledTracks()` and `parseAudioFiles(files)` for both default and uploaded sources.
- **Upload page** Replace the placeholder in `UploadPlaylist.jsx` with a functional workflow: choose files, parse metadata, push into context, navigate to `/player`, and display user feedback.
- **Player integration** Update `TestPlayer.jsx` (and related components) to rely on context values instead of internal state.
- **Resilience** Basic validation (empty selection, parse failures) surfaced via inline messaging, plus optional storage of last playlist in state for future enhancements.

## Implementation Steps
1. **Playback context** Create `src/context/PlaybackContext.jsx` with provider effect that loads bundled tracks on mount and exposes `replaceTracks()`.
2. **Metadata refactor** Update `src/assets/meta/tracks.js` to export `loadBundledTracks` and `parseAudioFiles`, sharing a common extraction helper.
3. **Router integration** Wrap the router in `PlaybackProvider` in `src/index.jsx`.
4. **Player consumption** Rewrite `TestPlayer.jsx` to use context values and handle loading/error cases.
5. **Upload workflow** Revise `UploadPlaylist.jsx` and `FileUploader.jsx` to parse user files, display progress/error states, and call `replaceTracks` before redirecting to `/player`.
6. **Cleanup & docs** Adjust documentation (`docs/2025-10-02-fixes.md`) with a summary of the changes and verification steps.

## Risks & Follow-ups
- **Performance** Browser-side metadata parsing may block UI for large files—consider Web Workers later.
- **Storage** Large uploads won’t persist across refresh without future localStorage/IndexedDB work.
- **Format support** `music-metadata` handles many formats but not streaming protocols; unsupported files should surface clear errors for iteration.
