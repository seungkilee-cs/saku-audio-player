import React, { useState, useEffect, useCallback } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { BUNDLED_PRESETS } from '../utils/peqPresets';
import {
  loadPresetLibrary,
  addPresetToLibrary,
  removePresetFromLibrary,
  togglePresetFavorite,
  incrementPresetUsage,
  getFavoritePresets
} from '../utils/presetLibrary';
import { getStorageInfo } from '../utils/peqPersistence';
import '../styles/PresetLibrary.css';

const PresetLibrary = ({ onPresetChanged }) => {
  const { peqState, loadPeqPreset } = usePlayback();
  const { peqBands, preampGain, currentPresetName } = peqState;
  
  const [userPresets, setUserPresets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'custom', 'favorites'
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveStatus, setSaveStatus] = useState({ type: 'idle', message: '' });
  const [storageInfo, setStorageInfo] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { presetId, presetName }

  // ESC key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showSaveDialog) setShowSaveDialog(false);
        if (deleteConfirmation) setDeleteConfirmation(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showSaveDialog, deleteConfirmation]);

  // Load user presets and storage info on mount
  useEffect(() => {
    setUserPresets(loadPresetLibrary());
    setStorageInfo(getStorageInfo());
  }, []);

  // Get current preset for saving
  const getCurrentPreset = useCallback(() => {
    return {
      name: newPresetName || `Custom Preset ${Date.now()}`,
      description: 'User-created EQ preset',
      version: '1.0',
      preamp: preampGain,
      bands: peqBands,
      source: 'user'
    };
  }, [newPresetName, preampGain, peqBands]);

  // Save current settings as new preset
  const handleSavePreset = useCallback(async () => {
    if (!newPresetName.trim()) {
      setSaveStatus({ type: 'error', message: 'Please enter a preset name' });
      return;
    }

    try {
      const preset = getCurrentPreset();
      const savedPreset = addPresetToLibrary(preset);
      
      // Refresh library
      setUserPresets(loadPresetLibrary());
      
      // Notify parent that preset library has changed
      onPresetChanged?.();
      
      setSaveStatus({ 
        type: 'success', 
        message: `Saved "${savedPreset.name}" to library` 
      });
      
      setShowSaveDialog(false);
      setNewPresetName('');
      
      // Clear success message after 2 seconds
      setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 2000);
      
    } catch (error) {
      setSaveStatus({ 
        type: 'error', 
        message: `Failed to save preset: ${error.message}` 
      });
    }
  }, [newPresetName, getCurrentPreset]);

  // Load a preset
  const handleLoadPreset = useCallback((preset) => {
    loadPeqPreset(preset);
    
    // Increment usage if it's a user preset
    if (preset.id) {
      incrementPresetUsage(preset.id);
      setUserPresets(loadPresetLibrary()); // Refresh to show updated usage
    }
  }, [loadPeqPreset]);

  // Show delete confirmation
  const handleDeletePreset = useCallback((presetId) => {
    const preset = userPresets.find(p => p.id === presetId);
    setDeleteConfirmation({ presetId, presetName: preset?.name || 'Unknown' });
  }, [userPresets]);

  // Confirm deletion
  const confirmDelete = useCallback(() => {
    if (!deleteConfirmation) return;
    
    try {
      // Check if we're deleting the currently applied preset
      const isCurrentPreset = deleteConfirmation.presetName === currentPresetName;
      
      removePresetFromLibrary(deleteConfirmation.presetId);
      setUserPresets(loadPresetLibrary());
      
      // Notify parent that preset library has changed
      onPresetChanged?.();
      
      // If we deleted the currently applied preset, reset to flat
      if (isCurrentPreset) {
        const flatPreset = {
          name: 'Flat',
          description: 'Flat response (no EQ)',
          version: '1.0',
          preamp: 0,
          bands: Array(10).fill(null).map((_, i) => ({
            frequency: [60, 150, 400, 1000, 2400, 4800, 9600, 12000, 14000, 16000][i],
            type: i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking',
            gain: 0,
            Q: i === 0 || i === 9 ? 0.707 : 1.0
          }))
        };
        loadPeqPreset(flatPreset);
        setSaveStatus({ 
          type: 'success', 
          message: 'Preset deleted and EQ reset to flat' 
        });
      } else {
        setSaveStatus({ 
          type: 'success', 
          message: 'Preset deleted successfully' 
        });
      }
      
      setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 2000);
    } catch (error) {
      setSaveStatus({ 
        type: 'error', 
        message: `Failed to delete preset: ${error.message}` 
      });
    }
    
    setDeleteConfirmation(null);
  }, [deleteConfirmation, currentPresetName, loadPeqPreset]);

  // Cancel deletion
  const cancelDelete = useCallback(() => {
    setDeleteConfirmation(null);
  }, []);

  // Toggle favorite status
  const handleToggleFavorite = useCallback((presetId) => {
    const isFavorite = togglePresetFavorite(presetId);
    setUserPresets(loadPresetLibrary());
    
    const preset = userPresets.find(p => p.id === presetId);
    setSaveStatus({ 
      type: 'success', 
      message: `${preset?.name} ${isFavorite ? 'added to' : 'removed from'} favorites` 
    });
    setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 2000);
  }, [userPresets]);

  // Get filtered presets based on active tab and search
  const getFilteredPresets = useCallback(() => {
    let presets = [];
    
    switch (activeTab) {
      case 'favorites':
        presets = getFavoritePresets();
        break;
      case 'custom':
        // Only show user-created presets (exclude bundled)
        presets = userPresets.filter(p => p.source === 'user' || !p.source);
        break;
      case 'all':
      default:
        presets = userPresets;
        break;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      presets = presets.filter(preset =>
        preset.name.toLowerCase().includes(query.toLowerCase()) ||
        preset.description?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return presets;
  }, [activeTab, searchQuery, userPresets]);

  const filteredPresets = getFilteredPresets();
  const customPresetsCount = userPresets.filter(p => p.source === 'user' || !p.source).length;
  const bundledPresetsCount = Object.keys(BUNDLED_PRESETS).length;
  const totalPresetsCount = userPresets.length + bundledPresetsCount;

  return (
    <div className="preset-library">
      <div className="preset-library__header">
        <h4>Preset Library</h4>
        <button
          type="button"
          className="preset-library__save-btn"
          onClick={() => {
            setNewPresetName(currentPresetName || '');
            setShowSaveDialog(true);
          }}
        >
          💾 Save Current
        </button>
      </div>

      {/* Search and Tabs */}
      <div className="preset-library__controls">
        <input
          type="text"
          className="preset-library__search"
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="preset-library__tabs">
          <button
            type="button"
            className={`preset-library__tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({totalPresetsCount})
          </button>
          <button
            type="button"
            className={`preset-library__tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            👤 Custom ({customPresetsCount})
          </button>
          <button
            type="button"
            className={`preset-library__tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            ⭐ Favorites
          </button>
        </div>
      </div>

      {/* Bundled Presets - Only show in "All" tab */}
      {activeTab === 'all' && (
        <div className="preset-library__section">
          <h5>Built-in Presets</h5>
          <div className="preset-library__grid">
            {Object.values(BUNDLED_PRESETS).map((preset) => (
              <div
                key={preset.name}
                className={`preset-library__item preset-library__item--bundled ${
                  currentPresetName === preset.name ? 'active' : ''
                }`}
              >
                <div className="preset-library__item-header">
                  <h6>{preset.name}</h6>
                </div>
                <p className="preset-library__item-description">
                  {preset.description}
                </p>
                <div className="preset-library__item-actions">
                  <button
                    type="button"
                    className="preset-library__load-btn"
                    onClick={() => handleLoadPreset(preset)}
                  >
                    Load
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Presets */}
      <div className="preset-library__section">
        <h5>Your Presets</h5>
        {filteredPresets.length === 0 ? (
          <div className="preset-library__empty">
            {userPresets.length === 0 ? (
              <p>No saved presets yet. Save your current EQ settings to get started!</p>
            ) : (
              <p>No presets match your search.</p>
            )}
          </div>
        ) : (
          <div className="preset-library__grid">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className={`preset-library__item ${
                  currentPresetName === preset.name ? 'active' : ''
                }`}
              >
                <div className="preset-library__item-header">
                  <h6>{preset.name}</h6>
                  <div className="preset-library__item-meta">
                    <button
                      type="button"
                      className={`preset-library__favorite-btn ${preset.favorite ? 'active' : ''}`}
                      onClick={() => handleToggleFavorite(preset.id)}
                      title={preset.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      ⭐
                    </button>
                    {preset.usage > 0 && (
                      <span className="preset-library__usage">
                        {preset.usage} uses
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="preset-library__item-description">
                  {preset.description}
                </p>
                
                <div className="preset-library__item-info">
                  <span className="preset-library__item-preamp">
                    Preamp: {preset.preamp > 0 ? '+' : ''}{preset.preamp.toFixed(1)}dB
                  </span>
                  <span className="preset-library__item-source">
                    {preset.source === 'autoeq' ? '🎧 AutoEq' : 
                     preset.source === 'user' ? '👤 Custom' : preset.source}
                  </span>
                </div>
                
                <div className="preset-library__item-actions">
                  <button
                    type="button"
                    className="preset-library__load-btn"
                    onClick={() => handleLoadPreset(preset)}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="preset-library__delete-btn"
                    onClick={() => handleDeletePreset(preset.id)}
                    title="Delete preset"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="preset-library__modal-overlay">
          <div className="preset-library__modal">
            <h5>Save Current Preset</h5>
            <input
              type="text"
              className="preset-library__name-input"
              placeholder="Enter preset name..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              autoFocus
            />
            <div className="preset-library__modal-actions">
              <button
                type="button"
                className="preset-library__modal-btn preset-library__modal-btn--cancel"
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPresetName('');
                  setSaveStatus({ type: 'idle', message: '' });
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="preset-library__modal-btn preset-library__modal-btn--save"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {saveStatus.type !== 'idle' && (
        <div className={`preset-library__status preset-library__status--${saveStatus.type}`}>
          <span className="preset-library__status-icon">
            {saveStatus.type === 'success' && '✅'}
            {saveStatus.type === 'error' && '❌'}
          </span>
          <span className="preset-library__status-message">
            {saveStatus.message}
          </span>
        </div>
      )}

      {/* Storage Info */}
      {storageInfo && storageInfo.available && (
        <div className="preset-library__storage-info">
          <p>Storage: {Math.round(storageInfo.totalSize / 1024)}KB used</p>
          {storageInfo.totalSize > 50000 && (
            <p className="storage-warning">Storage usage is high. Consider removing unused presets.</p>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="preset-library__delete-overlay">
          <div className="preset-library__delete-dialog">
            <h3>Delete Preset</h3>
            <p>Are you sure you want to delete "{deleteConfirmation.presetName}"?</p>
            <p>This action cannot be undone.</p>
            <div className="preset-library__delete-actions">
              <button 
                type="button" 
                className="preset-library__delete-cancel"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="preset-library__delete-confirm"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetLibrary;