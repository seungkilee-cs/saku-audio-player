# Feature Plan: Modular Playlist Track Removal

## Objectives
- Enable users to remove individual tracks from the queue without affecting the rest of the playlist.
- Preserve playback continuity and parity between ordered, shuffled, and repeat-one states.
- Manage uploaded media lifecycles safely (revoke object URLs, release memory) while keeping the UI responsive and accessible.

## Design Principles
1. **Single source of truth:** All playlist mutations flow through `PlaybackContext`, ensuring player, playlist UI, and shortcuts remain in sync.
2. **Modular responsibilities:** Separate pure playlist mutations from component concerns (rendering, gestures) to maximize reuse.
3. **Predictable state transitions:** Removal logic must always leave `currentTrackIndex`, `activeSource`, and shuffle bookkeeping in a valid state.
4. **Access-first controls:** Provide both pointer and keyboard gestures, with clear feedback and undo affordances on the roadmap.

## Architecture Overview
- **Playlist Domain Helpers** (`src/context/playlistActions.js` new file): contains pure functions for add/remove/reorder along with shuffle-order reconciliation. These helpers operate on serializable data and are unit-testable without React.
- **Playback Context Enhancements** (`src/context/PlaybackContext.jsx`):
  - Introduce `removeTrackAt(index)` and `removeTracks(indices)` that delegate to the helper module and apply updates via `setTracks`, `setCurrentTrackIndex`, and `objectUrlsRef` maintenance.
  - Add `removeCurrentTrack()` convenience method that calls `removeTrackAt(currentTrackIndex)` when valid.
  - Surface new methods in the context value for consumer components.
- **Object URL Management:** Extend existing `cleanupObjectUrls` to accept either a single URL or array; helper module returns revoked URLs list so context can call the cleanup exactly once per removal.
- **Shuffle/Repeat Alignment:** Move shuffle order computation into helper utility (`rebuildShuffleOrder({ tracks, currentTrackIndex })`) so removal logic can call it synchronously before React effects fire.

## Removal Flow
1. UI (playlist item button or keyboard gesture) invokes `removeTrackAt(index)` from context.
2. Helper computes:
   - Updated tracks array with item removed.
   - Revoked object URLs (if the removed track had `objectUrl`).
   - Next `currentTrackIndex`, respecting whether the removed track was before, exactly at, or after the active index.
   - Next `activeSource`, defaulting to the next available track or "none" when empty.
   - Updated shuffle order when shuffle mode is active; trims the removed index and keeps the active track at position zero.
   - Flags when playback should pause (empty playlist or repeat-one track removed without successor).
3. Context applies updates with a single `setState` batch, revokes object URLs, and if playback must pause, instructs the player via existing `activeSource` and `tracks` watchers.

## UI & Interaction
- **Per-track Controls (Primary):**
  - Add an inline icon button (trash or ×) inside each list item in `Playlist.jsx` that calls `onRemoveTrack(index)`.
  - Stop click propagation so selecting an item remains separate from removal.
  - Provide accessible name (e.g., "Remove {title}") and ensure it’s reachable via keyboard.
- **Keyboard Support:**
  - When a list item has focus, pressing Delete/Backspace triggers removal through the same callback.
- **Optional Enhancements:**
  1. Overflow action in `AudioPlayer` that invokes `removeCurrentTrack()` for users who prefer working near transport controls.
  2. Multi-select removal (future) by pairing checkbox selection with the new `removeTracks(indices)` helper.
- **Feedback:** Show a transient toast confirming removal (out of scope for first pass but keep API hooks flexible for adding undo).

## State Handling Details
- Guard invalid indices; helpers return the original state when removal is a no-op.
- When the active track is removed and there is a successor:
  - Prefer the track now occupying the same index; otherwise move back if at end of list.
  - Resume playback automatically if the player was already playing.
- When the playlist becomes empty:
  - Reset `currentTrackIndex` to 0, set `activeSource` to "none", clear shuffle order, and pause playback.
- Repeat-one mode removing its active track pauses playback unless the user explicitly asked to continue (documented behaviour: stop).

## Testing Strategy
- **Unit Tests (helpers):** Validate removal scenarios (first/middle/last, active/non-active, empty result, shuffle on/off, repeat-one) using pure functions.
- **Context Behaviour:** Integration tests (React Testing Library) to confirm `removeTrackAt` updates `tracks`, `currentTrackIndex`, `activeSource`, and calls `cleanupObjectUrls`.
- **UI Interaction:** Cypress or RTL tests covering button click, keyboard delete, and active state updates after removal.
- **Manual QA Checklist:**
  - Remove playing track while audio is running; ensure playback advances or stops appropriately.
  - Remove uploaded track; confirm URL revoked via dev tools.
  - Toggle shuffle, remove random track, and verify next/previous follow the visible order.
  - Remove tracks until empty; player should display idle state.

## Effort Estimate
- Playlist helper module + context wiring: ~4 hours.
- Playlist UI updates (button, keyboard path, styling): ~2 hours.
- Optional audio-player affordance + light toast feedback: +2 hours.
- Testing (unit + integration) and polish: ~2 hours.
