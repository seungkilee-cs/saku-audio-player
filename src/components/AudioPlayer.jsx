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

  const { title, artist, color, image, audioSrc, bitrate, length } =
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

  const onDrag = useCallback((value) => {
    clearInterval(intervalRef.current);
    audioRef.current.currentTime = value;
    setTrackProgress(value);
  }, []);

  const onDragEnd = useCallback(() => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
    startTimer();
  }, [isPlaying, startTimer]);

  const toPrevTrack = useCallback(() => {
    setTrackIndex(
      (prevIndex) => (prevIndex - 1 + tracks.length) % tracks.length,
    );
  }, [tracks.length]);

  const toNextTrack = useCallback(() => {
    setTrackIndex((prevIndex) => (prevIndex + 1) % tracks.length);
  }, [tracks.length]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play();
      startTimer();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, startTimer]);

  useEffect(() => {
    audioRef.current.pause();
    audioRef.current = new Audio(audioSrc);
    setTrackProgress(audioRef.current.currentTime);

    if (isReady.current) {
      audioRef.current.play();
      setIsPlaying(true);
      startTimer();
    } else {
      isReady.current = true;
    }
  }, [audioSrc, startTimer]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      audioRef.current.pause();
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleUserInteraction = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    togglePlayPause();
  }, [userInteracted, togglePlayPause]);

  const formatTime = useCallback((time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

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
          max={duration || 0}
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
          {formatTime(trackProgress)} / {formatTime(duration || 0)}
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
