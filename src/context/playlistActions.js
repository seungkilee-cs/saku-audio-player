const DEFAULT_ACTIVE_SOURCE = "none";
const REPEAT_ONE = "one";

/**
 * Fisher-Yates shuffle with injectable RNG for testability.
 */
function shuffleArray(list, rng = Math.random) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function rebuildShuffleOrder({
  tracks,
  currentTrackIndex,
  rng = Math.random,
}) {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return [];
  }

  const safeIndex = Math.min(
    Math.max(currentTrackIndex ?? 0, 0),
    tracks.length - 1,
  );
  const otherIndices = tracks
    .map((_, index) => index)
    .filter((index) => index !== safeIndex);

  const shuffledOthers = shuffleArray(otherIndices, rng);
  return [safeIndex, ...shuffledOthers];
}

function normalizeIndex(index) {
  return Number.isInteger(index) ? index : -1;
}

function deriveNextCurrentIndex({
  removedIndex,
  previousCurrentIndex,
  nextTracks,
}) {
  if (nextTracks.length === 0) {
    return 0;
  }

  if (removedIndex < previousCurrentIndex) {
    return Math.max(previousCurrentIndex - 1, 0);
  }

  if (removedIndex === previousCurrentIndex) {
    return Math.min(removedIndex, nextTracks.length - 1);
  }

  return previousCurrentIndex;
}

function computeActiveSource(tracks, index) {
  return tracks[index]?.sourceType ?? DEFAULT_ACTIVE_SOURCE;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function trimShuffleOrder({
  previousOrder = [],
  removedIndex,
  nextCurrentIndex,
  trackCount,
}) {
  if (trackCount === 0) {
    return [];
  }

  const seen = new Set();
  const adjusted = [];

  for (const value of previousOrder) {
    if (value === removedIndex) continue;
    let nextValue = value;
    if (value > removedIndex) {
      nextValue -= 1;
    }
    if (nextValue < 0 || nextValue >= trackCount) continue;
    if (seen.has(nextValue)) continue;
    seen.add(nextValue);
    adjusted.push(nextValue);
  }

  for (let index = 0; index < trackCount; index += 1) {
    if (!seen.has(index)) {
      seen.add(index);
      adjusted.push(index);
    }
  }

  const filtered = adjusted.filter((value) => value !== nextCurrentIndex);
  return [nextCurrentIndex, ...filtered];
}

function coerceArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value;
}

function computeNextIndexAfterMove(currentIndex, fromIndex, toIndex) {
  if (fromIndex === toIndex) {
    return currentIndex;
  }

  if (currentIndex === fromIndex) {
    return toIndex;
  }

  if (fromIndex < currentIndex && currentIndex <= toIndex) {
    return currentIndex - 1;
  }

  if (toIndex <= currentIndex && currentIndex < fromIndex) {
    return currentIndex + 1;
  }

  return currentIndex;
}

function normalizeObjectUrls(objectUrls, length) {
  if (Array.isArray(objectUrls) && objectUrls.length === length) {
    return [...objectUrls];
  }
  if (Array.isArray(objectUrls)) {
    const copy = [...objectUrls];
    while (copy.length < length) {
      copy.push(null);
    }
    return copy.slice(0, length);
  }
  return Array.from({ length }, () => null);
}

export function moveTrackState(state, { fromIndex, toIndex }) {
  const {
    tracks = [],
    objectUrls = [],
    currentTrackIndex = 0,
    shuffleMode = false,
  } = state ?? {};

  const trackCount = tracks.length;
  if (trackCount === 0) {
    return {
      ...state,
      didMove: false,
    };
  }

  const safeFrom = clamp(normalizeIndex(fromIndex), 0, trackCount - 1);
  const safeTo = clamp(normalizeIndex(toIndex), 0, trackCount - 1);

  if (safeFrom === safeTo) {
    return {
      ...state,
      didMove: false,
    };
  }

  const nextTracks = [...tracks];
  const [movedTrack] = nextTracks.splice(safeFrom, 1);
  nextTracks.splice(safeTo, 0, movedTrack);

  const normalizedUrls = normalizeObjectUrls(objectUrls, trackCount);
  const [movedUrl] = normalizedUrls.splice(safeFrom, 1);
  normalizedUrls.splice(safeTo, 0, movedUrl ?? null);

  const nextCurrentIndex = clamp(
    computeNextIndexAfterMove(currentTrackIndex, safeFrom, safeTo),
    0,
    nextTracks.length - 1,
  );

  const nextActiveSource = computeActiveSource(nextTracks, nextCurrentIndex);

  const nextShuffleOrder = shuffleMode
    ? rebuildShuffleOrder({
        tracks: nextTracks,
        currentTrackIndex: nextCurrentIndex,
      })
    : [];

  return {
    ...state,
    tracks: nextTracks,
    objectUrls: normalizeObjectUrls(normalizedUrls, nextTracks.length),
    currentTrackIndex: nextCurrentIndex,
    activeSource: nextActiveSource,
    shuffleOrder: nextShuffleOrder,
    revokedUrls: [],
    shouldPause: false,
    didMove: true,
  };
}

