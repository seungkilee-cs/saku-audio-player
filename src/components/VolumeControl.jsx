import React, { useEffect, useMemo, useRef } from "react";
import { HiMiniSpeakerWave, HiMiniSpeakerXMark } from "react-icons/hi2";
import "../styles/VolumeControl.css";

const VOLUME_STOPS = [0, 0.1, 0.25, 0.5, 0.75, 1];

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
        {volume === 0 ? <HiMiniSpeakerXMark size={18} /> : <HiMiniSpeakerWave size={18} />}
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
