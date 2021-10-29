import React from "react";
import { ReactComponent as Play } from '../assets/img/play.svg';
import { ReactComponent as Pause } from '../assets/img/pause.svg';
import { ReactComponent as Next } from '../assets/img/next.svg';
import { ReactComponent as Prev } from '../assets/img/prev.svg';

const AudioControls = ({
    isPlaying,
    onPlayPauseClick,
    onPrevClick,
    onNextClick
}) => (
    <div className="audio-controls">
        {/* Prev Button */}
        <button
            type="button"
            className="prev"
            aria-label="Previous"
            onClick={onPrevClick}
        >
            <Prev/>
        </button>
        {/* Play/Pause Button */}
        {isPlaying ? (
            <button
                type="button"
                className="pause"
                onClick={() => onPlayPauseClick(false)}
                aria-label="Pause"
            >
                <Pause/>
            </button>
        ) : (
            <button
                type="button"
                className="play"
                onClick={() => onPlayPauseClick(true)}
                aria-label="Play"
            >
                <Play/>
            </button>
        )}
        {/* Next Button */}
        <button
            type="button"
            className="next"
            aria-label="Next"
            onClick={onNextClick}
        >
            <Next/>
        </button>
    </div>
);

export default AudioControls;