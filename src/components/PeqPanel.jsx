import React, { useMemo, useCallback, useState } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { DEFAULT_PRESET, BUNDLED_PRESETS } from '../utils/peqPresets';
import { loadPresetLibrary } from '../utils/presetLibrary';
import BandControl from './BandControl';
import PeqResponseChart from './PeqResponseChart';
import PresetImportExport from './PresetImportExport';
import PresetLibrary from './PresetLibrary';
import ClippingMonitor from './ClippingMonitor';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import '../styles/PeqPanel.css';

const PeqPanel = () => {
  const {
    peqState,
    updatePeqBand,
    loadPeqPreset,
    togglePeqBypass,
    setPeqPreamp,
    togglePeqPreampAuto
  } = usePlayback();

  const { peqBands, peqBypass, preampGain, preampAuto, currentPresetName, peqNodes } = peqState;

  // State to trigger preset library refresh when presets are added/removed
  const [presetLibraryVersion, setPresetLibraryVersion] = useState(0);

  // Load preset library for keyboard shortcuts (bundled + user presets)
  const presetLibrary = useMemo(() => {
    try {
      const userPresets = loadPresetLibrary();
      const bundledPresets = Object.values(BUNDLED_PRESETS);
      return [...bundledPresets, ...userPresets];
    } catch (error) {
      console.warn('Could not load preset library:', error);
      return Object.values(BUNDLED_PRESETS);
    }
  }, [presetLibraryVersion]); // Fixed: Add dependency to trigger re-evaluation

  // Function to refresh preset library when presets are added/removed
  const refreshPresetLibrary = useCallback(() => {
    setPresetLibraryVersion(prev => prev + 1);
  }, []);

  // Preset cycling logic
  const cyclePrevPreset = useCallback(() => {
    if (presetLibrary.length === 0) return;

    const currentIndex = presetLibrary.findIndex(p => p.name === currentPresetName);
    // If not found (-1) or at first preset (0), go to last preset
    const prevIndex = (currentIndex <= 0) ? presetLibrary.length - 1 : currentIndex - 1;
    loadPeqPreset(presetLibrary[prevIndex]);
  }, [presetLibrary, currentPresetName, loadPeqPreset]);

  const cycleNextPreset = useCallback(() => {
    if (presetLibrary.length === 0) return;

    const currentIndex = presetLibrary.findIndex(p => p.name === currentPresetName);
    // If not found (-1) or at last preset, go to first preset
    const nextIndex = (currentIndex < 0 || currentIndex >= presetLibrary.length - 1) ? 0 : currentIndex + 1;
    loadPeqPreset(presetLibrary[nextIndex]);
  }, [presetLibrary, currentPresetName, loadPeqPreset]);

  // Keyboard shortcut actions
  const shortcutActions = useMemo(() => ({
    toggleBypass: () => togglePeqBypass(),
    previousPreset: cyclePrevPreset,
    nextPreset: cycleNextPreset,
    resetToFlat: () => loadPeqPreset(DEFAULT_PRESET)
  }), [togglePeqBypass, cyclePrevPreset, cycleNextPreset, loadPeqPreset]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts(shortcutActions, true);



  const handlePreampChange = (e) => {
    const gain = parseFloat(e.target.value);
    setPeqPreamp(gain, { autoOverride: false });
  };

  const handleResetToFlat = () => {
    loadPeqPreset(DEFAULT_PRESET);
  };

  return (
    <div className="peq-panel">
      {/* Header with Clipping Monitor */}
      <div className="peq-panel__title-section">
        <h3>Equalizer</h3>
        <ClippingMonitor peqChain={peqNodes} />
      </div>

      {/* Compact Controls */}
      <div className="peq-panel__global-controls">
        {/* Preset Navigation */}
        <div className="peq-panel__preset-row">
          <div className="peq-panel__preset-name" title={currentPresetName}>
            {currentPresetName}
          </div>
          <div className="peq-panel__preset-actions">
            <button
              type="button"
              className="peq-panel__preset-nav"
              onClick={cyclePrevPreset}
              title="Previous Preset (Shift + ←)"
              aria-label="Previous Preset"
            >
              ◀
            </button>
            <button
              type="button"
              className="peq-panel__preset-nav"
              onClick={cycleNextPreset}
              title="Next Preset (Shift + →)"
              aria-label="Next Preset"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="peq-panel__quick-actions">
          <button
            type="button"
            className={`peq-bypass-btn ${peqBypass ? 'bypassed' : ''}`}
            onClick={() => togglePeqBypass()}
            title={peqBypass ? 'EQ is Bypassed (Press T)' : 'EQ is Active (Press T)'}
          >
            {peqBypass ? 'Bypassed' : 'Active'}
          </button>

          <button
            type="button"
            className="reset-btn"
            onClick={handleResetToFlat}
            title="Reset to Flat (Press R)"
          >
            Reset to Flat
          </button>
        </div>

        {/* Preamp Control */}
        <div className="peq-control-group">
          <label htmlFor="preamp-slider">
            <span>Preamp</span>
            <span className="peq-control-group__value">
              {preampGain.toFixed(1)} dB
              {preampAuto && <span className="auto-indicator"> (Auto)</span>}
            </span>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              id="preamp-slider"
              type="range"
              min="-12"
              max="12"
              step="0.1"
              value={preampGain}
              onChange={handlePreampChange}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className={`auto-toggle ${preampAuto ? 'active' : ''}`}
              onClick={() => togglePeqPreampAuto()}
              title="Toggle Auto Preamp"
            >
              Auto
            </button>
          </div>
        </div>
      </div>

      <PeqResponseChart height={250} />

      <div className="peq-panel__bands">
        {peqBands.map((band, index) => (
          <BandControl
            key={index}
            band={band}
            index={index}
            onChange={(updates) => updatePeqBand(index, updates)}
          />
        ))}
      </div>

      <PresetImportExport onPresetAdded={refreshPresetLibrary} />

      <PresetLibrary onPresetChanged={refreshPresetLibrary} />

      {/* Keyboard Shortcuts Help - Moved to Header Modal */}
      {/* <div className="peq-panel__shortcuts-help">
        <details>
          <summary>Keyboard Shortcuts</summary>
          <div className="shortcuts-help-content">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <kbd className="shortcut-key">{shortcut.key}</kbd>
                <span className="shortcut-description">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </details>
      </div> */}
    </div>
  );
};

export default PeqPanel;