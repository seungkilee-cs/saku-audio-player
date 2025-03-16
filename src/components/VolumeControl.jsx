import React from "react";

const VolumeControl = ({ volume, onVolumeChange }) => (
  <div className="volume-control">
    <label htmlFor="volume">Volume:</label>
    <input
      id="volume"
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={volume}
      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
    />
  </div>
);

export default VolumeControl;
