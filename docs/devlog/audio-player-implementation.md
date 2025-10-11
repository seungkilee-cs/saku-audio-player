# Audio Player Implementation

## Overview

The Saku Audio Player is a web-based audio player built with React and the Web Audio API. The implementation focuses on high-quality audio playback with advanced features like waveform visualization, drag-and-drop file handling, and comprehensive keyboard controls.

## Architecture

### Core Audio System

The audio player uses HTML5 Audio elements connected to the Web Audio API for processing, providing both compatibility and advanced audio capabilities.

#### Files: Core Audio System
- `src/components/AudioPlayer.jsx` - Main audio player component
- `src/components/WaveformCanvas.jsx` - Waveform visualization
- `src/components/VolumeControl.jsx` - Volume management
- `src/context/PlaybackContext.jsx` - Global audio state management

## Custom Implementations

### 1. Audio Playback Engine

File: `src/components/AudioPlayer.jsx`

Custom audio management system:
- HTML5 Audio element with Web Audio API integration
- MediaElementSource for advanced audio processing
- AudioContext lifecycle management
- Cross-browser autoplay policy handling

Key features implemented:
- Track switching without audio gaps
- Real-time progress tracking with 1-second precision
- Volume control with mute state preservation
- Playback state synchronization across components

Technical implementation:
- Uses refs for audio element persistence across renders
- Implements proper cleanup on component unmount
- Handles audio context suspension/resumption
- Manages audio source changes without interrupting playback

### 2. Waveform Visualization

File: `src/components/WaveformCanvas.jsx`

Completely custom Canvas-based waveform renderer:
- Real-time audio analysis using AnalyserNode
- Custom waveform drawing algorithms
- Interactive scrubbing with mouse/touch support
- High-DPI display optimization

Implementation details:
- Uses Web Audio API AnalyserNode for frequency data
- Custom amplitude calculation and smoothing
- Responsive canvas sizing with device pixel ratio
- Optimized rendering with requestAnimationFrame
- Interactive progress indication with click-to-seek

### 3. File Handling System

File: `src/assets/meta/tracks.js`

Custom audio file processing:
- Drag-and-drop file handling
- Multi-format audio support (MP3, FLAC, M4A, WAV, AAC, OGG)
- Metadata extraction with fallback handling
- Object URL management for uploaded files

Key functions:
- `parseAudioFiles()` - Processes dropped/selected files
- `parseSource()` - Extracts metadata and creates track objects
- `arrayBufferToBase64()` - Converts embedded album art
- `generateTrackId()` - Creates unique track identifiers

### 4. Playlist Management

File: `src/components/Playlist.jsx`

Custom playlist implementation:
- Dynamic track list management
- Drag-and-drop reordering
- Track selection and navigation
- Playlist persistence across sessions

Features:
- Real-time track status updates
- Current track highlighting
- Track metadata display with fallbacks
- Playlist clearing and reset functionality

### 5. Volume Control System

File: `src/components/VolumeControl.jsx`

Custom volume management:
- Continuous slider control
- Mute state with volume preservation
- Visual feedback with icons
- Keyboard control integration

Implementation:
- Linear volume scaling (0.0 to 1.0)
- Mute state preservation using refs
- Real-time audio element volume updates
- Accessible slider with proper ARIA labels

### 6. Keyboard Shortcuts

File: `src/hooks/useKeyboardShortcuts.js`

Comprehensive keyboard control system:
- Global keyboard event handling
- Input field detection and bypass
- Modifier key support (Shift combinations)
- Action mapping with event feedback

Implemented shortcuts:
- Arrow keys: Volume and seeking control
- B/N: Previous/Next track navigation
- M: Mute toggle with volume preservation
- Space: Play/pause toggle
- E/P: Modal controls (EQ/Playlist)

### 7. Drag and Drop Interface

File: `src/components/AudioPlayer.jsx`

Custom drag-and-drop implementation:
- Visual feedback with overlay
- File type validation
- Multiple file handling
- Integration with existing upload system

