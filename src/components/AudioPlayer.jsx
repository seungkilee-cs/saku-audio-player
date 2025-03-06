import React, { useState, useEffect, useRef } from "react";
import AudioControls from "./AudioControls";
import Backdrop from "./Backdrop";
import "../styles/AudioPlayer.css";

const AudioPlayer = ({ tracks }) => {
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackProgress, setTrackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [userInteracted, setUserInteracted] = useState(false);

  const { title, artist, color, image, audioSrc, bitrate, length } =
    tracks[trackIndex];

  const audioRef = useRef(null);
  const intervalRef = useRef();
  const isReady = useRef(false);

  const { duration } = audioRef.current || {};

  const currentPercentage = duration
    ? `${(trackProgress / duration) * 100}%`
    : "0%";

  const trackStyling = `
    -webkit-gradient(linear, 0% 0%, 100% 0%, color-stop(${currentPercentage}, #fff), color-stop(${currentPercentage}, #777))
  `;

  const startTimer = () => {
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (audioRef.current && audioRef.current.ended) {
        toNextTrack();
      } else if (audioRef.current) {
        setTrackProgress(audioRef.current.currentTime);
      }
    }, 1000);
  };

  const onDrag = (value) => {
    clearInterval(intervalRef.current);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setTrackProgress(audioRef.current.currentTime);
    }
  };

  const onDragEnd = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
    startTimer();
  };

  const toPrevTrack = () => {
    setTrackIndex((prevIndex) =>
      prevIndex - 1 < 0 ? tracks.length - 1 : prevIndex - 1,
    );
  };

  const toNextTrack = () => {
    setTrackIndex((prevIndex) =>
      prevIndex < tracks.length - 1 ? prevIndex + 1 : 0,
    );
  };

  const playAudio = () => {
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Playback started successfully
          })
          .catch((error) => {
            console.error("Playback failed:", error);
            setIsPlaying(false);
          });
      }
    }
  };

  useEffect(() => {
    if (isPlaying) {
      if (userInteracted) {
        playAudio();
        startTimer();
      } else {
        console.warn(
          "Autoplay prevented: User interaction required. Click play to start playback.",
        );
        setIsPlaying(false);
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
      clearInterval(intervalRef.current);
    }
  }, [isPlaying, userInteracted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = audioSrc;
      setTrackProgress(0);

      if (isReady.current) {
        audioRef.current.load();
        setIsPlaying(false);
      } else {
        isReady.current = true;
      }
    }
  }, [trackIndex, audioSrc]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleUserInteraction = () => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="audio-player">
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" />}

      {/* Track Info Section */}
      <div className="track-info">
        {image && (
          <img
            className="artwork"
            src={image}
            alt={`track artwork for ${title} by ${artist}`}
          />
        )}
        <h2 className="title">{title}</h2>
        <h3 className="artist">{artist}</h3>

        {/* Extra Info: Bitrate and Length */}
        <div className="track-info-extra">
          <span className="bitrate">Bitrate: {bitrate} kbps</span>
          <span className="length">Length: {formatTime(length)}</span>
        </div>

        {/* Play/Pause Button */}
        <button onClick={handleUserInteraction}>
          {isPlaying ? "Pause" : "Play"}
        </button>

        {/* Audio Controls */}
        <AudioControls
          isPlaying={isPlaying}
          onPrevClick={toPrevTrack}
          onNextClick={toNextTrack}
          onPlayPauseClick={handleUserInteraction}
        />

        {/* Progress Bar */}
        <input
          type="range"
          value={trackProgress}
          step="1"
          min="0"
          max={duration ? duration : `${duration}`}
          className="progress"
          onChange={(e) => onDrag(e.target.value)}
          onMouseUp={onDragEnd}
          onKeyUp={onDragEnd}
          style={{ background: trackStyling }}
        />

        {/* Volume Control */}
        <div className="volume-control">
          <label htmlFor="volume">Volume:</label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>

        {/* Time Display */}
        <p className="time">
          {formatTime(trackProgress)} / {formatTime(duration || 0)}
        </p>
      </div>

      {/* Backdrop */}
      <Backdrop
        trackIndex={trackIndex}
        activeColor={color}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default AudioPlayer;
