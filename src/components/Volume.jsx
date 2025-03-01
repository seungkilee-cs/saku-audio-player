import * as React from "react";

const Volume = ({ volume, onVolumeIconClick }) => (
  <div className="volume">
    <button
      type="button"
      className="pause"
      onClick={() => onVolumeIconClick(false)}
      aria-label="Pause"
    ></button>
  </div>
);

export default Volume;
