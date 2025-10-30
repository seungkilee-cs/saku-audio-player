import { describe, it, expect } from "vitest";
import {
  rebuildShuffleOrder,
  removeTrackAtState,
  removeTracksState,
} from "./playlistActions";

const baseTracks = (
  overrides = [],
) =>
  [
    { id: "a", title: "First", sourceType: "bundled", ...overrides[0] },
    { id: "b", title: "Second", sourceType: "uploaded", ...overrides[1] },
    { id: "c", title: "Third", sourceType: "bundled", ...overrides[2] },
  ];

describe("rebuildShuffleOrder", () => {
  it("keeps current track first and shuffles others", () => {
    const rngSequence = [0.9, 0.1, 0.3];
    let call = 0;
    const rng = () => rngSequence[call++] ?? 0.5;

    const result = rebuildShuffleOrder({
      tracks: baseTracks(),
      currentTrackIndex: 1,
      rng,
    });

    expect(result[0]).toBe(1);
    expect(result.length).toBe(3);
    expect(new Set(result)).toEqual(new Set([0, 1, 2]));
  });

  it("returns empty array when no tracks", () => {
    expect(
      rebuildShuffleOrder({
        tracks: [],
        currentTrackIndex: 0,
      }),
    ).toEqual([]);
  });
});

describe("removeTrackAtState", () => {
  it("no-ops when index is invalid", () => {
    const state = {
      tracks: baseTracks(),
      objectUrls: [null, "blob:123", null],
      currentTrackIndex: 0,
      shuffleMode: false,
    };
    const result = removeTrackAtState(state, 99);

    expect(result.tracks).toEqual(state.tracks);
    expect(result.revokedUrls).toEqual([]);
    expect(result.didRemove).toBe(false);
  });

  it("removes middle track and shifts current index", () => {
    const state = {
      tracks: baseTracks(),
      objectUrls: [null, "blob:123", null],
      currentTrackIndex: 2,
      shuffleMode: false,
      repeatMode: "all",
    };

    const result = removeTrackAtState(state, 1);

    expect(result.tracks.map((track) => track.id)).toEqual(["a", "c"]);
    expect(result.objectUrls).toEqual([null, null]);
    expect(result.currentTrackIndex).toBe(1);
    expect(result.activeSource).toBe("bundled");
    expect(result.revokedUrls).toEqual(["blob:123"]);
    expect(result.shouldPause).toBe(false);
    expect(result.didRemove).toBe(true);
  });

  it("updates active source when removing current track", () => {
    const state = {
      tracks: baseTracks(),
      objectUrls: [null, null, null],
      currentTrackIndex: 0,
      shuffleMode: false,
      repeatMode: "all",
    };

    const result = removeTrackAtState(state, 0);

    expect(result.currentTrackIndex).toBe(0);
    expect(result.activeSource).toBe("uploaded");
    expect(result.shouldPause).toBe(false);
  });

  it("clears playlist and pauses when last track removed", () => {
    const state = {
      tracks: [{ id: "solo", title: "Only", sourceType: "uploaded" }],
      objectUrls: ["blob:solo"],
      currentTrackIndex: 0,
      shuffleMode: false,
      repeatMode: "all",
    };

    const result = removeTrackAtState(state, 0);

    expect(result.tracks).toEqual([]);
    expect(result.currentTrackIndex).toBe(0);
    expect(result.activeSource).toBe("none");
    expect(result.revokedUrls).toEqual(["blob:solo"]);
    expect(result.shouldPause).toBe(true);
  });

  it("trims shuffle order when removing track before current", () => {
    const state = {
      tracks: baseTracks(),
      objectUrls: [null, null, null],
      currentTrackIndex: 1,
      shuffleMode: true,
      shuffleOrder: [1, 0, 2],
      repeatMode: "all",
    };

    const result = removeTrackAtState(state, 0);

    expect(result.currentTrackIndex).toBe(0);
    expect(result.shuffleOrder).toEqual([0, 1]);
  });

  it("marks shouldPause when repeat-one active track removed", () => {
    const state = {
      tracks: baseTracks(),
      objectUrls: [null, null, null],
      currentTrackIndex: 1,
      shuffleMode: false,
      repeatMode: "one",
    };

    const result = removeTrackAtState(state, 1);

    expect(result.shouldPause).toBe(true);
  });
});

describe("removeTracksState", () => {
  it("aggregates removals and revoked URLs", () => {
    const state = {
      tracks: [
        { id: "a", title: "First", sourceType: "bundled" },
        { id: "b", title: "Second", sourceType: "uploaded" },
        { id: "c", title: "Third", sourceType: "uploaded" },
        { id: "d", title: "Fourth", sourceType: "bundled" },
      ],
      objectUrls: [null, "blob:one", "blob:two", null],
      currentTrackIndex: 3,
      shuffleMode: false,
      repeatMode: "all",
    };

    const result = removeTracksState(state, [1, 2]);

    expect(result.tracks.map((track) => track.id)).toEqual(["a", "d"]);
    expect(result.objectUrls).toEqual([null, null]);
    expect(result.revokedUrls).toEqual(["blob:one", "blob:two"]);
    expect(result.currentTrackIndex).toBe(1);
    expect(result.didRemove).toBe(true);
  });
});
