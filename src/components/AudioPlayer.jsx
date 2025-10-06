// src/components/AudioPlayer.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import Play from "../assets/img/play.svg?react";
import Pause from "../assets/img/pause.svg?react";
import Next from "../assets/img/next.svg?react";
import Prev from "../assets/img/prev.svg?react";
import Forward10 from "../assets/img/forward10.svg?react";
import Backward10 from "../assets/img/backward10.svg?react";
import VolumeControl from "./VolumeControl";
import ProgressBar from "./ProgressBar";
import { formatTime } from "../../util/timeUtils";
import "../styles/AudioPlayer.css";

const AudioPlayer = ({
  tracks = [],
  currentTrackIndex = 0,
  onTrackChange,
  onNext,
  onPrevious,
  sourceLabel,
  extraActions,
}) => {
  const [trackProgress, setTrackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const volumeRef = useRef(1);

  const trackList = Array.isArray(tracks) ? tracks : [];
  const trackCount = trackList.length;
  const currentTrack = trackList[currentTrackIndex] || null;
  const { title, artist, album, audioSrc, image, codec, bitrate } = currentTrack ?? {};

  const audioRef = useRef(new Audio());
  const intervalRef = useRef(null);
  const isReady = useRef(false);
  const isPlayingRef = useRef(false);
  const progressBarRef = useRef(null);

  const duration = Number.isFinite(audioRef.current?.duration) ? audioRef.current.duration : 0;
  const progressPercent = duration > 0 ? (trackProgress / duration) * 100 : 0;
  const clampedPercent = Math.min(Math.max(progressPercent, 0), 100);
  const progressBackground = `linear-gradient(90deg, var(--accent-color, #2563eb) ${clampedPercent}%, rgba(226, 232, 240, 0.85) ${clampedPercent}%)`;

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      if (audio.ended) {
        stopTimer();
        if (trackCount === 0) {
          setIsPlaying(false);
          isPlayingRef.current = false;
          return;
        }

        if (onNext) {
          onNext();
        } else if (typeof onTrackChange === "function") {
          const nextIndex = currentTrackIndex < trackCount - 1 ? currentTrackIndex + 1 : 0;
          onTrackChange(nextIndex);
        }
      } else {
        setTrackProgress(audio.currentTime);
      }
    }, 1000);
  }, [currentTrackIndex, onNext, onTrackChange, stopTimer, trackCount]);

  const pauseAudio = useCallback(() => {
    stopTimer();
    audioRef.current.pause();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [stopTimer]);

  const playAudio = useCallback(() => {
    if (!currentTrack || !audioRef.current.src) {
      return;
    }
    isPlayingRef.current = true;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        startTimer();
      })
      .catch((error) => {
        console.warn("Autoplay prevented", error);
        isPlayingRef.current = false;
        setIsPlaying(false);
      });
  }, [currentTrack, startTimer]);

  const handlePlayPause = useCallback(() => {
    if (!currentTrack || !audioRef.current.src) {
      return;
    }
    if (isPlayingRef.current) {
      pauseAudio();
    } else {
      playAudio();
    }
  }, [currentTrack, pauseAudio, playAudio]);

  useEffect(() => {
    const audio = audioRef.current;

    stopTimer();
    audio.pause();

    if (!audioSrc) {
      audio.removeAttribute("src");
      audio.load();
      setTrackProgress(0);
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    audio.src = audioSrc;
    audio.load();
    audio.volume = volumeRef.current;
    audio.currentTime = 0;
    setTrackProgress(0);

    const handleCanPlay = () => {
      if (isReady.current && isPlayingRef.current) {
        playAudio();
      }
    };

    audio.addEventListener("canplay", handleCanPlay);

    if (!isReady.current) {
      isReady.current = true;
    } else if (isPlayingRef.current) {
      playAudio();
    } else {
      setIsPlaying(false);
    }

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioSrc, playAudio, stopTimer]);

  useEffect(() => {
    volumeRef.current = volume;
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => pauseAudio, [pauseAudio]);

  const toPrevTrack = () => {
    if (trackCount === 0) return;
    if (onPrevious) {
      onPrevious();
    } else if (typeof onTrackChange === "function") {
      const previousIndex = currentTrackIndex - 1 < 0 ? trackCount - 1 : currentTrackIndex - 1;
      onTrackChange(previousIndex);
    }
  };

  const toNextTrack = () => {
    if (trackCount === 0) return;
    if (onNext) {
      onNext();
    } else if (typeof onTrackChange === "function") {
      const nextIndex = (currentTrackIndex + 1) % trackCount;
      onTrackChange(nextIndex);
    }
  };

  const onDrag = (value) => {
    stopTimer();
    audioRef.current.currentTime = value;
    setTrackProgress(value);
  };

  const onDragEnd = () => {
    if (!isPlayingRef.current) return;
    playAudio();
  };

  const onForward10Click = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.min(audio.currentTime + 10, duration || audio.duration || 0);
    audio.currentTime = nextTime;
    setTrackProgress(nextTime);
  };

  const onBackward10Click = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.max(audio.currentTime - 10, 0);
    audio.currentTime = nextTime;
    setTrackProgress(nextTime);
  };

  const currentTimeLabel = formatTime(Math.min(trackProgress, duration || 0));
  const totalTimeLabel = duration ? formatTime(duration) : "—";
  const displayTitle = title || "Awaiting your first track";
  const displayArtist = artist || "Upload audio to begin.";
  const metaSummary = [album, codec, bitrate ? `${bitrate} kbps` : null].filter(Boolean).join(" • ");
  const isControlsDisabled = !currentTrack;

  return (
    <section className="audio-player" aria-label="Audio player">
      <div className="audio-player__card">
        {(sourceLabel || extraActions) && (
          <div className="audio-player__topbar">
            {sourceLabel ? <span className="audio-player__source">{sourceLabel}</span> : null}
            {extraActions ? <div className="audio-player__extra-actions">{extraActions}</div> : null}
          </div>
        )}
        <div className="audio-player__header">
          <div className="audio-player__art">
            {image ? (
              <img src={image} alt={`Album art for ${displayTitle}`} />
            ) : (
              <div className="audio-player__art-placeholder" aria-hidden="true">
                <span>U</span>
              </div>
            )}
          </div>
          <div className="audio-player__info">
            <h2 className="audio-player__title">{displayTitle}</h2>
            <p className="audio-player__artist">{displayArtist}</p>
            {metaSummary ? <p className="audio-player__meta">{metaSummary}</p> : null}
          </div>
        </div>

        <div className="audio-player__controls" role="group" aria-label="Playback controls">
          <button type="button" onClick={toPrevTrack} aria-label="Previous track" disabled={isControlsDisabled}>
            <Prev />
          </button>
          <button type="button" onClick={onBackward10Click} aria-label="Rewind 10 seconds" disabled={isControlsDisabled}>
            <Backward10 />
          </button>
          <button
            type="button"
            className={`audio-player__play ${isPlaying ? "is-playing" : ""}`}
            onClick={handlePlayPause}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={isControlsDisabled}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <button type="button" onClick={onForward10Click} aria-label="Forward 10 seconds" disabled={isControlsDisabled}>
            <Forward10 />
          </button>
          <button type="button" onClick={toNextTrack} aria-label="Next track" disabled={isControlsDisabled}>
            <Next />
          </button>
        </div>

        <div className="audio-player__progress">
          <ProgressBar
            trackProgress={trackProgress}
            duration={duration}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            progressBarRef={progressBarRef}
            trackStyling={progressBackground}
            formatTime={formatTime}
            showMeta={false}
          />
          <div className="audio-player__time" aria-live="polite">
            <span>{currentTimeLabel}</span>
            <span aria-hidden="true">/</span>
            <span>{totalTimeLabel}</span>
          </div>
        </div>

        <div className="audio-player__footer">
          <VolumeControl volume={volume} onVolumeChange={setVolume} />
        </div>
      </div>
    </section>
  );
};

export default AudioPlayer;