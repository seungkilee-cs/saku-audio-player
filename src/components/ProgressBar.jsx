import React, { useId } from "react";
import { formatTime } from "../../util/timeUtils";
import "../styles/ProgressBar.css";

const ProgressBar = ({
  trackProgress,
  duration,
  onDrag,
  onDragEnd,
  trackStyling,
  progressBarRef,
  showMeta = true,
}) => {
  const sliderId = useId();
  const labelId = `${sliderId}-label`;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeProgress = Number.isFinite(trackProgress) ? trackProgress : 0;
  const clampedProgress = Math.min(Math.max(safeProgress, 0), safeDuration || safeProgress);
  const progressValueText = safeDuration
    ? `${formatTime(clampedProgress)} of ${formatTime(safeDuration)}`
    : `${formatTime(clampedProgress)} elapsed`;

  const handleChange = (event) => {
    const value = parseFloat(event.target.value);
    onDrag(Number.isFinite(value) ? value : 0);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Home") {
      event.preventDefault();
      onDrag(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onDrag(safeDuration);
    }
  };

  return (
    <div className="progress-container">
      {showMeta ? (
        <div className="progress-meta">
          <span id={labelId} className="progress-label">
            Playback
          </span>
          <div className="progress-time">
            <span className="progress-time__current">{formatTime(clampedProgress)}</span>
            <span className="progress-time__divider" aria-hidden="true">
              /
            </span>
            <span className="progress-time__duration">{formatTime(safeDuration)}</span>
          </div>
        </div>
      ) : null}
      <div className="progress-slider">
        <input
          id={sliderId}
          ref={progressBarRef}
          type="range"
          value={clampedProgress}
          step="1"
          min="0"
          max={safeDuration}
          className="progress-slider__input"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onMouseUp={onDragEnd}
          onTouchEnd={onDragEnd}
          onKeyUp={onDragEnd}
          style={trackStyling ? { background: trackStyling } : undefined}
          role="slider"
          aria-label="Track progress"
          aria-describedby={showMeta ? labelId : undefined}
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={clampedProgress}
          aria-valuetext={progressValueText}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
