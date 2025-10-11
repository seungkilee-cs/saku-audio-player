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
  const objectUrlsRef = useRef([]);
  const [peqState, dispatchPeq] = useReducer(peqReducer, initialPeqState);

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

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const defaultTracks = await loadBundledTracks();
      applyTracks(defaultTracks, { startIndex: 0 });
    } catch (err) {
      console.error("Failed to load bundled tracks", err);
      setError("Failed to load bundled tracks.");
      setTracks([]);
      setActiveSource("none");
    } finally {
      setLoading(false);
    }
  }, [applyTracks]);

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

  const playNext = useCallback(() => {
    playTrackAt(currentTrackIndex + 1);
  }, [currentTrackIndex, playTrackAt]);

  const playPrevious = useCallback(() => {
    playTrackAt(currentTrackIndex - 1);
  }, [currentTrackIndex, playTrackAt]);

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

  const resetToDefault = useCallback(() => {
    initialize();
  }, [initialize]);

  const [visualSettings, setVisualSettings] = useState({
    showPetals: true,
    showWaveform: true,
    showAmbientGlow: true,
  });

  const toggleVisualSetting = useCallback((key) => {
    setVisualSettings((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
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
    }),
    [
      appendTracks,
      currentTrackIndex,
      playNext,
      playPrevious,
      playTrackAt,
      replaceTracks,
      resetToDefault,
      tracks,
      visualSettings,
      toggleVisualSetting,
      loading,
      error,
      activeSource,
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
