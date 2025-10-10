import React, { useState, useEffect, useCallback } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { BUNDLED_PRESETS } from '../utils/peqPresets';
import {
  loadPresetLibrary,
  addPresetToLibrary,
  removePresetFromLibrary,
  togglePresetFavorite,
  incrementPresetUsage,
  getFavoritePresets,
  getMostUsedPresets
} from '../utils/presetLibrary';
import '../styles/PresetLibrary.css';

const PresetLibrary = () => {
  const { peqState, loadPeqPreset } = usePlayback();
  const { peqBands, preampGain, currentPresetName } = peqState;
  
  const [userPresets, setUserPresets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'favorites', 'recent'
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveStatus, setSaveStatus] = useState({ type: 'idle', message: '' });

  // Load user presets on mount
  useEffect(() => {
    setUserPresets(loadPresetLibrary());
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

  // Delete a user preset
  const handleDeletePreset = useCallback((presetId) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      try {
        removePresetFromLibrary(presetId);
        setUserPresets(loadPresetLibrary());
        setSaveStatus({ 
          type: 'success', 
          message: 'Preset deleted successfully' 
        });
        setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 2000);
      } catch (error) {
        setSaveStatus({ 
          type: 'error', 
          message: `Failed to delete preset: ${error.message}` 
        });
      }
    }
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
      case 'recent':
        presets = getMostUsedPresets(10);
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
            All ({userPresets.length})
          </button>
          <button
            type="button"
            className={`preset-library__tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            ⭐ Favorites
          </button>
          <button
            type="button"
            className={`preset-library__tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            🔥 Most Used
          </button>
        </div>
      </div>

      {/* Bundled Presets */}
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
    </div>
  );
};

export default PresetLibrary;