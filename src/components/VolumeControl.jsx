import React, { useEffect, useMemo, useRef } from "react";
import "../styles/VolumeControl.css";

const VOLUME_STOPS = [0, 0.1, 0.25, 0.5, 0.75, 1];

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

  useEffect(() => {
    if (volume > 0) {
      lastVolumeRef.current = volume;
    }
  }, [volume]);

  const activeIndex = useMemo(() => {
    const nearest = VOLUME_STOPS.reduce((prev, stop) => (Math.abs(stop - volume) < Math.abs(prev - volume) ? stop : prev), 0);
    return VOLUME_STOPS.indexOf(nearest);
  }, [volume]);

  const fillPercent = Math.round(volume * 100);

  const applyStep = (index) => {
    const clampedIndex = Math.min(Math.max(index, 0), VOLUME_STOPS.length - 1);
    onVolumeChange(VOLUME_STOPS[clampedIndex]);
  };

  const handleSliderKeyDown = (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      applyStep(activeIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      applyStep(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      applyStep(0);
    } else if (event.key === "End") {
      event.preventDefault();
      applyStep(VOLUME_STOPS.length - 1);
    }
  };

  const handleToggleMute = () => {
    if (volume === 0) {
      onVolumeChange(lastVolumeRef.current || 0.5);
    } else {
      onVolumeChange(0);
    }
  };

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

      <div
        className="volume-steps"
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fillPercent}
        aria-valuetext={`${fillPercent} percent`}
        style={{ "--volume-fill": `${fillPercent}%` }}
        onKeyDown={handleSliderKeyDown}
      >
        {VOLUME_STOPS.map((stop, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={stop}
              type="button"
              className={`volume-step${isActive ? " is-active" : ""}`}
              onClick={() => applyStep(index)}
              tabIndex={-1}
              aria-hidden="true"
            >
              <span className="volume-step-dot" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <span className="volume-percentage" aria-hidden="true">
        {fillPercent}%
      </span>
    </div>
  );
};

export default VolumeControl;
