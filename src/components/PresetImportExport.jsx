import React, { useRef, useState, useCallback } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { 
  importPresetFromText, 
  validateImportedPreset,
  detectPresetFormat 
} from '../utils/peqIO';
import { addPresetToLibrary } from '../utils/presetLibrary';
import '../styles/PresetImportExport.css';

const PresetImportExport = ({ onPresetAdded }) => {
  const { peqState, loadPeqPreset } = usePlayback();
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState({ type: 'idle', message: '' });

  // Handle file selection via input
  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await processImportFile(file);
    
    // Reset input for re-uploads
    event.target.value = '';
  }, []);

  // Process imported file
  const processImportFile = useCallback(async (file) => {
    const isValidFile = file.type.includes('json') || 
                       file.name.endsWith('.json') || 
                       file.name.endsWith('.txt') ||
                       file.type.includes('text');
    
    if (!isValidFile) {
      setImportStatus({
        type: 'error',
        message: 'Please select a JSON (.json) or AutoEq text (.txt) file'
      });
      return;
    }

    setImportStatus({ type: 'loading', message: 'Processing preset...' });

    try {
      const text = await file.text();
      const importedPreset = importPresetFromText(text, file.name);
      const validation = validateImportedPreset(importedPreset);

      if (!validation.success) {
        setImportStatus({
          type: 'error',
          message: validation.message
        });
        return;
      }

      // Detect original format for user info
      let originalFormat = 'autoeq-text'; // Default for text files
      let formatLabel = 'AutoEq ParametricEQ.txt';
      
      try {
        const jsonData = JSON.parse(text);
        originalFormat = detectPresetFormat(jsonData);
        formatLabel = {
          'native': 'Native JSON',
          'autoeq': 'AutoEq JSON',
          'poweramp': 'PowerAmp JSON',
          'generic': 'Generic JSON'
        }[originalFormat] || 'Unknown JSON';
      } catch {
        // Text format, keep defaults
      }

      // Load the preset
      loadPeqPreset(validation.preset);

      // Save to library if it's not already there
      try {
        addPresetToLibrary(validation.preset);
        // Notify parent that preset library has changed
        onPresetAdded?.();
      } catch (error) {
        console.warn('Could not save to library:', error.message);
      }

      setImportStatus({
        type: 'success',
        message: `Successfully loaded "${validation.preset.name}" (${formatLabel} format)`
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setImportStatus({ type: 'idle', message: '' });
      }, 3000);

    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus({
        type: 'error',
        message: `Import failed: ${error.message}`
      });
    }
  }, [loadPeqPreset]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearStatus = useCallback(() => {
    setImportStatus({ type: 'idle', message: '' });
  }, []);

  return (
    <div className="preset-import-export">
      <div className="preset-import-export__header">
        <h4>Manual Import</h4>
      </div>

      {/* Compact Single-Column Layout */}
      <div className="preset-import-export__actions">
        {/* Import Button */}
        <button
          type="button"
          className="preset-import-export__import-btn"
          onClick={handleImportClick}
          title="Import preset from file"
        >
          <span className="preset-import-export__btn-icon">📁</span>
          Import Preset
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          aria-label="Select preset file"
        />

        <p className="preset-import-export__current-info">
          Upload AutoEQ `.txt` or JSON files to import a preset directly into the equalizer.
        </p>
      </div>

      {/* Status Messages */}
      {importStatus.type !== 'idle' && (
        <div className={`preset-import-export__status preset-import-export__status--${importStatus.type}`}>
          <div className="preset-import-export__status-content">
            <span className="preset-import-export__status-icon">
              {importStatus.type === 'loading' && '⏳'}
              {importStatus.type === 'success' && '✅'}
              {importStatus.type === 'error' && '❌'}
            </span>
            <span className="preset-import-export__status-message">
              {importStatus.message}
            </span>
            {importStatus.type === 'error' && (
              <button
                type="button"
                className="preset-import-export__status-close"
                onClick={clearStatus}
                aria-label="Close error message"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compact Help */}
      <div className="preset-import-export__help">
        <details>
          <summary>Supported formats</summary>
          <div className="preset-import-export__help-content">
            <p><strong>AutoEq:</strong> Load `.txt` or JSON presets from <a href="https://github.com/jaakkopasanen/AutoEq" target="_blank" rel="noopener noreferrer">github.com/jaakkopasanen/AutoEq</a></p>
            <p><strong>Import:</strong> `.txt` (ParametricEQ) or JSON exports produced by AutoEq and compatible tools.</p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default PresetImportExport;