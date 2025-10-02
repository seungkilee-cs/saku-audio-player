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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSource, setActiveSource] = useState("bundled");
  const objectUrlsRef = useRef([]);

  const cleanupObjectUrls = useCallback((urls) => {
    urls?.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  const applyTracks = useCallback(
    (incomingTracks, { startIndex = 0 } = {}) => {
      if (!incomingTracks || incomingTracks.length === 0) {
        setError("No playable tracks were provided.");
        return false;
      }

      cleanupObjectUrls(objectUrlsRef.current);
      const { sanitized, objectUrls } = sanitizeTracks(incomingTracks);

      objectUrlsRef.current = objectUrls;
      setTracks(sanitized);
      setCurrentTrackIndex(Math.min(Math.max(startIndex, 0), sanitized.length - 1));
      setActiveSource(sanitized[0]?.sourceType ?? "unknown");
      setError(null);
      setLoading(false);
      return true;
    },
    [cleanupObjectUrls],
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
    } finally {
      setLoading(false);
    }
  }, [applyTracks]);

  useEffect(() => {
    initialize();
    return () => cleanupObjectUrls(objectUrlsRef.current);
  }, [cleanupObjectUrls, initialize]);

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
      return applyTracks(newTracks, options);
    },
    [applyTracks],
  );

  const resetToDefault = useCallback(() => {
    initialize();
  }, [initialize]);

  const value = useMemo(
    () => ({
      tracks,
      currentTrackIndex,
      loading,
      error,
      activeSource,
      replaceTracks,
      playTrackAt,
      playNext,
      playPrevious,
      resetToDefault,
      setCurrentTrackIndex: playTrackAt,
    }),
    [
      tracks,
      currentTrackIndex,
      loading,
      error,
      activeSource,
      replaceTracks,
      playTrackAt,
      playNext,
      playPrevious,
      resetToDefault,
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
