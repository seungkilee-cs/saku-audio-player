import { STORAGE_KEYS } from './peqIO';
import { validatePreset, normalizePreset } from './peqPresets';

/**
 * Preset library management with localStorage persistence
 */

/**
 * Load user preset library from localStorage
 * @returns {Array} - Array of user presets
 */
export function loadPresetLibrary() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRESET_LIBRARY);
    if (!stored) return [];
    
    const library = JSON.parse(stored);
    if (!Array.isArray(library)) return [];
    
    // Validate each preset
    return library.filter(preset => {
      try {
        validatePreset(preset);
        return true;
      } catch (error) {
        console.warn('Invalid preset in library, removing:', preset.name, error.message);
        return false;
      }
    });
  } catch (error) {
    console.error('Failed to load preset library:', error);
    return [];
  }
}

/**
 * Save preset library to localStorage
 * @param {Array} library - Array of presets
 */
export function savePresetLibrary(library) {
  try {
    const json = JSON.stringify(library, null, 2);
    localStorage.setItem(STORAGE_KEYS.PRESET_LIBRARY, json);
    console.log('Saved preset library with', library.length, 'presets');
  } catch (error) {
    console.error('Failed to save preset library:', error);
    throw new Error('Could not save preset library. Storage may be full.');
  }
}

/**
 * Add a preset to the library
 * @param {Object} preset - Preset to add
 * @returns {Object} - Added preset with metadata
 */
export function addPresetToLibrary(preset) {
  // Validate and normalize the preset
  const normalizedPreset = normalizePreset(preset);
  
  // Add metadata
  const libraryPreset = {
    ...normalizedPreset,
    id: generatePresetId(normalizedPreset),
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    usage: 0,
    favorite: false,
    source: preset.source || 'user'
  };
  
  // Load current library
  const library = loadPresetLibrary();
  
  // Check for duplicates by name
  const existingIndex = library.findIndex(p => p.name === libraryPreset.name);
  if (existingIndex >= 0) {
    // Update existing preset
    library[existingIndex] = {
      ...library[existingIndex],
      ...libraryPreset,
      id: library[existingIndex].id, // Keep original ID
      createdAt: library[existingIndex].createdAt, // Keep original creation date
      usage: library[existingIndex].usage, // Keep usage count
      favorite: library[existingIndex].favorite // Keep favorite status
    };
  } else {
    // Add new preset
    library.push(libraryPreset);
  }
  
  // Sort by name for consistent ordering
  library.sort((a, b) => a.name.localeCompare(b.name));
  
  savePresetLibrary(library);
  return libraryPreset;
}

/**
 * Remove a preset from the library
 * @param {string} presetId - ID of preset to remove
 */
export function removePresetFromLibrary(presetId) {
  const library = loadPresetLibrary();
  const filteredLibrary = library.filter(preset => preset.id !== presetId);
  
  if (filteredLibrary.length === library.length) {
    throw new Error('Preset not found in library');
  }
  
  savePresetLibrary(filteredLibrary);
  console.log('Removed preset from library:', presetId);
}

/**
 * Update preset usage count
 * @param {string} presetId - ID of preset
 */
export function incrementPresetUsage(presetId) {
  const library = loadPresetLibrary();
  const preset = library.find(p => p.id === presetId);
  
  if (preset) {
    preset.usage = (preset.usage || 0) + 1;
    preset.lastUsed = new Date().toISOString();
    savePresetLibrary(library);
  }
}

/**
 * Toggle preset favorite status
 * @param {string} presetId - ID of preset
 */
export function togglePresetFavorite(presetId) {
  const library = loadPresetLibrary();
  const preset = library.find(p => p.id === presetId);
  
  if (preset) {
    preset.favorite = !preset.favorite;
    preset.lastModified = new Date().toISOString();
    savePresetLibrary(library);
    return preset.favorite;
  }
  
  return false;
}

/**
 * Get preset by ID
 * @param {string} presetId - ID of preset
 * @returns {Object|null} - Preset or null if not found
 */
export function getPresetById(presetId) {
  const library = loadPresetLibrary();
  return library.find(preset => preset.id === presetId) || null;
}

/**
 * Search presets by name
 * @param {string} query - Search query
 * @returns {Array} - Matching presets
 */
export function searchPresets(query) {
  const library = loadPresetLibrary();
  const lowerQuery = query.toLowerCase();
  
  return library.filter(preset => 
    preset.name.toLowerCase().includes(lowerQuery) ||
    preset.description?.toLowerCase().includes(lowerQuery) ||
    preset.source?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get presets sorted by usage
 * @param {number} limit - Maximum number of presets to return
 * @returns {Array} - Most used presets
 */
export function getMostUsedPresets(limit = 5) {
  const library = loadPresetLibrary();
  return library
    .filter(preset => preset.usage > 0)
    .sort((a, b) => (b.usage || 0) - (a.usage || 0))
    .slice(0, limit);
}

/**
 * Get favorite presets
 * @returns {Array} - Favorite presets
 */
export function getFavoritePresets() {
  const library = loadPresetLibrary();
  return library.filter(preset => preset.favorite);
}

/**
 * Export entire preset library
 * @returns {string} - JSON string of library
 */
export function exportPresetLibrary() {
  const library = loadPresetLibrary();
  return JSON.stringify({
    version: '1.0',
    exportDate: new Date().toISOString(),
    presets: library
  }, null, 2);
}

/**
 * Import preset library (merge with existing)
 * @param {string} jsonData - JSON string of library export
 * @returns {number} - Number of presets imported
 */
export function importPresetLibrary(jsonData) {
  const data = JSON.parse(jsonData);
  
  if (!data.presets || !Array.isArray(data.presets)) {
    throw new Error('Invalid library format. Expected presets array.');
  }
  
  let importCount = 0;
  
  for (const preset of data.presets) {
    try {
      addPresetToLibrary(preset);
      importCount++;
    } catch (error) {
      console.warn('Failed to import preset:', preset.name, error.message);
    }
  }
  
  return importCount;
}

/**
 * Clear all user presets (with confirmation)
 * @param {boolean} confirmed - Must be true to actually clear
 */
export function clearPresetLibrary(confirmed = false) {
  if (!confirmed) {
    throw new Error('Library clear must be confirmed');
  }
  
  localStorage.removeItem(STORAGE_KEYS.PRESET_LIBRARY);
  console.log('Cleared preset library');
}

/**
 * Generate unique ID for preset
 * @param {Object} preset - Preset object
 * @returns {string} - Unique ID
 */
function generatePresetId(preset) {
  const timestamp = Date.now();
  const nameHash = preset.name
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
  return `${nameHash}-${timestamp}`;
}

/**
 * Get library statistics
 * @returns {Object} - Library stats
 */
export function getLibraryStats() {
  const library = loadPresetLibrary();
  
  return {
    total: library.length,
    favorites: library.filter(p => p.favorite).length,
    sources: [...new Set(library.map(p => p.source))],
    totalUsage: library.reduce((sum, p) => sum + (p.usage || 0), 0),
    mostUsed: library.reduce((max, p) => (p.usage || 0) > (max.usage || 0) ? p : max, {}),
    newest: library.reduce((newest, p) => 
      new Date(p.createdAt) > new Date(newest.createdAt || 0) ? p : newest, {}
    )
  };
}