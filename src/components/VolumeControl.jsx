import React, { useRef } from "react";
import { IoMdVolumeHigh, IoMdVolumeOff, IoMdVolumeLow } from "react-icons/io";
import "../styles/VolumeControl.css";

const VolumeControl = ({ volume, onVolumeChange }) => {
  const containerRef = useRef(null);

  const handleClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.right - rect.left;
    const clickX = e.clientX - rect.left;
    const newVolume = clickX / width;
    onVolumeChange(Math.max(0, Math.min(1, newVolume)));
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onVolumeChange(Math.min(volume + 0.1, 1));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onVolumeChange(Math.max(volume - 0.1, 0));
    }
  };

  return (
    <div
      className="volume-control"
      ref={containerRef}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(volume * 100)}
    >
      <span className="volume-percentage">{Math.round(volume * 100)}%</span>
      <div className="volume-bar">
        <div
          className="volume-fill"
          style={{ width: `${volume * 100}%` }}
        ></div>
        <div className="volume-100-mark"></div>
      </div>
      <div className="volume-icon">
        {volume === 0 ? (
          <IoMdVolumeOff size={25} />
        ) : volume < 0.5 ? (
          <IoMdVolumeLow size={25} />
        ) : (
          <IoMdVolumeHigh size={25} />
        )}
      </div>
    </div>
  );
};

export default VolumeControl;
