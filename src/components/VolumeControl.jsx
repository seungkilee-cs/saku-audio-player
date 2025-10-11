import React, { useEffect, useRef, useState } from "react";
import "../styles/VolumeControl.css";

const SpeakerIcon = ({ muted = false }) => (
  <svg className="volume-toggle__icon" viewBox="0 0 24 24" role="presentation" aria-hidden="true">
    <path
      className="volume-toggle__icon-body"
      d="M4 9.5h2.8L11 6v12l-4.2-3.5H4z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {muted ? (
      <g className="volume-toggle__icon-mute">
        <line x1="15.5" y1="9" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="21" y1="9" x2="15.5" y2="14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ) : (
      <g className="volume-toggle__icon-waves">
        <path
          d="M15.2 9.2c1.35 1.05 2.2 2.7 2.2 4.3s-0.85 3.25-2.2 4.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M17.8 7c2.2 1.75 3.5 4.2 3.5 6.7s-1.3 4.95-3.5 6.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
    )}
  </svg>
);

const VolumeControl = ({ volume, onVolumeChange }) => {
  const lastVolumeRef = useRef(0.75);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  useEffect(() => {
    if (volume > 0) {
      lastVolumeRef.current = volume;
    }
  }, [volume]);

  const fillPercent = Math.round(volume * 100);

  const handleSliderChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    onVolumeChange(newVolume);
  };

  const handleSliderKeyDown = (event) => {
    const step = event.shiftKey ? 0.01 : 0.05; // Fine control with Shift
    
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      const newVolume = Math.min(1, volume + step);
      onVolumeChange(newVolume);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      const newVolume = Math.max(0, volume - step);
      onVolumeChange(newVolume);
    } else if (event.key === "Home") {
      event.preventDefault();
      onVolumeChange(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onVolumeChange(1);
    }
  };

  const handleToggleMute = () => {
    if (volume === 0) {
      onVolumeChange(lastVolumeRef.current || 0.5);
    } else {
      onVolumeChange(0);
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="volume-control" role="group" aria-label="Volume">
      <button
        type="button"
        className="volume-toggle"
        onClick={handleToggleMute}
        aria-label={volume === 0 ? "Unmute" : "Mute"}
      >
        <SpeakerIcon muted={volume === 0} />
      </button>

      <div className="volume-slider-container">
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleSliderChange}
          onKeyDown={handleSliderKeyDown}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className={`volume-slider ${isDragging ? 'dragging' : ''}`}
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPercent}
          aria-valuetext={`${fillPercent} percent`}
        />
        <div 
          className="volume-slider-track"
          style={{ "--volume-fill": `${fillPercent}%` }}
        >
          <div className="volume-slider-fill" />
          <div className="volume-slider-thumb" />
        </div>
      </div>

      <span className="volume-percentage" aria-hidden="true">
        {fillPercent}%
      </span>
    </div>
  );
};

export default VolumeControl;
