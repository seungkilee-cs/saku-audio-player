/* eslint-disable react-refresh/only-export-components -- Context provider exports hooks intentionally */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { loadBundledTracks } from "../assets/meta/tracks";
import {
  DEFAULT_PRESET,
  calculateRecommendedPreamp,
  clonePreset,
  ensureBandsCount,
  normalizePreset,
} from "../utils/peqPresets";
import {
  loadPeqState,
  debouncedSavePeqState,
  validateLoadedState,
  isStorageAvailable,
  clearPeqState
} from "../utils/peqPersistence";
import {
  fetchPreset,
  fetchPresetText,
  getAutoEqSettings,
  updateAutoEqSettings,
  searchPresets as searchAutoEqPresets,
  getRecentSearches as getAutoEqRecentSearches,
  clearAutoEqCache,
  checkAutoEqAvailability,
} from "../utils/autoeqService";
import { addPresetToLibrary } from "../utils/presetLibrary";

const normalizedDefaultPreset = normalizePreset(clonePreset(DEFAULT_PRESET));

function deriveAutoPreamp(enabled, bands, fallback) {
  if (!enabled) {
    return fallback;
  }
  return calculateRecommendedPreamp(bands);
}

const PlaybackContext = createContext(null);

// Try to load saved state, fall back to default if not available
function getInitialPeqState() {
  if (isStorageAvailable()) {
    const savedState = loadPeqState();
    if (savedState && validateLoadedState(savedState)) {
      console.log('Restoring PEQ state from localStorage');
      return {
        peqEnabled: savedState.peqEnabled ?? true,
        peqBypass: savedState.peqBypass ?? false,
        peqBands: savedState.peqBands || normalizedDefaultPreset.bands,
        preampGain: savedState.preampGain ?? normalizedDefaultPreset.preamp,
        preampAuto: savedState.preampAuto ?? true,
        currentPresetName: savedState.currentPresetName || normalizedDefaultPreset.name,
        peqNodes: null,
      };
    }
  }
  
  console.log('Using default PEQ state');
  return {
    peqEnabled: true,
    peqBypass: false,
    peqBands: normalizedDefaultPreset.bands,
    preampGain: normalizedDefaultPreset.preamp,
    preampAuto: true,
    currentPresetName: normalizedDefaultPreset.name,
    peqNodes: null,
  };
}

const initialPeqState = getInitialPeqState();

function peqReducer(state, action) {
  switch (action.type) {
    case "UPDATE_BAND": {
      const { index, updates } = action.payload ?? {};
      if (typeof index !== "number" || index < 0) {
        return state;
      }

      const baseBands = ensureBandsCount(state.peqBands);
      const nextBands = baseBands.map((band, bandIndex) => {
        if (bandIndex === index) {
          return { ...band, ...updates };
        }
        return band;
      });

      const nextPreampGain = deriveAutoPreamp(state.preampAuto, nextBands, state.preampGain);

      return {
        ...state,
        peqBands: nextBands,
        preampGain: nextPreampGain,
      };
    }
    case "UPDATE_ALL_BANDS": {
      const { bands = [], presetName, preampGain } = action.payload ?? {};
      const normalizedBands = ensureBandsCount(bands);
      const nextPreampGain =
        typeof preampGain === "number"
          ? preampGain
          : deriveAutoPreamp(state.preampAuto, normalizedBands, state.preampGain);
      return {
        ...state,
        peqBands: normalizedBands,
        currentPresetName: presetName ?? state.currentPresetName,
        preampGain: nextPreampGain,
      };
    }
    case "SET_PREAMP": {
      const { gain, autoOverride } = action.payload ?? {};
      return {
        ...state,
        preampGain: typeof gain === "number" ? gain : state.preampGain,
        preampAuto: typeof autoOverride === "boolean" ? autoOverride : state.preampAuto,
      };
    }
    case "TOGGLE_PREAMP_AUTO": {
      const { value } = action.payload ?? {};
      const nextAuto = typeof value === "boolean" ? value : !state.preampAuto;
      const nextPreamp = nextAuto
        ? calculateRecommendedPreamp(state.peqBands)
        : state.preampGain;
      return {
        ...state,
        preampAuto: nextAuto,
        preampGain: nextPreamp,
      };
    }
    case "TOGGLE_BYPASS": {
      const { value } = action.payload ?? {};
      return {
        ...state,
        peqBypass: typeof value === "boolean" ? value : !state.peqBypass,
      };
    }
    case "LOAD_PRESET": {
      const { preset } = action.payload ?? {};
      if (!preset) {
        return state;
      }
      let normalizedPreset;
      try {
        normalizedPreset = normalizePreset(clonePreset(preset));
      } catch (error) {
        console.error("Failed to load preset", error);
        return state;
      }
      return {
        ...state,
        peqBands: normalizedPreset.bands,
        preampGain: normalizedPreset.preamp,
        currentPresetName: normalizedPreset.name ?? state.currentPresetName,
        preampAuto: false, // Don't auto-calculate preamp for imported presets
      };
    }
    case "STORE_PEQ_NODES": {
      return {
        ...state,
        peqNodes: action.payload ?? null,
      };
    }
    case "SET_PEQ_ENABLED": {
      const { value } = action.payload ?? {};
      return {
        ...state,
        peqEnabled: typeof value === "boolean" ? value : state.peqEnabled,
      };
    }
    default:
      return state;
  }
}

