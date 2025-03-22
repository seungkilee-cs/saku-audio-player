import React from "react";
import Play from "../assets/img/play.svg?react";
import Pause from "../assets/img/pause.svg?react";
import Next from "../assets/img/next.svg?react";
import Prev from "../assets/img/prev.svg?react";
import Forward10 from "../assets/img/forward10.svg?react";
import Backward10 from "../assets/img/backward10.svg?react";

const AudioControls = ({
  isPlaying,
  onPlayPauseClick,
  onPrevClick,
  onNextClick,
  onForward10Click,
  onBackward10Click,
}) => (
  <div className="audio-controls">
    <button
      type="button"
      className="prev"
      aria-label="Previous"
      onClick={onPrevClick}
    >
      <Prev />
    </button>
    <button
      type="button"
      className="backward-10"
      aria-label="Backward 10 seconds"
      onClick={onBackward10Click}
    >
      <Backward10 />
    </button>
    {isPlaying ? (
      <button
        type="button"
        className="pause"
        onClick={() => onPlayPauseClick(false)}
        aria-label="Pause"
      >
        <Pause />
      </button>
    ) : (
      <button
        type="button"
        className="play"
        onClick={() => onPlayPauseClick(true)}
        aria-label="Play"
      >
        <Play />
      </button>
    )}
    <button
      type="button"
      className="forward-10"
      aria-label="Forward 10 seconds"
      onClick={onForward10Click}
    >
      <Forward10 />
    </button>
    <button
      type="button"
      className="next"
      aria-label="Next"
      onClick={onNextClick}
    >
      <Next />
    </button>
  </div>
);

export default AudioControls;
