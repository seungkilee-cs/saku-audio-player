import React, { useMemo } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { DEFAULT_PRESET } from '../utils/peqPresets';
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
    togglePeqPreampAuto,
    clearPeqSettings
  } = usePlayback();

  const { peqBands, peqBypass, preampGain, preampAuto, currentPresetName, peqNodes } = peqState;

  // Load preset library for keyboard shortcuts
  const presetLibrary = useMemo(() => {
    try {
      return loadPresetLibrary();
    } catch (error) {
      console.warn('Could not load preset library:', error);
      return [];
    }
  }, []);

  // Keyboard shortcut actions
  const shortcutActions = useMemo(() => ({
    toggleBypass: () => togglePeqBypass(),
    previousPreset: () => cyclePrevPreset(),
    nextPreset: () => cycleNextPreset(),
    resetToFlat: () => loadPeqPreset(DEFAULT_PRESET)
  }), [togglePeqBypass, loadPeqPreset]);

  // Preset cycling logic
  const cyclePrevPreset = () => {
    if (presetLibrary.length === 0) return;
    
    const currentIndex = presetLibrary.findIndex(p => p.name === currentPresetName);
    const prevIndex = currentIndex <= 0 ? presetLibrary.length - 1 : currentIndex - 1;
    loadPeqPreset(presetLibrary[prevIndex]);
  };

  const cycleNextPreset = () => {
    if (presetLibrary.length === 0) return;
    
    const currentIndex = presetLibrary.findIndex(p => p.name === currentPresetName);
    const nextIndex = currentIndex >= presetLibrary.length - 1 ? 0 : currentIndex + 1;
    loadPeqPreset(presetLibrary[nextIndex]);
  };

  // Enable keyboard shortcuts
  const { shortcuts } = useKeyboardShortcuts(shortcutActions, true);



  const handlePreampChange = (e) => {
    const gain = parseFloat(e.target.value);
    setPeqPreamp(gain, { autoOverride: false });
  };

  const handleResetToFlat = () => {
    loadPeqPreset(DEFAULT_PRESET);
  };

  return (
    <div className="peq-panel">
      <div className="peq-panel__header">
        <div className="peq-panel__title-section">
          <h3>Parametric EQ</h3>
          <ClippingMonitor peqChain={peqNodes} />
        </div>
        
        <div className="peq-panel__global-controls">
          <div className="peq-control-group">
            <label>Current Preset:</label>
            <span className="peq-current-preset">{currentPresetName}</span>
          </div>

          <div className="peq-control-group">
            <button 
              type="button"
              className={`peq-bypass-btn ${peqBypass ? 'bypassed' : ''}`}
              onClick={() => togglePeqBypass()}
            >
              {peqBypass ? 'Bypassed' : 'Active'}
            </button>
          </div>

          <div className="peq-control-group">
            <label htmlFor="preamp-slider">
              Preamp: {preampGain.toFixed(1)} dB
              {preampAuto && <span className="auto-indicator">(Auto)</span>}
            </label>
            <input
              id="preamp-slider"
              type="range"
              min="-12"
              max="12"
              step="0.1"
              value={preampGain}
              onChange={handlePreampChange}
            />
            <button 
              type="button"
              className={`auto-toggle ${preampAuto ? 'active' : ''}`}
              onClick={() => togglePeqPreampAuto()}
            >
              Auto
            </button>
          </div>

          <button 
            type="button"
            className="reset-btn"
            onClick={handleResetToFlat}
          >
            Reset
          </button>

          <button 
            type="button"
            className="clear-settings-btn"
            onClick={() => {
              if (window.confirm('Clear all saved EQ settings and reset to default? This cannot be undone.')) {
                clearPeqSettings();
              }
            }}
            title="Clear all saved settings and reset to default"
          >
            Clear All
          </button>
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

      <PresetImportExport />

      <PresetLibrary />

      {/* Keyboard Shortcuts Help */}
      <div className="peq-panel__shortcuts-help">
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
      </div>
    </div>
  );
};

export default PeqPanel;