function sanitizeTracks(tracks) {
  const objectUrls = [];

  const sanitized = tracks.map((track) => {
    const { objectUrl, ...rest } = track;
    if (objectUrl) {
      objectUrls.push(objectUrl);
    }
    return rest;
  });

  return { sanitized, objectUrls };
}

export const PlaybackProvider = ({ children }) => {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSource, setActiveSource] = useState("none");
  const [repeatMode, setRepeatMode] = useState('all'); // 'off', 'all', 'one'
  const [shuffleMode, setShuffleMode] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState([]);
  const objectUrlsRef = useRef([]);
  const [peqState, dispatchPeq] = useReducer(peqReducer, initialPeqState);
  const applyTracksRef = useRef(null);

  // Auto-save PEQ state changes to localStorage
  useEffect(() => {
    // Don't save on initial load
    if (peqState === initialPeqState) return;
    
    // Only save if we have meaningful state (bands exist)
    if (peqState.peqBands && peqState.peqBands.length > 0) {
      debouncedSavePeqState(peqState);
    }
  }, [peqState.peqBands, peqState.preampGain, peqState.preampAuto, peqState.peqBypass, peqState.currentPresetName]);

  const cleanupObjectUrls = useCallback((urls) => {
    urls?.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  const applyTracks = useCallback(
    (incomingTracks, { startIndex = 0, mode = "replace" } = {}) => {
      if (!incomingTracks || incomingTracks.length === 0) {
        setError("No playable tracks were provided.");
        return false;
      }

      let nextTrackList = [];
      let nextObjectUrls = [];

      if (mode === "append" && tracks.length > 0) {
        nextTrackList = [...tracks];
        nextObjectUrls = [...objectUrlsRef.current];
      }

      if (mode !== "append") {
        cleanupObjectUrls(objectUrlsRef.current);
      }

      const { sanitized, objectUrls } = sanitizeTracks(incomingTracks);

      nextTrackList = [...nextTrackList, ...sanitized];
      nextObjectUrls = [...nextObjectUrls, ...objectUrls];

      objectUrlsRef.current = nextObjectUrls;
      setTracks(nextTrackList);
      
      // Only change current track index if replacing tracks or if no tracks were playing
      if (mode === "replace" || tracks.length === 0) {
        const safeIndex = Math.min(Math.max(startIndex, 0), nextTrackList.length - 1);
        setCurrentTrackIndex(safeIndex);
        setActiveSource(nextTrackList[safeIndex]?.sourceType ?? "unknown");
      } else {
        // When appending, keep current track but update source if needed
        const currentTrack = nextTrackList[currentTrackIndex];
        if (currentTrack) {
          setActiveSource(currentTrack.sourceType ?? "unknown");
        }
      }
      setError(null);
      setLoading(false);
      return true;
    },
    [cleanupObjectUrls, tracks],
  );

  useEffect(() => {
    applyTracksRef.current = applyTracks;
  }, [applyTracks]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const defaultTracks = await loadBundledTracks();
      applyTracksRef.current?.(defaultTracks, { startIndex: 0 });
    } catch (err) {
      console.error("Failed to load bundled tracks", err);
      setError("Failed to load bundled tracks.");
      setTracks([]);
      setActiveSource("none");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => () => cleanupObjectUrls(objectUrlsRef.current), [cleanupObjectUrls]);

  const playTrackAt = useCallback(
    (nextIndex) => {
      if (!tracks.length) {
        return;
      }
      const normalized = ((nextIndex % tracks.length) + tracks.length) % tracks.length;
      setCurrentTrackIndex(normalized);
    },
    [tracks],
  );

  const playNext = useCallback((options = {}) => {
    if (tracks.length === 0) return;

    const { source = "auto" } = options;

    // Repeat one: only block auto-advance so manual next still works
    if (repeatMode === 'one' && source === 'auto') {
      return;
    }
    
    let nextIndex;
    if (shuffleMode && shuffleOrder.length > 0) {
      // Shuffle mode: use shuffle order
      const currentPos = shuffleOrder.indexOf(currentTrackIndex);
      if (currentPos === shuffleOrder.length - 1) {
        // At end of shuffle order
        if (repeatMode === 'all' || source === 'manual') {
          nextIndex = shuffleOrder[0]; // Loop back to start
        } else {
          return; // Stop at end
        }
      } else {
        nextIndex = shuffleOrder[currentPos + 1];
      }
    } else {
      // Normal mode
      if (currentTrackIndex === tracks.length - 1) {
        // At last track
        if (repeatMode === 'all' || source === 'manual') {
          nextIndex = 0; // Loop back to start
        } else {
          return; // Stop at end
        }
      } else {
        nextIndex = currentTrackIndex + 1;
      }
    }
    
    playTrackAt(nextIndex);
  }, [currentTrackIndex, playTrackAt, tracks.length, repeatMode, shuffleMode, shuffleOrder]);

  const playPrevious = useCallback(() => {
    if (tracks.length === 0) return;
    
    let prevIndex;
    if (shuffleMode && shuffleOrder.length > 0) {
      // Shuffle mode: use shuffle order
      const currentPos = shuffleOrder.indexOf(currentTrackIndex);
      if (currentPos === 0) {
        prevIndex = shuffleOrder[shuffleOrder.length - 1]; // Loop to end
      } else {
        prevIndex = shuffleOrder[currentPos - 1];
      }
    } else {
      // Normal mode
      if (currentTrackIndex === 0) {
        prevIndex = tracks.length - 1; // Loop to end
      } else {
        prevIndex = currentTrackIndex - 1;
      }
    }
    
    playTrackAt(prevIndex);
  }, [currentTrackIndex, playTrackAt, tracks.length, shuffleMode, shuffleOrder]);

  const replaceTracks = useCallback(
    async (newTracks, options = {}) => {
      return applyTracks(newTracks, { ...options, mode: "replace" });
    },
    [applyTracks],
  );

  const appendTracks = useCallback(
    async (newTracks, options = {}) => applyTracks(newTracks, { ...options, mode: "append" }),
    [applyTracks],
  );

  const clearPlaylist = useCallback(() => {
    cleanupObjectUrls(objectUrlsRef.current);
    objectUrlsRef.current = [];
    setTracks([]);
    setCurrentTrackIndex(0);
    setActiveSource("none");
    setLoading(false);
    setError(null);
  }, [cleanupObjectUrls]);

  const resetToDefault = useCallback(() => {
    clearPlaylist();
  }, [clearPlaylist]);

  // Shuffle functionality
  const toggleShuffle = useCallback(() => {
    if (!shuffleMode) {
      // Enabling shuffle: create shuffle order
      const indices = tracks.map((_, i) => i);
      const otherIndices = indices.filter(i => i !== currentTrackIndex);
      // Fisher-Yates shuffle
      for (let i = otherIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherIndices[i], otherIndices[j]] = [otherIndices[j], otherIndices[i]];
      }
      setShuffleOrder([currentTrackIndex, ...otherIndices]);
    } else {
      // Disabling shuffle: clear order
      setShuffleOrder([]);
    }
    setShuffleMode(!shuffleMode);
  }, [shuffleMode, tracks, currentTrackIndex]);

  // Repeat mode cycling: off -> all -> one -> off
  const toggleRepeatMode = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Update shuffle order when tracks change
  useEffect(() => {
    if (shuffleMode && tracks.length > 0) {
      const indices = tracks.map((_, i) => i);
      const otherIndices = indices.filter(i => i !== currentTrackIndex);
      for (let i = otherIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherIndices[i], otherIndices[j]] = [otherIndices[j], otherIndices[i]];
      }
      setShuffleOrder([currentTrackIndex, ...otherIndices]);
    }
  }, [tracks.length]); // Only when track count changes

  const [visualSettings, setVisualSettings] = useState({
    showPetals: true,
    showWaveform: true,
    showAmbientGlow: true,
  });
  const [autoEqState, setAutoEqState] = useState({
    loading: false,
    error: null,
    availability: true,
  });

  const toggleVisualSetting = useCallback((key) => {
    setVisualSettings((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    checkAutoEqAvailability()
      .then((available) => {
        if (!cancelled) {
          setAutoEqState((prev) => ({ ...prev, availability: available }));
        }
      })
      .catch((error) => {
        console.warn("AutoEQ availability check failed", error);
        if (!cancelled) {
          setAutoEqState((prev) => ({ ...prev, availability: false }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePeqBand = useCallback(
    (index, updates) => {
      dispatchPeq({ type: "UPDATE_BAND", payload: { index, updates } });
    },
    [dispatchPeq],
  );

  const updateAllPeqBands = useCallback(
    (bands, presetName, preampGain) => {
      dispatchPeq({
        type: "UPDATE_ALL_BANDS",
        payload: { bands, presetName, preampGain },
      });
    },
    [dispatchPeq],
  );

  const setPeqPreamp = useCallback(
    (gain, { autoOverride } = {}) => {
      dispatchPeq({ type: "SET_PREAMP", payload: { gain, autoOverride } });
    },
    [dispatchPeq],
  );

  const togglePeqPreampAuto = useCallback(
    (value) => {
      dispatchPeq({ type: "TOGGLE_PREAMP_AUTO", payload: { value } });
    },
    [dispatchPeq],
  );

  const togglePeqBypass = useCallback(
    (value) => {
      dispatchPeq({ type: "TOGGLE_BYPASS", payload: { value } });
    },
    [dispatchPeq],
  );

  const loadPeqPreset = useCallback(
    (preset) => {
      dispatchPeq({ type: "LOAD_PRESET", payload: { preset } });
    },
    [dispatchPeq],
  );

  const importAutoEqPreset = useCallback(
    async (entry, { saveToLibrary = false } = {}) => {
      setAutoEqState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { preset } = await fetchPreset(entry);
        loadPeqPreset({
          ...preset,
          name: preset.name ?? entry.name ?? "AutoEQ Preset",
        });
        if (saveToLibrary) {
          addPresetToLibrary({
            ...preset,
            name: preset.name ?? entry.name ?? "AutoEQ Preset",
            source: preset.source ?? entry.source ?? "autoeq",
            target: preset.target ?? entry.target ?? null,
            deviceType: preset.deviceType ?? entry.type ?? null,
          });
        }
        setAutoEqState((prev) => ({ ...prev, loading: false }));
        return preset;
      } catch (error) {
        console.error("Failed to import AutoEQ preset", error);
        setAutoEqState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
        throw error;
      }
    },
    [loadPeqPreset],
  );

  const autoEqSearch = useCallback((params) => {
    return searchAutoEqPresets(params);
  }, []);

  const autoEqFetchRaw = useCallback((entry) => fetchPresetText(entry), []);

  const autoEqGetSettings = useCallback(() => getAutoEqSettings(), []);

  const autoEqUpdateSettings = useCallback((partial) => {
    updateAutoEqSettings(partial);
    clearAutoEqCache();
    setAutoEqState((prev) => ({ ...prev }));
  }, []);

  const autoEqGetRecentSearches = useCallback(() => getAutoEqRecentSearches(), []);

  const storePeqNodes = useCallback(
    (nodes) => {
      dispatchPeq({ type: "STORE_PEQ_NODES", payload: nodes });
    },
    [dispatchPeq],
  );

  const setPeqEnabled = useCallback(
    (value) => {
      dispatchPeq({ type: "SET_PEQ_ENABLED", payload: { value } });
    },
    [dispatchPeq],
  );

  const clearPeqSettings = useCallback(() => {
    // Reset to default preset
    loadPeqPreset(DEFAULT_PRESET);
    
    // Clear localStorage
    try {
      clearPeqState();
      console.log('PEQ settings cleared and reset to default');
    } catch (error) {
      console.error('Failed to clear PEQ settings:', error);
    }
  }, [loadPeqPreset]);

  const value = useMemo(
    () => ({
      currentTrackIndex,
      setCurrentTrackIndex,
      tracks,
      setTracks,
      replaceTracks,
      appendTracks,
      visualSettings,
      toggleVisualSetting,
      loading,
      error,
      activeSource,
      playTrackAt,
      playNext,
      playPrevious,
      resetToDefault,
      clearPlaylist,
      repeatMode,
      shuffleMode,
      toggleRepeatMode,
      toggleShuffle,
      peqState,
      updatePeqBand,
      updateAllPeqBands,
      setPeqPreamp,
      togglePeqPreampAuto,
      togglePeqBypass,
      loadPeqPreset,
      storePeqNodes,
      setPeqEnabled,
      clearPeqSettings,
      importAutoEqPreset,
      autoEqSearch,
      autoEqFetchRaw,
      autoEqGetSettings,
      autoEqUpdateSettings,
      autoEqGetRecentSearches,
      autoEqState,
    }),
    [
      appendTracks,
      currentTrackIndex,
      playNext,
      playPrevious,
      playTrackAt,
      replaceTracks,
      resetToDefault,
      clearPlaylist,
      tracks,
      visualSettings,
      toggleVisualSetting,
      loading,
      error,
      activeSource,
      repeatMode,
      shuffleMode,
      toggleRepeatMode,
      toggleShuffle,
      peqState,
      loadPeqPreset,
      setPeqEnabled,
      clearPeqSettings,
      setPeqPreamp,
      storePeqNodes,
      togglePeqBypass,
      togglePeqPreampAuto,
      updateAllPeqBands,
      updatePeqBand,
      importAutoEqPreset,
      autoEqFetchRaw,
      autoEqGetSettings,
      autoEqGetRecentSearches,
      autoEqSearch,
      autoEqState,
      autoEqUpdateSettings,
    ],
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return context;
};
