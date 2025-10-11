import { STORAGE_KEYS } from './peqIO';

/**
 * PEQ state persistence utilities
 * Handles automatic save/restore of EQ settings between sessions
 */

/**
 * Save current PEQ state to localStorage
 * @param {Object} peqState - Current PEQ state from context
 */
export function savePeqState(peqState) {
  try {
    const stateToSave = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      peqEnabled: peqState.peqEnabled,
      peqBypass: peqState.peqBypass,
      peqBands: peqState.peqBands,
      preampGain: peqState.preampGain,
      preampAuto: peqState.preampAuto,
      currentPresetName: peqState.currentPresetName
    };

    const json = JSON.stringify(stateToSave);
    localStorage.setItem(STORAGE_KEYS.PEQ_STATE, json);
    
    console.log('PEQ state saved to localStorage');
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, attempting minimal save');
      
      // Fallback: save only essential state
      try {
        const minimalState = {
          currentPresetName: peqState.currentPresetName,
          peqBypass: peqState.peqBypass,
          preampGain: peqState.preampGain
        };
        
        localStorage.setItem(STORAGE_KEYS.PEQ_STATE, JSON.stringify(minimalState));
        console.log('Minimal PEQ state saved');
      } catch (fallbackError) {
        console.error('Failed to save even minimal PEQ state:', fallbackError);
      }
    } else {
      console.error('Failed to save PEQ state:', error);
    }
  }
}

/**
 * Load PEQ state from localStorage
 * @returns {Object|null} - Saved PEQ state or null if not found/invalid
 */
export function loadPeqState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PEQ_STATE);
    if (!stored) {
      console.log('No saved PEQ state found');
      return null;
    }

    const parsed = JSON.parse(stored);
    
    // Validate the loaded state
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid PEQ state format, ignoring');
      return null;
    }

    // Check if state is too old (older than 30 days)
    if (parsed.timestamp) {
      const stateAge = Date.now() - new Date(parsed.timestamp).getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      
      if (stateAge > maxAge) {
        console.log('PEQ state is too old, ignoring');
        clearPeqState();
        return null;
      }
    }

    console.log('PEQ state loaded from localStorage:', parsed.currentPresetName || 'Unknown preset');
    return parsed;
  } catch (error) {
    console.error('Failed to load PEQ state:', error);
    
    // Clear corrupted state
    try {
      localStorage.removeItem(STORAGE_KEYS.PEQ_STATE);
    } catch (clearError) {
      console.error('Failed to clear corrupted PEQ state:', clearError);
    }
    
    return null;
  }
}

/**
 * Clear saved PEQ state
 */
export function clearPeqState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PEQ_STATE);
    console.log('PEQ state cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear PEQ state:', error);
  }
}

/**
 * Check if localStorage is available and working
 * @returns {boolean} - True if localStorage is available
 */
export function isStorageAvailable() {
  try {
    const testKey = '__peq_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage not available:', error.message);
    return false;
  }
}

/**
 * Get storage usage information
 * @returns {Object} - Storage usage stats
 */
export function getStorageInfo() {
  if (!isStorageAvailable()) {
    return { available: false };
  }

  try {
    const peqState = localStorage.getItem(STORAGE_KEYS.PEQ_STATE);
    const presetLibrary = localStorage.getItem(STORAGE_KEYS.PRESET_LIBRARY);
    
    return {
      available: true,
      peqStateSize: peqState ? peqState.length : 0,
      presetLibrarySize: presetLibrary ? presetLibrary.length : 0,
      totalSize: (peqState?.length || 0) + (presetLibrary?.length || 0),
      hasPeqState: !!peqState,
      hasPresetLibrary: !!presetLibrary
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return { available: false, error: error.message };
  }
}

/**
 * Debounced save function to prevent excessive localStorage writes
 */
let saveTimeout = null;

export function debouncedSavePeqState(peqState, delay = 1000) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    savePeqState(peqState);
    saveTimeout = null;
  }, delay);
}

/**
 * Validate that a loaded state is compatible with current system
 * @param {Object} state - Loaded state object
 * @returns {boolean} - True if state is valid and compatible
 */
export function validateLoadedState(state) {
  if (!state || typeof state !== 'object') {
    return false;
  }

  // Check for required properties
  const requiredProps = ['peqBands'];
  for (const prop of requiredProps) {
    if (!(prop in state)) {
      console.warn(`Missing required property in loaded state: ${prop}`);
      return false;
    }
  }

  // Validate peqBands structure
  if (!Array.isArray(state.peqBands)) {
    console.warn('peqBands is not an array');
    return false;
  }

  // Validate each band
  for (let i = 0; i < state.peqBands.length; i++) {
    const band = state.peqBands[i];
    if (!band || typeof band !== 'object') {
      console.warn(`Invalid band at index ${i}`);
      return false;
    }

    if (typeof band.frequency !== 'number' || 
        typeof band.gain !== 'number' || 
        typeof band.Q !== 'number' ||
        typeof band.type !== 'string') {
      console.warn(`Invalid band properties at index ${i}`);
      return false;
    }

    // Validate ranges
    if (band.frequency < 20 || band.frequency > 20000) {
      console.warn(`Invalid frequency at band ${i}: ${band.frequency}`);
      return false;
    }

    if (band.gain < -24 || band.gain > 24) {
      console.warn(`Invalid gain at band ${i}: ${band.gain}`);
      return false;
    }

    if (band.Q < 0.1 || band.Q > 10) {
      console.warn(`Invalid Q at band ${i}: ${band.Q}`);
      return false;
    }
  }

  return true;
}