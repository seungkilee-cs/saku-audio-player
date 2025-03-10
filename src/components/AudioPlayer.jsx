// Need to fix the state discrepency when next track is invoked
import React, { useState, useEffect, useRef, useCallback } from "react";
import AudioControls from "./AudioControls";
import Backdrop from "./Backdrop";
import "../styles/AudioPlayer.css";

const AudioPlayer = ({ tracks }) => {
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackProgress, setTrackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [userInteracted, setUserInteracted] = useState(false);

  const { title, artist, album, color, image, audioSrc, bitrate, length } =
    tracks[trackIndex];

  const audioRef = useRef(new Audio(audioSrc));
  const intervalRef = useRef();
  const isReady = useRef(false);

  const { duration } = audioRef.current;

  const currentPercentage = duration
    ? `${(trackProgress / duration) * 100}%`
    : "0%";
  const trackStyling = `
    -webkit-gradient(linear, 0% 0%, 100% 0%, color-stop(${currentPercentage}, #fff), color-stop(${currentPercentage}, #777))
  `;

  // Start the timer for progress updates
  const startTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (audioRef.current.ended) {
        toNextTrack();
      } else {
        setTrackProgress(audioRef.current.currentTime);
      }
    }, 1000);
  }, []);

  // Handle safe playback with error handling
  const handlePlayback = useCallback(async () => {
    try {
      if (isPlaying) {
        await audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (error) {
      console.error("Playback error:", error);
      setIsPlaying(false); // Ensure playback state is consistent
    }
  }, [isPlaying]);

  // Update play/pause behavior
  useEffect(() => {
    if (!userInteracted) return;

    handlePlayback().then(() => {
      if (isPlaying) startTimer();
      else clearInterval(intervalRef.current);
    });
  }, [isPlaying, userInteracted, handlePlayback, startTimer]);

  // Handle track change behavior
  useEffect(() => {
    const playAfterInteraction = async () => {
      audioRef.current.pause();
      audioRef.current = new Audio(audioSrc);
      audioRef.current.volume = volume;
      setTrackProgress(0);

      if (isReady.current && userInteracted) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          startTimer();
        } catch (error) {
          console.error("Autoplay blocked:", error);
          setIsPlaying(false);
        }
      }
      isReady.current = true;
    };

    playAfterInteraction();
  }, [audioSrc, userInteracted, startTimer, volume]);

  // Update volume when it changes
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current.pause();
      clearInterval(intervalRef.current);
    };
  }, []);

  // Handle user interaction for play/pause
  const handleUserInteraction = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true); // Mark that the user has interacted
    }
    setIsPlaying((prev) => !prev); // Toggle play/pause state
  }, [userInteracted]);

  // Format time for display
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Navigate to the previous track
  const toPrevTrack = () => {
    setTrackIndex((prevIndex) =>
      prevIndex - 1 < 0 ? tracks.length - 1 : prevIndex - 1,
    );
  };

  // Navigate to the next track
  const toNextTrack = () => {
    setTrackIndex((prevIndex) =>
      prevIndex < tracks.length - 1 ? prevIndex + 1 : 0,
    );
  };

  // Handle progress bar drag
  const onDrag = (value) => {
    clearInterval(intervalRef.current);
    audioRef.current.currentTime = value;
    setTrackProgress(value);
  };

  // Resume playback after dragging progress bar
  const onDragEnd = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
    startTimer();
  };

  return (
    <div className="audio-player">
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
        <h5 className="album">{album}</h5>
        <div className="track-info-extra">
          <span className="bitrate">Bitrate: {bitrate} kbps</span>
          <span className="length">Length: {formatTime(length)}</span>
        </div>
        <AudioControls
          isPlaying={isPlaying}
          onPrevClick={toPrevTrack}
          onNextClick={toNextTrack}
          onPlayPauseClick={handleUserInteraction}
        />
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
        <p className="time">
          {formatTime(trackProgress)} / {formatTime(duration || "0")}
        </p>
      </div>
      <Backdrop
        trackIndex={trackIndex}
        activeColor={color}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default AudioPlayer;
