import { parseAutoEqPresetFromText } from "./converters/autoeqParser";

const INDEX_URL = `${import.meta.env.BASE_URL || "/"}autoeq-index.json`;
const STORAGE_KEY_INDEX = "saku-autoeq-index";
const STORAGE_KEY_HISTORY = "saku-autoeq-history";
const PRESET_CACHE_LIMIT = 50;
const STORAGE_KEY_SETTINGS = "saku-autoeq-settings";

const MIRRORS = [
  "https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/",
  "https://cdn.jsdelivr.net/gh/jaakkopasanen/AutoEq@master/",
];

const DEVICE_TYPE_ORDER = ["in-ear", "over-ear", "other"];

const state = {
  indexPromise: null,
  index: null,
  presetCache: new Map(),
  recentSearches: loadJson(STORAGE_KEY_HISTORY, []),
  settings: loadJson(STORAGE_KEY_SETTINGS, {
    githubToken: null,
    mirrors: MIRRORS,
  }),
};

function loadJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Failed to load", key, error);
    return fallback;
  }
}

function saveJson(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save", key, error);
  }
}

export function getAutoEqSettings() {
  return { ...state.settings };
}

export function updateAutoEqSettings(partial) {
  state.settings = { ...state.settings, ...partial };
  saveJson(STORAGE_KEY_SETTINGS, state.settings);
}

export function clearAutoEqCache() {
  state.index = null;
  state.indexPromise = null;
  state.presetCache.clear();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY_INDEX);
  }
}

export async function checkAutoEqAvailability() {
  try {
    const response = await fetch(INDEX_URL, { method: "HEAD", cache: "no-cache" });
    return response.ok;
  } catch (error) {
    console.warn("AutoEQ availability check failed", error);
    return false;
  }
}

function deriveDeviceType(rawType) {
  if (!rawType) return "other";
  const value = String(rawType).toLowerCase();

  if (value.includes("over-ear") || value.includes("over ear") || value.includes("headphone")) {
    return "over-ear";
  }

  if (
    value.includes("in-ear") ||
    value.includes("inear") ||
    value.includes("in ear") ||
    value.includes("earbud") ||
    value.includes("iem") ||
    value.includes("canal")
  ) {
    return "in-ear";
  }

  return "other";
}

function normalizeIndexEntry(entry) {
  if (!entry) return null;
  const rawType = entry.rawType ?? entry.type ?? null;
  const deviceType = deriveDeviceType(entry.deviceType ?? rawType);

  return {
    ...entry,
    rawType,
    deviceType,
  };
}

function aggregateAvailableTypes(headphones = []) {
  const typeSet = new Set(headphones.map((item) => item?.deviceType).filter(Boolean));
  const ordered = DEVICE_TYPE_ORDER.filter((value) => typeSet.has(value));
  const extras = Array.from(typeSet).filter((value) => !DEVICE_TYPE_ORDER.includes(value));
  return [...ordered, ...extras];
}

function upgradeIndexData(index) {
  if (!index) return null;
  const headphones = Array.isArray(index.headphones)
    ? index.headphones
        .map(normalizeIndexEntry)
        .filter(Boolean)
    : [];

  return {
    ...index,
    headphones,
    types: aggregateAvailableTypes(headphones),
  };
}

