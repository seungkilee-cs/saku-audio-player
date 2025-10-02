import React, { useState, useEffect, useRef, useCallback } from "react";
import AudioControls from "./AudioControls";
import Backdrop from "./Backdrop";
import TrackInfo from "./TrackInfo";
import VolumeControl from "./VolumeControl";
import ProgressBar from "./ProgressBar";
import { formatTime } from "../../util/timeUtils";
import "../styles/AudioPlayer.css";

const AudioPlayer = ({ tracks, currentTrackIndex, onTrackChange }) => {
  const [trackProgress, setTrackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const {
    title,
    artist,
    album,
    color,
    image,
    audioSrc,
    bitrate,
    length,
    container,
    codec,
    fileExtension,
    bitsPerSample,
    sampleRate,
    detailedBitSampleInfo,
  } = tracks[currentTrackIndex];

  const audioRef = useRef(new Audio(audioSrc));
  const intervalRef = useRef();
  const isReady = useRef(false);
  const progressBarRef = useRef();

  const rawDuration = audioRef.current.duration;
  const duration = Number.isFinite(rawDuration) ? rawDuration : 0;
  const progressPercent = duration > 0 ? (trackProgress / duration) * 100 : 0;
  const clampedPercent = Math.min(Math.max(progressPercent, 0), 100);
  const trackStyling = `linear-gradient(to right, #fff ${clampedPercent}%, rgba(255,255,255,0.3) ${clampedPercent}%)`;

  // Start timer for progress bar updates
  const startTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (audioRef.current.ended) {
        onTrackChange(
          currentTrackIndex < tracks.length - 1 ? currentTrackIndex + 1 : 0,
        );
      } else {
        setTrackProgress(audioRef.current.currentTime);
      }
    }, 1000);
  }, [currentTrackIndex, onTrackChange]);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prevIsPlaying) => {
      if (!prevIsPlaying) {
        audioRef.current.play();
        startTimer();
      } else {
        audioRef.current.pause();
        clearInterval(intervalRef.current);
      }
      return !prevIsPlaying;
    });
  }, [startTimer]);

  // Load new track when track changes
  useEffect(() => {
    audioRef.current.pause();
    audioRef.current = new Audio(audioSrc); // Only recreate when track changes
    audioRef.current.volume = volume; // Set volume for new track
    setTrackProgress(0);

    if (isReady.current) {
      audioRef.current.play();
      setIsPlaying(true);
      startTimer();
    } else {
      isReady.current = true;
    }
  }, [audioSrc, startTimer]);

  // Update volume without recreating audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      audioRef.current.pause();
      clearInterval(intervalRef.current);
    };
  }, []);

  // Navigate to previous track
  const toPrevTrack = () => {
    onTrackChange(
      currentTrackIndex - 1 < 0 ? tracks.length - 1 : currentTrackIndex - 1,
    );
  };

  // Navigate to next track
  const toNextTrack = () => {
    onTrackChange(
      currentTrackIndex < tracks.length - 1 ? currentTrackIndex + 1 : 0,
    );
  };

  // Handle progress bar drag
  const onDrag = (value) => {
    clearInterval(intervalRef.current);
    audioRef.current.currentTime = value;
    setTrackProgress(value);
  };

  const onDragEnd = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
    startTimer();
  };

  // Moving within audio
  const onForward10Click = () => {
    audioRef.current.currentTime += 10;
  };

  const onBackward10Click = () => {
    audioRef.current.currentTime = Math.max(
      audioRef.current.currentTime - 10,
      0,
    );
  };

  return (
    <div className="audio-player">
      <TrackInfo
        title={title}
        artist={artist}
        album={album}
        image={image}
        bitrate={bitrate}
        length={length}
        formatTime={formatTime}
        container={container}
        codec={codec}
        fileExtension={fileExtension}
        detailedBitSampleInfo={detailedBitSampleInfo}
      />
      <div className="audio-contols">
        <AudioControls
          isPlaying={isPlaying}
          onPrevClick={toPrevTrack}
          onNextClick={toNextTrack}
          onPlayPauseClick={handlePlayPause}
          onForward10Click={onForward10Click}
          onBackward10Click={onBackward10Click}
        />
      </div>
      <ProgressBar
        trackProgress={trackProgress}
        duration={duration}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        progressBarRef={progressBarRef}
        trackStyling={trackStyling}
        formatTime={formatTime}
      />
      <VolumeControl volume={volume} onVolumeChange={setVolume} />
      {/* <div className="progress-volume-container">
      </div> */}
      <Backdrop
        trackIndex={currentTrackIndex}
        activeColor={color}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default AudioPlayer;
