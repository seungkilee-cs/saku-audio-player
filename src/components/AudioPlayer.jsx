// src/components/AudioPlayer.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import Play from "../assets/img/play.svg?react";
import Pause from "../assets/img/pause.svg?react";
import Next from "../assets/img/next.svg?react";
import Prev from "../assets/img/prev.svg?react";
import Forward10 from "../assets/img/forward10.svg?react";
import Backward10 from "../assets/img/backward10.svg?react";
import VolumeControl from "./VolumeControl";
import WaveformCanvas from "./WaveformCanvas";
import { formatTime } from "../../util/timeUtils";
import "../styles/AudioPlayer.css";
import { usePlayback } from "../context/PlaybackContext";
import {
  cleanupPeqChain,
  createPeqChain,
  updatePeqFilters,
  updatePreamp,
} from "../utils/audio/peqGraph";
import {
  DEFAULT_PRESET,
  BUNDLED_PRESETS,
  calculateRecommendedPreamp,
} from "../utils/peqPresets";

const AudioPlayer = ({
  tracks = [],
  currentTrackIndex = 0,
  onTrackChange,
  onNext,
  onPrevious,
  sourceLabel,
  extraActions,
  showAmbientGlow = false,
  renderOverlay,
  showWaveform = true,
  onFilesDropped, // New prop for handling dropped files
}) => {
  const {
    peqState,
    storePeqNodes,
    updatePeqBand,
    updateAllPeqBands,
    setPeqPreamp,
    togglePeqPreampAuto,
    loadPeqPreset,
  } = usePlayback();
  const { peqBands, peqBypass, preampGain, preampAuto, peqNodes } = peqState;
  const [trackProgress, setTrackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const volumeRef = useRef(1);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const peqBandsRef = useRef(peqBands);
  const peqBypassRef = useRef(peqBypass);
  const preampGainRef = useRef(preampGain);
  const preampAutoRef = useRef(preampAuto);
  const peqNodesRef = useRef(peqNodes);

  const trackList = Array.isArray(tracks) ? tracks : [];
  const trackCount = trackList.length;
  const currentTrack = trackList[currentTrackIndex] || null;

  const { title, artist, album, audioSrc, image, codec, bitrate } = currentTrack ?? {};

  const audioRef = useRef(new Audio());
  const intervalRef = useRef(null);
  const isReady = useRef(false);
  const isPlayingRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const currentAudioSrcRef = useRef(null);

  const duration = Number.isFinite(audioRef.current?.duration) ? audioRef.current.duration : 0;
  const progressRatio = duration > 0 ? trackProgress / duration : 0;

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

    const ensureContext = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        try {
          await audioContextRef.current.resume();
        } catch (err) {
          console.warn("Failed to resume AudioContext", err);
        }
      }
    };

    ensureContext()
      .then(() => {
        isPlayingRef.current = true;
        return audioRef.current
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
      })
      .catch((error) => {
        console.warn("AudioContext setup failed", error);
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
    if (!import.meta.env?.DEV) {
      return undefined;
    }

    window.__SAKU_AUDIO_CTX__ = audioContextRef;
    window.__SAKU_PEQ_NODES__ = () => peqNodesRef.current ?? peqNodes;

    const debugApi = {
      get state() {
        return peqState;
      },
      setBandGain(index, gainDb) {
        if (typeof index !== "number" || Number.isNaN(index)) return;
        updatePeqBand(index, { gain: gainDb });
      },
      setAllGains(gainDb) {
        const baseBands = DEFAULT_PRESET.bands.map((defaults, idx) => ({
          ...defaults,
          ...(peqState.peqBands[idx] ?? {}),
          gain: gainDb,
        }));
        updateAllPeqBands(baseBands);
      },
      loadPreset(key) {
        const preset = key && BUNDLED_PRESETS[key.toUpperCase?.() ?? key];
        if (preset) {
          loadPeqPreset(preset);
        }
      },
      resetFlat() {
        loadPeqPreset(DEFAULT_PRESET);
      },
      setPreamp(db) {
        setPeqPreamp(db);
      },
      toggleAuto(value) {
        togglePeqPreampAuto(value);
      },
      recomputePreamp() {
        const recommended = calculateRecommendedPreamp(peqState.peqBands ?? []);
        setPeqPreamp(recommended);
        return recommended;
      },
    };

    window.__SAKU_DEBUG__ = debugApi;

    Object.defineProperty(window, "audioContext", {
      configurable: true,
      get() {
        return audioContextRef.current;
      },
    });

    Object.defineProperty(window, "peqNodes", {
      configurable: true,
      get() {
        return peqNodesRef.current ?? peqNodes;
      },
    });

    return () => {
      delete window.__SAKU_DEBUG__;
      delete window.__SAKU_AUDIO_CTX__;
      delete window.__SAKU_PEQ_NODES__;
      delete window.audioContext;
      delete window.peqNodes;
    };
  }, [loadPeqPreset, peqNodes, peqState, setPeqPreamp, togglePeqPreampAuto, updateAllPeqBands, updatePeqBand]);

  // Handle audio source changes (track switching)
  useEffect(() => {
    const audio = audioRef.current;

    // Only reload if audioSrc actually changed
    if (currentAudioSrcRef.current === audioSrc) {
      return;
    }
    
    console.log('AudioPlayer: audioSrc changed from', currentAudioSrcRef.current, 'to', audioSrc);
    currentAudioSrcRef.current = audioSrc;

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
  }, [audioSrc, playAudio]);

  // Handle PEQ chain setup and updates
  useEffect(() => {
    const audio = audioRef.current;

    const teardownChain = () => {
      const nodes = peqNodesRef.current;
      if (nodes) {
        cleanupPeqChain(nodes);
      }
      storePeqNodes(null);
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (error) {
          console.warn("Failed to disconnect source node", error);
        }
      }
    };

    // Only setup PEQ chain if we have audio
    if (!audioSrc || !audio.src) {
      teardownChain();
      return;
    }

    const setupPeqChain = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      let sourceNode = sourceNodeRef.current;

      if (!sourceNode || sourceNode.mediaElement !== audio) {
        try {
          sourceNode = audioContext.createMediaElementSource(audio);
          sourceNodeRef.current = sourceNode;
        } catch (error) {
          console.error("Failed to create MediaElementSource", error);
          throw error;
        }
      } else {
        try {
          sourceNode.disconnect();
        } catch (error) {
          console.warn("Failed to reset source node connections", error);
        }
      }

      const chain = createPeqChain(audioContext, peqBandsRef.current);
      sourceNode.connect(chain.inputNode);
      chain.outputNode.connect(audioContext.destination);

      storePeqNodes(chain);

      // Filters are already configured with correct values from createPeqChain
      // updatePeqFilters(chain.filters, peqBandsRef.current);
      const bandsForPreamp = peqBandsRef.current ?? [];
      const recommendedPreamp = calculateRecommendedPreamp(bandsForPreamp);
      const storedPreamp = preampGainRef.current;
      const targetPreamp = preampAutoRef.current
        ? recommendedPreamp
        : typeof storedPreamp === "number"
          ? storedPreamp
          : recommendedPreamp;
      updatePreamp(chain.preampNode, targetPreamp);

      if (peqBypassRef.current) {
        sourceNode.disconnect();
        sourceNode.connect(audioContext.destination);
      }
    };

    setupPeqChain().catch((error) => {
      console.error("Failed to set up PEQ chain", error);
    });

    return teardownChain;
  }, [audioSrc, peqBands, preampGain, preampAuto, storePeqNodes]);

  useEffect(() => {
    volumeRef.current = volume;
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    peqBandsRef.current = peqBands;
  }, [peqBands]);

  useEffect(() => {
    peqBypassRef.current = peqBypass;
  }, [peqBypass]);

  useEffect(() => {
    preampGainRef.current = preampGain;
  }, [preampGain]);

  useEffect(() => {
    preampAutoRef.current = preampAuto;
  }, [preampAuto]);

  useEffect(() => {
    peqNodesRef.current = peqNodes;
  }, [peqNodes]);

  useEffect(() => pauseAudio, [pauseAudio]);

  useEffect(() => {
    if (!preampAuto) {
      return;
    }
    const recommended = calculateRecommendedPreamp(peqBands);
    if (Math.abs(recommended - preampGain) > 0.001) {
      setPeqPreamp(recommended);
    }
  }, [peqBands, preampAuto, preampGain, setPeqPreamp]);

  useEffect(() => {
    if (peqNodes?.filters?.length) {
      updatePeqFilters(peqNodes.filters, peqBands);
    }
  }, [peqBands, peqNodes]);

  useEffect(() => {
    if (peqNodes?.preampNode) {
      updatePreamp(peqNodes.preampNode, preampGain);
    }
  }, [preampGain, peqNodes]);

  useEffect(() => {
    const audioContext = audioContextRef.current;
    const sourceNode = sourceNodeRef.current;

    if (!audioContext || !sourceNode) {
      return;
    }

    sourceNode.disconnect();

    if (peqBypass || !peqNodes?.inputNode || !peqNodes?.outputNode) {
      peqNodes?.outputNode?.disconnect?.();
      sourceNode.connect(audioContext.destination);
    } else {
      peqNodes.outputNode.disconnect();
      sourceNode.connect(peqNodes.inputNode);
      peqNodes.outputNode.connect(audioContext.destination);
    }
  }, [peqBypass, peqNodes]);

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

  const handleScrub = useCallback(
    (ratio) => {
      const activeDuration = Number.isFinite(duration) && duration > 0 ? duration : audioRef.current?.duration ?? 0;
      if (!activeDuration) {
        return;
      }

      if (!isScrubbingRef.current) {
        isScrubbingRef.current = true;
        stopTimer();
      }

      const nextTime = ratio * activeDuration;
      audioRef.current.currentTime = nextTime;
      setTrackProgress(nextTime);
    },
    [duration, stopTimer],
  );

  const handleScrubEnd = useCallback(() => {
    if (!isScrubbingRef.current) {
      return;
    }

    isScrubbingRef.current = false;
    if (isPlayingRef.current) {
      playAudio();
    }
  }, [playAudio]);

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

  // Drag and drop handlers
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set drag over to false if we're leaving the main container
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0 && onFilesDropped) {
      onFilesDropped(files);
    }
  }, [onFilesDropped]);

  const currentTimeLabel = formatTime(Math.min(trackProgress, duration || 0));
  const totalTimeLabel = duration ? formatTime(duration) : "—";
  const displayTitle = title || "Awaiting your first track";
  const displayArtist = artist || "Upload audio to begin.";
  const metaSummary = [album, codec, bitrate ? `${bitrate} kbps` : null].filter(Boolean).join(" • ");
  const isControlsDisabled = !currentTrack;

  return (
    <section 
      className={`audio-player ${isDragOver ? 'audio-player--drag-over' : ''}`} 
      aria-label="Audio player"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="audio-player__card">
        {(sourceLabel || extraActions) && (
          <div className="audio-player__topbar">
            {sourceLabel ? <span className="audio-player__source">{sourceLabel}</span> : null}
            {extraActions ? <div className="audio-player__extra-actions">{extraActions}</div> : null}
          </div>
        )}
        {showAmbientGlow ? <div className="audio-player__ambient-glow" aria-hidden="true" /> : null}
        <div className="audio-player__header">
          <div className="audio-player__art">
            {image ? (
              <img src={image} alt={`Album art for ${displayTitle}`} />
            ) : (
              <div className="audio-player__art-placeholder" aria-hidden="true">
                <span>U</span>
              </div>
            )}
            {renderOverlay ? (
              <div className="audio-player__art-overlay">
                {renderOverlay({ currentTrack, progress: progressRatio, isPlaying })}
              </div>
            ) : null}
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
          {currentTrack && showWaveform ? (
            <WaveformCanvas
              src={audioSrc}
              progress={duration > 0 ? trackProgress / duration : 0}
              accentColor={currentTrack?.color}
              disabled={!currentTrack}
              onScrub={handleScrub}
              onScrubEnd={handleScrubEnd}
              showGlow={showAmbientGlow}
            />
          ) : null}
          <div className="audio-player__time" aria-live="polite">
            <span className="audio-player__time-current">{currentTimeLabel}</span>
            <span className="audio-player__time-divider" aria-hidden="true">
              /
            </span>
            <span className="audio-player__time-total">{totalTimeLabel}</span>
          </div>
        </div>

        <div className="audio-player__footer">
          <VolumeControl volume={volume} onVolumeChange={setVolume} />
        </div>
      </div>
      
      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="audio-player__drag-overlay">
          <div className="audio-player__drag-content">
            <div className="audio-player__drag-icon">🎵</div>
            <p className="audio-player__drag-text">Drop audio files to add to playlist</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default AudioPlayer;