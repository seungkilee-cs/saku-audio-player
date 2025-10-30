import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../utils/autoeqService", () => ({
  __esModule: true,
  checkAutoEqAvailability: vi.fn().mockResolvedValue(true),
  searchPresets: vi.fn().mockResolvedValue({
    results: [],
    total: 0,
    page: 1,
    pageSize: 20,
    sources: [],
    types: [],
    targets: [],
  }),
  fetchPreset: vi.fn().mockResolvedValue({ preset: null }),
  fetchPresetText: vi.fn().mockResolvedValue(""),
  getAutoEqSettings: vi.fn().mockReturnValue({}),
  updateAutoEqSettings: vi.fn(),
  clearAutoEqCache: vi.fn(),
  getRecentSearches: vi.fn().mockReturnValue([]),
}));

vi.mock("../assets/meta/tracks", () => ({
  loadBundledTracks: vi.fn().mockResolvedValue([]),
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { PlaybackProvider, usePlayback } from "./PlaybackContext";
import { loadBundledTracks } from "../assets/meta/tracks";
import { checkAutoEqAvailability } from "../utils/autoeqService";

const createTracksWithObjectUrls = () => [
  {
    id: "a",
    title: "Alpha",
    artist: "Artist A",
    sourceType: "uploaded",
    objectUrl: "blob:alpha",
  },
  {
    id: "b",
    title: "Beta",
    artist: "Artist B",
    sourceType: "bundled",
  },
  {
    id: "c",
    title: "Gamma",
    artist: "Artist C",
    sourceType: "uploaded",
    objectUrl: "blob:gamma",
  },
];

const wrapper = ({ children }) => <PlaybackProvider>{children}</PlaybackProvider>;

describe("PlaybackContext removal helpers", () => {
  const originalRevoke = globalThis.URL.revokeObjectURL;

  beforeEach(() => {
    loadBundledTracks.mockResolvedValue([]);
    checkAutoEqAvailability.mockResolvedValue(true);
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.URL.revokeObjectURL = originalRevoke;
    vi.clearAllMocks();
  });

  it("removes a track, revokes object URLs, and updates active source", async () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });

    await act(async () => {
      await result.current.replaceTracks(createTracksWithObjectUrls(), { startIndex: 1 });
    });

    await waitFor(() => expect(result.current.tracks).toHaveLength(3));

    act(() => {
      const didRemove = result.current.removeTrackAt(0);
      expect(didRemove).toBe(true);
    });

    await waitFor(() => expect(result.current.tracks).toHaveLength(2));

    expect(result.current.tracks.map((track) => track.id)).toEqual(["b", "c"]);
    expect(result.current.currentTrackIndex).toBe(0);
    expect(result.current.activeSource).toBe("bundled");
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:alpha");
  });

  it("rebuilds shuffle order after removing a track in shuffle mode", async () => {
    vi.spyOn(globalThis.Math, "random").mockReturnValue(0.42);

    const { result } = renderHook(() => usePlayback(), { wrapper });

    await act(async () => {
      await result.current.replaceTracks(createTracksWithObjectUrls(), { startIndex: 0 });
    });

    await waitFor(() => expect(result.current.tracks).toHaveLength(3));

    act(() => {
      result.current.toggleShuffle();
    });

    await waitFor(() => expect(result.current.shuffleMode).toBe(true));
    await waitFor(() =>
      expect(result.current.shuffleOrder).toHaveLength(result.current.tracks.length),
    );

    act(() => {
      const didRemove = result.current.removeTrackAt(2);
      expect(didRemove).toBe(true);
    });

    await waitFor(() => expect(result.current.tracks).toHaveLength(2));
    await waitFor(() =>
      expect(result.current.shuffleOrder).toHaveLength(result.current.tracks.length),
    );
    expect(result.current.shuffleOrder[0]).toBe(result.current.currentTrackIndex);

    globalThis.Math.random.mockRestore();
  });

  it("removes current track and pauses repeat-one playback scenario", async () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });

    await act(async () => {
      await result.current.replaceTracks(createTracksWithObjectUrls(), { startIndex: 0 });
    });

    await waitFor(() => expect(result.current.tracks).toHaveLength(3));

    act(() => {
      result.current.toggleRepeatMode(); // all -> one
    });

    await waitFor(() => expect(result.current.repeatMode).toBe("one"));

    let removeResult;
    act(() => {
      removeResult = result.current.removeCurrentTrack();
    });

    expect(removeResult).toBe(true);
    await waitFor(() => expect(result.current.tracks).toHaveLength(2));
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:alpha");
    expect(result.current.currentTrackIndex).toBe(0);
  });
});
