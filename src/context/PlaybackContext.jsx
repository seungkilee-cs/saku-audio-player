/* eslint-disable react-refresh/only-export-components -- Context provider exports hooks intentionally */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadBundledTracks } from "../assets/meta/tracks";

const PlaybackContext = createContext(null);

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
      const safeIndex = Math.min(Math.max(startIndex, 0), nextTrackList.length - 1);
      setCurrentTrackIndex(safeIndex);
      setActiveSource(nextTrackList[safeIndex]?.sourceType ?? "unknown");
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
