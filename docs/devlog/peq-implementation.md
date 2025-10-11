# Parametric EQ Implementation

## Overview

The Saku Audio Player features a 10 band parametric equalizer that supports usage with autoEQ, inspired by PowerAmp android application. The PEQ logic is built entirely from scratch using the Web Audio API, on top of BiquadFilterNode. No external audio processing libraries were used. All EQ functionality is implemented using browser-native audio nodes and custom algorithms. It may be less efficient than existing libraries, but performant enough to handle real time playback without much issues.

## Architecture

### Core Audio Processing

The PEQ system is built around a chain of BiquadFilterNode instances connected in series, with a preamp GainNode at the input stage.

#### Files: Core Audio Engine
- `src/utils/audio/peqGraph.js` - Main audio processing engine
- `src/components/AudioPlayer.jsx` - Audio context management and integration

### Band Configuration

The EQ uses a fixed 10-band layout optimized for music production:

```
60Hz (Low Shelf) → 150Hz → 400Hz → 1kHz → 2.4kHz → 4.8kHz → 9.6kHz → 12kHz → 14kHz → 16kHz (High Shelf)
```

Each band supports:
- Frequency adjustment (20Hz - 20kHz)
- Gain adjustment (-24dB to +24dB)
- Q factor control (0.1 to 10.0)
- Filter type (peaking, low shelf, high shelf)

## Custom Implementations

### 1. Audio Chain Management

File: `src/utils/audio/peqGraph.js`

Custom functions built from scratch:
- `createPeqChain()` - Creates connected filter chain
- `updatePeqFilters()` - Real-time parameter updates
- `updatePreamp()` - Preamp gain control with dB to linear conversion
- `cleanupPeqChain()` - Memory management and node cleanup

Key implementation details:
- Uses MediaElementSource for HTML5 audio integration
- Connects filters in series: Preamp → Filter1 → Filter2 → ... → Filter10 → Destination
- Handles audio context state management (suspended/running)
- Implements proper cleanup to prevent memory leaks

### 2. Frequency Response Visualization

File: `src/components/PeqResponseChart.jsx`

Completely custom Canvas-based implementation:
- Real-time frequency response calculation using `getFrequencyResponse()`
- Logarithmic frequency scaling (20Hz to 20kHz)
- Professional grid system with frequency and dB label
- Interactive band markers with gain-based color coding

Technical features:
- 512-point frequency response calculation
- Combines magnitude responses from all filters
- Converts linear magnitude to dB scale
- Clamps extreme values to prevent display issues
- Updates via requestAnimationFrame for smooth performance

### 3. Preset Management System

File: `src/utils/peqPresets.js`

Custom preset handling:
- `validatePreset()` - Comprehensive preset validation
- `normalizePreset()` - Ensures consistent band count and structure
- `calculateRecommendedPreamp()` - Auto-preamp calculation to prevent clipping
- `ensureBandsCount()` - Maintains 10-band structure

Built-in presets:
- Flat (reference)
- Bass Boost (EDM/Hip-hop optimized)
- Vocal Clarity (podcast/vocal enhancement)

### 4. Multi-Format Import/Export

#### AutoEQ Compatibility
File: `src/utils/peqIO.js`

Custom parser for AutoEQ ParametricEQ.txt format:
- Regex-based line parsing
- Filter type detection and mapping
- Preamp extraction and preservation
- Error handling for malformed files

#### PowerAmp XML Support
File: `src/utils/converters/powerampConverter.js`

Custom XML generation:
- Maps internal format to PowerAmp's 10-band structure
- Handles frequency mapping to PowerAmp's fixed bands
- Generates valid XML with proper escaping

#### Qudelix JSON Support
File: `src/utils/converters/qudelixConverter.js`

Custom JSON converter:
- Maps to Qudelix's parametric EQ format
- Handles filter type conversions
- Maintains metadata and versioning

### 5. Real-Time Audio Processing

File: `src/components/AudioPlayer.jsx`

Custom audio integration:
- AudioContext lifecycle management
- Dynamic filter bypass without audio interruption
- Real-time parameter updates during playback
- Cross-browser compatibility handling

Key features:
- Easy switching between bypassed and processed audio
- Maintains audio playback during EQ adjustments
- Handles audio context suspension/resumption
- Integrates with React component lifecycle

### 6. Clipping Detection

File: `src/components/ClippingMonitor.jsx`

Custom real-time clipping monitor:
- Uses AnalyserNode for audio analysis
- Real-time peak detection
- Visual feedback with color-coded indicators
- Configurable threshold and decay settings

## Libraries Used (Minimal)

### External Dependencies
1. `music-metadata` - Audio file metadata parsing only
   - Used in: `src/assets/meta/tracks.deprecated.js` -> Deprecated
   - Purpose: Extract title, artist, album from audio files
   - Not used for audio processing

2. `react` for the UI
   - Used throughout for component structure
   - No audio-related functionality

### Browser APIs Used
1. Web Audio API
   - BiquadFilterNode - Core EQ filtering
   - GainNode - Preamp control
   - AnalyserNode - Clipping detection
   - MediaElementSource - HTML5 audio integration
   - AudioContext - Audio processing context

2. Canvas 2D API
   - Used in: `src/components/PeqResponseChart.jsx`
   - Purpose: Custom frequency response visualization

## Performance Characteristics

### CPU Usage
- Less than 1% CPU overhead for 10-band EQ processing
- Optimized filter updates using Web Audio API scheduling
- Efficient Canvas rendering with requestAnimationFrame

### Memory Management
- Proper cleanup of audio nodes on component unmount
- Cancellation of scheduled parameter changes
- Garbage collection friendly implementation

### Real-Time Performance
- Sub-millisecond latency for parameter changes
- Smooth frequency response updates
- No audio dropouts during EQ adjustments

## Cross-Browser Compatibility

Tested and working on:
- Chrome 66+ (recommended)
- Firefox 60+
- Safari 14+
- Edge 79+

Handles browser-specific quirks:
- AudioContext autoplay policies
- Vendor prefixes for Web Audio API

## Technical Details

1. Built real time parametric EQ using only browser APIs
2. Real-time frequency response visualization without charting libraries
3. Multi-format preset compatibility (AutoEQ, PowerAmp, Qudelix)
4. Low latency parameter updates during playback
5. Memory efficient audio node management
6. Cross platform preset sharing capability for multi-format PEQ templates

## File Structure Summary

```
src/utils/audio/
├── peqGraph.js                 # Core audio processing engine

src/components/
├── AudioPlayer.jsx             # Audio context and integration
├── PeqPanel.jsx               # EQ control interface
├── PeqResponseChart.jsx       # Frequency response visualization
└── ClippingMonitor.jsx        # Real-time clipping detection

src/utils/
├── peqPresets.js              # Preset management system
├── peqIO.js                   # AutoEQ import/export
├── presetLibrary.js           # Local storage management
└── converters/
    ├── powerampConverter.js   # PowerAmp XML export
    └── qudelixConverter.js    # Qudelix JSON export
```