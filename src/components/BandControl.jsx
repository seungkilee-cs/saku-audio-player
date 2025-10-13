import React from "react";

const BandControl = ({ band, index, onChange }) => {
  const { frequency, gain, Q, type } = band;

  const handleGainChange = (e) => {
    const newGain = parseFloat(e.target.value);
    onChange({ gain: newGain });
  };

  const handleQChange = (e) => {
    const newQ = parseFloat(e.target.value);
    onChange({ Q: newQ });
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    onChange({ type: newType });
  };

  const formatFrequency = (freq) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`;
    }
    return `${freq}`;
  };

  return (
    <div className="band-control">
      <div className="band-control__header">
        <span className="band-control__frequency">
          {formatFrequency(frequency)}Hz
        </span>
      </div>

      <div className="band-control__gain">
        <input
          type="range"
          className="gain-slider"
          min="-12"
          max="12"
          step="0.1"
          value={gain}
          onChange={handleGainChange}
          orient="vertical"
        />
        <span className="gain-display">
          {gain > 0 ? "+" : ""}
          {gain.toFixed(1)} dB
        </span>
      </div>

      <div className="band-control__q">
        <label htmlFor={`q-${index}`}>Q:</label>
        <input
          id={`q-${index}`}
          type="range"
          min="0.4"
          max="5.0"
          step="0.01"
          value={Q}
          onChange={handleQChange}
          disabled={type !== "peaking"}
        />
        <span className="q-display">{Q.toFixed(2)}</span>
      </div>

      <div className="band-control__type">
        <select
          value={type}
          onChange={handleTypeChange}
          className="type-selector"
        >
          <option value="peaking">Peak</option>
          <option value="lowshelf">Low Shelf</option>
          <option value="highshelf">High Shelf</option>
          <option value="notch">Notch</option>
        </select>
      </div>
    </div>
  );
};

export default BandControl;

