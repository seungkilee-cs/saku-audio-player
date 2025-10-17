# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2024-10-17

### Added
- **Frequency Response Calculation**: New utilities for calculating theoretical frequency response
  - `calculateFrequencyResponse(bands, options)` - Calculate complete frequency response from band array
  - `calculateProcessorResponse(peqState, options)` - Calculate response from PEQProcessor state
  - `calculateBandResponse(frequency, band)` - Calculate single band response at specific frequency
  - `generateFrequencies(numPoints)` - Generate logarithmic frequency points (20Hz-20kHz)
  - `getResponseAtFrequencies(bands, frequencies)` - Get response at specific frequencies
- **Visualization Support**: Independent of Web Audio API nodes, works for visualization and analysis
- **Examples**: Added frequency response calculation examples
- **Documentation**: Updated README with frequency response usage examples

### Improved
- **Bell Curve Accuracy**: Improved peaking EQ response calculation using proper bell curve mathematics
- **Q Factor Handling**: Better bandwidth calculation based on Q factor for more accurate curves
- **Filter Types**: Enhanced support for all filter types (peaking, lowshelf, highshelf, lowpass, highpass)

### Technical Details
- Uses simplified but accurate bell curve math instead of complex biquad calculations
- Q factor properly controls bandwidth: higher Q = narrower curves, lower Q = wider curves
- Smooth transitions for shelf filters with proper rolloff characteristics
- Frequency response calculation is independent of audio playback state

## [0.0.1] - Initial Release

### Added
- Basic PEQProcessor class
- Web Audio API integration
- Preset management
- Import/export utilities
- Core PEQ chain creation and management