Features:
- Drag-over visual indicators
- File type filtering for audio formats
- Batch file processing
- Error handling for unsupported files

### 8. Progress and Time Display

File: `src/components/ProgressBar.jsx`

Custom progress visualization:
- Real-time progress updates
- Interactive scrubbing support
- Time formatting and display
- Responsive design for mobile

Implementation:
- Percentage-based progress calculation
- Click-to-seek functionality
- Touch-friendly scrubbing for mobile
- Proper time formatting (MM:SS)

## Libraries Used

### External Dependencies

1. `music-metadata` (v11.0.0)
   - File: `src/assets/meta/tracks.js`
   - Purpose: Audio file metadata extraction
   - Usage: Parsing title, artist, album, duration, bitrate
   - Fallback: Custom metadata generation when parsing fails

2. `react` (v19.0.0)
   - Used throughout for component structure
   - Hooks for state management and lifecycle
   - Context API for global state sharing

3. `react-icons` (v5.5.0)
   - File: Various UI components
   - Purpose: Consistent icon set
   - Usage: Play/pause, volume, navigation icons

### Browser APIs Used

1. HTML5 Audio API
   - Core audio playback functionality
   - Event handling (play, pause, ended, timeupdate)
   - Volume and playback rate control

2. Web Audio API
   - MediaElementSource for advanced processing
   - AnalyserNode for waveform visualization
   - AudioContext for audio processing pipeline

3. File API
   - FileReader for local file access
   - Blob handling for uploaded audio
   - Object URL creation for audio sources

4. Canvas 2D API
   - Waveform rendering
   - High-DPI display support
   - Interactive drawing and event handling

5. Drag and Drop API
   - File drop handling
   - Visual feedback during drag operations
   - DataTransfer object processing

## Performance Optimizations

### Memory Management
- Proper cleanup of Object URLs for uploaded files
- Audio element reuse across track changes
- Canvas context optimization with requestAnimationFrame
- Event listener cleanup on component unmount

### Rendering Performance
- React.memo for expensive components
- useMemo and useCallback for expensive calculations
- Debounced updates for real-time visualizations
- Efficient Canvas rendering with minimal redraws

### Audio Performance
- Preloading next track for seamless transitions
- Optimized audio context usage
- Minimized audio processing overhead
- (Relatively) efficient waveform data processing

## Cross-Browser Compatibility

### Supported Browsers
- Chrome 66+ (recommended)
- Firefox 60+
- Safari 14+
- Edge 79+

### Compatibility Handling
- Vendor prefix handling for Web Audio API
- Touch event support for mobile devices

## File Structure

```
src/components/
├── AudioPlayer.jsx           # Main audio player component
├── WaveformCanvas.jsx        # Waveform visualization
├── VolumeControl.jsx         # Volume control interface
├── Playlist.jsx              # Playlist management
├── ProgressBar.jsx           # Progress and time display
└── AudioControls.jsx         # Playback control buttons

src/hooks/
├── useKeyboardShortcuts.js   # Global keyboard handling
└── useMotionPreferences.js   # Accessibility preferences

src/context/
└── PlaybackContext.jsx       # Global audio state management

src/assets/
├── audio/                    # Audio file management
│   └── index.js             # Audio file imports
└── meta/
    └── tracks.js            # File processing and metadata
```

## Technical Details

1. Audio playback with Web Audio API integration
2. Real-time waveform visualization without external charting libraries
3. Comprehensive keyboard control system
4. Drag-and-drop file handling with visual feedback
5. Cross browser audio compatibility
6. (Relatively) memory efficient file and audio management
7. Responsive design for desktop and mobile
8. Accessibility compliance with ARIA labels and keyboard navigation

## Integration Points

The audio player integrates seamlessly with the PEQ system:
- Shared AudioContext between player and EQ
- Real-time audio processing during playback
- Synchronized state management via React Context
- Non-blocking EQ adjustments during audio playback