import React from "react";

const Controls = ({
  isPlaying,
  onPlayPause,
  onPrevious,
  onNext,
  onForward,
  onRewind,
}) => {
  return (
    <div className="controls">
      <button onClick={onRewind}>-10s</button>
      <button onClick={onPrevious}>Previous</button>
      <button onClick={onPlayPause}>{isPlaying ? "Pause" : "Play"}</button>
      <button onClick={onNext}>Next</button>
      <button onClick={onForward}>+10s</button>
    </div>
  );
};

export default Controls;
