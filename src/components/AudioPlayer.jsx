import React, { useState, useEffect, useRef, useCallback } from "react";
import AudioControls from "./AudioControls";
import Backdrop from "./Backdrop";
import TrackInfo from "./TrackInfo";
import VolumeControl from "./VolumeControl";
import ProgressBar from "./ProgressBar";
import { formatTime } from "../../util/timeUtils";
import "../styles/AudioPlayer.css";

const AudioPlayer = ({ tracks = [], currentTrackIndex, onTrackChange, onNext, onPrevious }) => {
  const [trackProgress, setTrackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const trackList = Array.isArray(tracks) ? tracks : [];
  const trackCount = trackList.length;
  const currentTrack = trackList[currentTrackIndex] || null;

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
  } = currentTrack || {};

  const audioRef = useRef(new Audio(audioSrc || ""));
  const intervalRef = useRef();
  const isReady = useRef(false);
  const progressBarRef = useRef();

  const rawDuration = audioRef.current?.duration;
  const duration = Number.isFinite(rawDuration) ? rawDuration : 0;
  const progressPercent = duration > 0 ? (trackProgress / duration) * 100 : 0;
  const clampedPercent = Math.min(Math.max(progressPercent, 0), 100);
  const trackStyling = `linear-gradient(to right, #fff ${clampedPercent}%, rgba(255,255,255,0.3) ${clampedPercent}%)`;

  // Start timer for progress bar updates
  const startTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (audioRef.current.ended) {
        if (onNext) {
          onNext();
        } else if (trackCount > 0 && typeof onTrackChange === "function") {
          onTrackChange(currentTrackIndex < trackCount - 1 ? currentTrackIndex + 1 : 0);
        }
      } else {
        setTrackProgress(audioRef.current.currentTime);
      }
    }, 1000);
  }, [currentTrackIndex, onTrackChange, onNext, trackCount]);

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
    if (!audioSrc) {
      audioRef.current.pause();
      setIsPlaying(false);
      setTrackProgress(0);
      return;
    }

    audioRef.current.pause();
    audioRef.current = new Audio(audioSrc);
    audioRef.current.volume = volume;
    setTrackProgress(0);

    if (isReady.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          startTimer();
        })
        .catch((error) => {
          console.warn("Autoplay prevented", error);
          setIsPlaying(false);
        });
    } else {
      isReady.current = true;
    }
  }, [audioSrc, startTimer, volume]);

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
    if (onPrevious) {
      onPrevious();
    } else if (typeof onTrackChange === "function" && trackCount > 0) {
      onTrackChange(currentTrackIndex - 1 < 0 ? trackCount - 1 : currentTrackIndex - 1);
    }
  };

  // Navigate to next track
  const toNextTrack = () => {
    if (onNext) {
      onNext();
    } else if (typeof onTrackChange === "function") {
      const nextIndex = trackCount > 0 ? (currentTrackIndex + 1) % trackCount : 0;
      onTrackChange(nextIndex);
    }
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
      {currentTrack ? (
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
      ) : (
        <div className="track-info">
          <h2 className="title">No track selected</h2>
          <p className="artist">Upload audio files or select from the playlist.</p>
        </div>
      )}
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
        activeColor={color || "rgba(0,0,0,0.4)"}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default AudioPlayer;
