import React from "react";
import { formatTime } from "../../util/timeUtils";
import "../styles/ProgressBar.css";

const ProgressBar = ({
  trackProgress,
  duration,
  onDrag,
  onDragEnd,
  trackStyling,
  progressBarRef,
}) => {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeProgress = Number.isFinite(trackProgress) ? trackProgress : 0;
  const clampedProgress = Math.min(Math.max(safeProgress, 0), safeDuration || safeProgress);

  const handleChange = (event) => {
    const value = parseFloat(event.target.value);
    onDrag(Number.isFinite(value) ? value : 0);
  };

  return (
    <div className="progress-container">
      <input
        ref={progressBarRef}
        type="range"
        value={clampedProgress}
        step="1"
        min="0"
        max={safeDuration}
        className="progress"
        onChange={handleChange}
        onMouseUp={onDragEnd}
        onTouchEnd={onDragEnd}
        onKeyUp={onDragEnd}
        style={trackStyling ? { background: trackStyling } : undefined}
        role="slider"
        aria-label="Track progress"
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={clampedProgress}
      />
      <p className="time">
        {formatTime(clampedProgress)} / {formatTime(safeDuration)}
      </p>
    </div>
  );
};

export default ProgressBar;
