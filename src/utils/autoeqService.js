import { parseAutoEqPresetFromText } from "./converters/autoeqParser";

const INDEX_URL = `${import.meta.env.BASE_URL || "/"}autoeq-index.json`;
const STORAGE_KEY_INDEX = "saku-autoeq-index";
const STORAGE_KEY_HISTORY = "saku-autoeq-history";
const PRESET_CACHE_LIMIT = 50;
const STORAGE_KEY_SETTINGS = "saku-autoeq-settings";

const MIRRORS = [
  "https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/",
];

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

function normalizeIndexEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    source: entry.source,
    type: entry.type,
    target: entry.target,
    path: entry.path,
  };
}

async function fetchIndex() {
  if (state.index) {
    return state.index;
  }
  if (!state.indexPromise) {
    state.indexPromise = (async () => {
      const cached = loadJson(STORAGE_KEY_INDEX, null);
      if (cached?.version && cached?.headphones) {
        state.index = cached;
        return cached;
      }
      const response = await fetch(INDEX_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load AutoEQ index (${response.status})`);
      }
      const json = await response.json();
      state.index = {
        version: json.version ?? new Date().toISOString(),
        total: Array.isArray(json.headphones) ? json.headphones.length : 0,
        sources: json.sources ?? [],
        types: json.types ?? [],
        targets: json.targets ?? [],
        headphones: Array.isArray(json.headphones)
          ? json.headphones.map(normalizeIndexEntry)
          : [],
      };
      saveJson(STORAGE_KEY_INDEX, state.index);
      return state.index;
    })();
  }
  return state.indexPromise;
}

export async function searchPresets({ query = "", source = null, type = null, target = null, page = 1, pageSize = 20 } = {}) {
  const index = await fetchIndex();
  const loweredQuery = query.trim().toLowerCase();
  const filtered = index.headphones.filter((item) => {
    const matchesQuery = !loweredQuery || item.name.toLowerCase().includes(loweredQuery);
    const matchesSource = !source || item.source === source;
    const matchesType = !type || item.type === type;
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

function getAuthHeaders() {
  const headers = { "User-Agent": "saku-audio-player" };
  if (state.settings.githubToken) {
    headers.Authorization = `Bearer ${state.settings.githubToken}`;
  }
  return headers;
}

async function fetchWithMirrors(path) {
  const mirrors = Array.isArray(state.settings.mirrors) && state.settings.mirrors.length > 0
    ? state.settings.mirrors
    : MIRRORS;
  let lastError;
  for (const base of mirrors) {
    const url = `${base}${path}`;
    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (response.status === 429 || response.status === 403) {
        lastError = new Error(`Rate limited (${response.status})`);
        continue;
      }
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
