import React from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { DEFAULT_PRESET } from '../utils/peqPresets';
import BandControl from './BandControl';
import PeqResponseChart from './PeqResponseChart';
import PresetImportExport from './PresetImportExport';
import PresetLibrary from './PresetLibrary';
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

  const { peqBands, peqBypass, preampGain, preampAuto, currentPresetName } = peqState;



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
        <h3>Parametric EQ</h3>
        
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
    </div>
  );
};

export default PeqPanel;