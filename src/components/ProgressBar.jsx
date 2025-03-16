import React from "react";
import { formatTime } from "../../util/timeUtils";

const ProgressBar = ({
  trackProgress,
  duration,
  onDrag,
  onDragEnd,
  trackStyling,
}) => {
  return (
    <div className="progress-container">
      <input
        type="range"
        value={trackProgress}
        step="1"
        min="0"
        max={duration || `${duration}`}
        className="progress"
        onChange={(e) => onDrag(parseFloat(e.target.value))}
        onMouseUp={onDragEnd}
        onKeyUp={onDragEnd}
        style={{ background: trackStyling }}
      />
      <p className="time">
        {formatTime(trackProgress)} / {formatTime(duration || 0)}
      </p>
    </div>
  );
};

export default ProgressBar;