async function fetchIndex() {
  if (!state.indexPromise) {
    state.indexPromise = (async () => {
      const cached = loadJson(STORAGE_KEY_INDEX, null);
      if (cached?.version && Array.isArray(cached?.headphones)) {
        state.index = upgradeIndexData(cached);
      }

      try {
        const response = await fetch(INDEX_URL, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load AutoEQ index (${response.status})`);
        }

        const json = await response.json();
        const baseIndex = {
          version: json.version ?? new Date().toISOString(),
          total: typeof json.total === "number"
            ? json.total
            : Array.isArray(json.headphones)
              ? json.headphones.length
              : 0,
          sources: json.sources ?? [],
          targets: json.targets ?? [],
          headphones: Array.isArray(json.headphones)
            ? json.headphones.map(normalizeIndexEntry)
            : [],
        };

        const normalized = upgradeIndexData(baseIndex);

        const hasChanged =
          !state.index ||
          state.index.version !== normalized.version ||
          state.index.total !== normalized.total;

        state.index = normalized;
        if (hasChanged) {
          saveJson(STORAGE_KEY_INDEX, state.index);
        }
        return state.index;
      } catch (error) {
        if (state.index) {
          console.warn("AutoEQ index fetch failed, using cached copy", error);
          return state.index;
        }
        throw error;
      }
    })();
  }
  return state.indexPromise;
}

export async function searchPresets({ query = "", source = null, type = null, target = null, page = 1, pageSize = 20 } = {}) {
  const index = await fetchIndex();
  const loweredQuery = query.trim().toLowerCase();
  const filtered = index.headphones.filter((item) => {
    const normalizedType = item.deviceType ?? deriveDeviceType(item.type);
    const matchesQuery = !loweredQuery || item.name.toLowerCase().includes(loweredQuery);
    const matchesSource = !source || item.source === source;
    const matchesType = !type || normalizedType === type;
    const matchesTarget = !target || item.target === target;
    return matchesQuery && matchesSource && matchesType && matchesTarget;
  });
  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const results = filtered.slice(start, start + pageSize);
  if (loweredQuery) {
    state.recentSearches = [loweredQuery, ...state.recentSearches.filter((q) => q !== loweredQuery)].slice(0, 5);
    saveJson(STORAGE_KEY_HISTORY, state.recentSearches);
  }
  return {
    results,
    total,
    page,
    pageSize,
    sources: index.sources,
    types: index.types,
    targets: index.targets,
  };
}

function getCacheKey(entry) {
  return entry.id;
}

function addToCache(key, value) {
  state.presetCache.set(key, value);
  if (state.presetCache.size > PRESET_CACHE_LIMIT) {
    const firstKey = state.presetCache.keys().next().value;
    state.presetCache.delete(firstKey);
  }
}

function getEncodedPath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function fetchFromGithubApi(path, token) {
  const encodedPath = getEncodedPath(path);
  const apiUrl = `https://api.github.com/repos/jaakkopasanen/AutoEq/contents/${encodedPath}`;
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3.raw",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status})`);
  }
  return response.text();
}

async function fetchWithMirrors(path) {
  const mirrors = Array.isArray(state.settings.mirrors) && state.settings.mirrors.length > 0
    ? state.settings.mirrors
    : MIRRORS;
  const token = typeof state.settings.githubToken === "string" ? state.settings.githubToken.trim() : "";
  let lastError;

  if (token) {
    try {
      return await fetchFromGithubApi(path, token);
    } catch (error) {
      lastError = error;
    }
  }

  const encodedPath = getEncodedPath(path);
  for (const base of mirrors) {
    const separator = base.endsWith("/") ? "" : "/";
    const url = `${base}${separator}${encodedPath}`;
    try {
      const response = await fetch(url, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("All AutoEQ mirrors failed");
}

export async function fetchPresetText(entry) {
  const cacheKey = getCacheKey(entry);
  if (state.presetCache.has(cacheKey)) {
    return state.presetCache.get(cacheKey);
  }
  const text = await fetchWithMirrors(entry.path);
  addToCache(cacheKey, text);
  return text;
}

export async function fetchPreset(entry) {
  const text = await fetchPresetText(entry);
  const { preset, metadata } = parseAutoEqPresetFromText(text, {
    name: entry.name,
    source: entry.source,
    target: entry.target,
    type: entry.type,
    path: entry.path,
  });
  return { preset, metadata };
}

export function getRecentSearches() {
  return state.recentSearches.slice();
}
