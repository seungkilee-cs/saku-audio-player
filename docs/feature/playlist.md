# Playlist Feature Set

## Core List Management
- Render ordered track list with active track highlighting
- Select track to play via click or keyboard activation
- Remove individual tracks with inline control or keyboard Delete
- Reset playlist to bundled default selection

## Drag-and-Drop
- Internal reordering using HTML5 drag gestures with visual indicators
- External file/folder drop support to append or insert at specific positions
- Directory traversal for nested audio files (webkit directory entries)

## Upload & Parsing
- File and folder pickers (with modifier shortcuts for folder selection)
- Filtering for supported audio formats before ingestion
- Seamless integration with track parsing pipeline and metadata extraction

## Accessibility & UX
- Focusable list items with appropriate ARIA roles and labels
- Keyboard shortcuts (Enter/Space to play, Delete to remove)
- Drop zone feedback with hover and drag states
- Responsive layout adjustments for narrow viewports
