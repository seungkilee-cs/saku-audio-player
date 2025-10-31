# Parametric EQ Feature Set

## Signal Processing
- 10-band parametric equalizer implemented with Web Audio API biquad filters
- Auto-preamp calculation to prevent clipping when boosting bands
- Real-time frequency response computation for visualization
- Clipping detection and status feedback
- Bypass toggle for A/B comparison of processed vs. dry signal

## Preset Management
- Load default preset on initialization with normalization of band data
- Import AutoEQ ParametricEQ.txt and other supported preset formats
- Export presets in JSON, AutoEQ text, PowerAmp XML, and Qudelix JSON
- Persist PEQ state (bands, preamp, bypass, presets) to localStorage
- Library management with search, add/remove, and recent history

## UI & Interaction
- Responsive PEQ panel with grouped controls and tabs
- Gain sliders with vertical orientation and keyboard accessibility
- Frequency/Q controls with numeric inputs and slider combos
- Real-time response chart (with glow and petal toggles)
- AutoEQ search integration with async status handling

## Accessibility & UX
- Keyboard shortcuts for toggling bypass, loading presets, resetting EQ
- Focus management for sliders and inputs
- Visual cues for active bands, auto modes, and clipping conditions