export function insertTracksState(state, { index, tracks: tracksToInsert, objectUrls }) {
  if (!Array.isArray(tracksToInsert) || tracksToInsert.length === 0) {
    return {
      ...state,
      didInsert: false,
    };
  }

  const {
    tracks = [],
    objectUrls: existingUrls = [],
    currentTrackIndex = 0,
    shuffleMode = false,
  } = state ?? {};

  const insertionIndex = clamp(Number.isInteger(index) ? index : tracks.length, 0, tracks.length);

  const nextTracks = [
    ...tracks.slice(0, insertionIndex),
    ...tracksToInsert,
    ...tracks.slice(insertionIndex),
  ];

  const normalizedExistingUrls = normalizeObjectUrls(existingUrls, tracks.length);
  const insertUrls = normalizeObjectUrls(objectUrls, tracksToInsert.length);

  const nextObjectUrls = [
    ...normalizedExistingUrls.slice(0, insertionIndex),
    ...insertUrls,
    ...normalizedExistingUrls.slice(insertionIndex),
  ];

  let nextCurrentIndex = currentTrackIndex;
  if (tracks.length === 0) {
    nextCurrentIndex = 0;
  } else if (insertionIndex <= currentTrackIndex) {
    nextCurrentIndex = currentTrackIndex + tracksToInsert.length;
  }

  const nextActiveSource = computeActiveSource(nextTracks, nextCurrentIndex);

  const nextShuffleOrder = shuffleMode
    ? rebuildShuffleOrder({
        tracks: nextTracks,
        currentTrackIndex: nextCurrentIndex,
      })
    : [];

  return {
    ...state,
    tracks: nextTracks,
    objectUrls: normalizeObjectUrls(nextObjectUrls, nextTracks.length),
    currentTrackIndex: nextCurrentIndex,
    activeSource: nextActiveSource,
    shuffleOrder: nextShuffleOrder,
    revokedUrls: [],
    shouldPause: false,
    didInsert: true,
    insertedRange: {
      start: insertionIndex,
      count: tracksToInsert.length,
    },
  };
}

export function removeTrackAtState(state, index) {
  const {
    tracks = [],
    objectUrls = [],
    currentTrackIndex = 0,
    shuffleOrder = [],
    shuffleMode = false,
    repeatMode = "all",
  } = state ?? {};

  const safeIndex = normalizeIndex(index);
  if (safeIndex < 0 || safeIndex >= tracks.length) {
    return {
      ...state,
      revokedUrls: [],
      shouldPause: false,
      didRemove: false,
    };
  }

  const nextTracks = [
    ...tracks.slice(0, safeIndex),
    ...tracks.slice(safeIndex + 1),
  ];
  const nextObjectUrls = [
    ...objectUrls.slice(0, safeIndex),
    ...objectUrls.slice(safeIndex + 1),
  ];

  const nextCurrentIndex = deriveNextCurrentIndex({
    removedIndex: safeIndex,
    previousCurrentIndex: currentTrackIndex,
    nextTracks,
  });

  const revokedUrl = objectUrls?.[safeIndex] ?? null;
  const nextActiveSource =
    nextTracks.length === 0
      ? DEFAULT_ACTIVE_SOURCE
      : computeActiveSource(nextTracks, nextCurrentIndex);

  const trackCount = nextTracks.length;
  const nextShuffleOrder = shuffleMode
    ? trimShuffleOrder({
        previousOrder: coerceArray(shuffleOrder),
        removedIndex: safeIndex,
        nextCurrentIndex,
        trackCount,
      })
    : [];

  const shouldPause =
    trackCount === 0 ||
    (safeIndex === currentTrackIndex && repeatMode === REPEAT_ONE);

  return {
    ...state,
    tracks: nextTracks,
    objectUrls: nextObjectUrls,
    currentTrackIndex: nextCurrentIndex,
    activeSource: nextActiveSource,
    shuffleOrder: nextShuffleOrder,
    revokedUrls: revokedUrl ? [revokedUrl] : [],
    shouldPause,
    didRemove: true,
  };
}

export function removeTracksState(state, indices) {
  if (!Array.isArray(indices) || indices.length === 0) {
    return {
      ...state,
      revokedUrls: [],
      shouldPause: false,
      didRemove: false,
    };
  }

  const unique = Array.from(new Set(indices))
    .map(normalizeIndex)
    .filter((value) => value >= 0)
    .sort((a, b) => b - a);

  if (unique.length === 0) {
    return {
      ...state,
      revokedUrls: [],
      shouldPause: false,
      didRemove: false,
    };
  }

  let workingState = { ...state };
  const aggregatedRecords = [];
  let shouldPause = false;
  let removalCount = 0;

  for (const targetIndex of unique) {
    const result = removeTrackAtState(workingState, targetIndex);
    if (!result.didRemove) {
      continue;
    }
    removalCount += 1;
    const {
      revokedUrls: removedUrls = [],
      shouldPause: removalShouldPause,
      didRemove: _unusedDidRemove,
      ...nextState
    } = result;
    if (Array.isArray(removedUrls) && removedUrls.length > 0) {
      aggregatedRecords.push(
        ...removedUrls.map((url) => ({ index: targetIndex, url })),
      );
    }
    shouldPause = shouldPause || Boolean(removalShouldPause);
    workingState = nextState;
  }

  return {
    ...workingState,
    revokedUrls: aggregatedRecords
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.url),
    shouldPause,
    didRemove: removalCount > 0,
  };
}

export default {
  rebuildShuffleOrder,
  moveTrackState,
  insertTracksState,
  removeTrackAtState,
  removeTracksState,
};
