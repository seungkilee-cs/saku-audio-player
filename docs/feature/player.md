# Player Feature Set

## Playback Controls
- Play, pause, and stop via UI controls and keyboard shortcuts
- Track seek with scrub bar displaying current time and total duration
- Volume slider with mute toggle and keyboard support
- Next/previous track navigation with repeat (off/all/one) semantics
- Shuffle mode that maintains deterministic order per session
- Auto-resume handling respecting browser audio policies

## Track Handling
- Supports bundled demo tracks and user-uploaded files
- Metadata display (title, artist, album, codec, bitrate)
- Track removal (current or specific list item)
- Source attribution (bundled vs. uploaded)

## Visual Feedback
- Waveform visualization with progress indicator (toggleable)
- Ambient glow and petal visualizers (toggleable)
- Playback state indicators and loading states

## Accessibility & UX
- Keyboard shortcuts for playback and navigation
- Focus management and ARIA labeling for controls
- Responsive layout for desktop and vertical/mobile views
