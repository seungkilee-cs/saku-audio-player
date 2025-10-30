# Playlist Drag-and-Drop Implementation Plan

## Goals
- Enable reordering of existing playlist items via drag-and-drop.
- Allow inserting newly dropped audio files at any position, including between items and at the ends.
- Preserve the currently playing track, repeat/shuffle semantics, and visual state during reorder/insert operations.

## Current Architecture Snapshot
- **State owner:** `src/context/PlaybackContext.jsx` maintains `tracks`, `currentTrackIndex`, `repeatMode`, `shuffleMode`, `shuffleOrder`, etc.
- **Playlist UI:** `src/components/Playlist.jsx` renders the list, but only supports uploading files (append/replace) and lacks internal drag-and-drop handling.
- **File ingestion:** `AppLayout.jsx` pipes uploads to `parseAudioFiles()` then either `appendTracks()` or `replaceTracks()` based on playlist emptiness. There is no API for targeted insertion or reordering.
- **Shuffle support:** `shuffleOrder` mirrors the visible track order when shuffle is active, but is rebuilt only when enabling shuffle or when track count changes.

## Deliverables Overview
- Context-layer APIs: move, insert, remove helpers with bookkeeping for current index and shuffle order.
- Playlist UI: drag handles, drop indicators, and event plumbing for internal reorders and external file drops with positioning.
- File upload flow: ability to pass an insertion index through from UI to context.
- Quality gates: unit coverage (where feasible) plus manual regression checks for playback behavior.

## Step-by-Step Implementation

### 1. Extend Playback Context
- **Add helper:** `moveTrack({ fromIndex, toIndex })` that:
  - Creates a shallow copy of `tracks` and splices the item into the new position.
  - Adjusts `currentTrackIndex` so the playing track remains targeted if its position shifts.
  - Updates `shuffleOrder` to reflect the new visible order (e.g., re-map indices or rebuild when shuffle on).
  - Persists object URLs ordering if required (update `objectUrlsRef`).
- **Add helper:** `insertTracksAt(index, tracksToInsert)` that reuses `sanitizeTracks()` and:
  - Inserts sanitized tracks and URLs at the specified index.
  - Adjusts `currentTrackIndex` when insertions occur before the active track.
  - Rebuilds `shuffleOrder` (include new indices) when shuffle mode enabled.
- **Optional:** `removeTrack(index)` (future-proofing if drag-out remove intended).
- **Expose API:** export these functions via `usePlayback()` so components can dispatch the operations.

### 2. Update Shuffle Order Logic
- Extract logic for rebuilding the shuffle sequence into a reusable function (e.g., `buildShuffleOrder(currentIndex, trackCount)`).
- Invoke the helper after `moveTrack()` and `insertTracksAt()` whenever `shuffleMode` is true.
- Ensure repeat-one/manual-advance semantics remain intact after reorder by verifying `playNext()` / `playPrevious()` operate on updated indices.

### 3. Adjust AppLayout Upload Flow
- Update `handleFilesSelected()` in `src/components/layout/AppLayout.jsx` to accept an optional `insertIndex` argument.
  - If `insertIndex` is `null`, retain existing append/replace logic.
  - If provided, call the new `insertTracksAt(insertIndex, parsedTracks)`.
- Propagate insertion callbacks down to `Playlist` via a new prop (e.g., `onInsertTracks(files, insertIndex)`).
- Maintain backwards compatibility for `AudioPlayer`'s drop zone, which can continue to append (pass `null` index).

### 4. Revamp Playlist Component for Drag-and-Drop
- **State additions:** track `draggedIndex`, `hoverIndex`, and whether the current drag is internal vs. external.
- **Internal drag:**
  - Set `draggable` on each `<li>` item and wire `onDragStart`, `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`.
  - Use `dataTransfer` to mark internal drags (e.g., custom MIME type `application/x-saku-track-index`).
  - On drop with an internal payload, call `moveTrack({ fromIndex, toIndex })` forwarded from props.
- **External file drop positioning:**
  - Detect FileList vs. internal payload in `onDrop`.
  - When dropping files, compute the target index (`hoverIndex` or `tracks.length` for tail) and call `onInsertTracks` with the files and index.
  - Preserve existing behavior when dropping onto empty space (default to append).
- **Visual feedback:**
  - Add CSS classes for `playlist__item--dragging` and `playlist__drop-indicator` to highlight slots (update `src/styles/Playlist.css`).
  - Consider accessible descriptions using `aria-dropeffect`/`aria-grabbed`.

### 5. Styling and Accessibility
- Ensure keyboard users retain the ability to move focus and select tracks (dragging remains a pointer interaction, but focus outlines should stay visible).
- Provide textual feedback (e.g., `aria-live` region) when items are moved if necessary for accessibility compliance.

### 6. Testing Strategy
- **Unit tests (if test harness present):**
  - Verify `moveTrack()` reorders arrays and keeps `currentTrackIndex` synchronized.
  - Confirm `insertTracksAt()` adjusts indices correctly and handles shuffle rebuilds.
- **Manual regression:** follow checklist from `docs/playlist-drag-and-drop-plan.md` (see below reference section).
- **Cross-browser sanity:** confirm drag-and-drop works at least in Chromium and Firefox; Safari needs special handling for `dataTransfer`.

## Follow-Up Enhancements (Optional)
- Support dragging items out to delete or to other playlists.
- Persist playlist order changes to local storage if persistence is desired.
- Integrate haptic feedback or animations for drag operations.

## References
- Checklist: see **Testing Checklist** section in this document.
- Existing styles: `src/styles/Playlist.css`.
- Core state: `src/context/PlaybackContext.jsx`.
- Entry point wiring: `src/components/layout/AppLayout.jsx`.
