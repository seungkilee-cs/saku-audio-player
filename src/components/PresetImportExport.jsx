import React, { useRef, useState, useCallback } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { 
  exportPresetAsJSON, 
  importPresetFromText, 
  validateImportedPreset,
  detectPresetFormat 
} from '../utils/peqIO';
import { addPresetToLibrary } from '../utils/presetLibrary';
import '../styles/PresetImportExport.css';

const PresetImportExport = () => {
  const { peqState, loadPeqPreset } = usePlayback();
  const { peqBands, preampGain, currentPresetName } = peqState;
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState({ type: 'idle', message: '' });
  const [isDragOver, setIsDragOver] = useState(false);

  // Create current preset object for export
  const getCurrentPreset = useCallback(() => {
    return {
      name: currentPresetName || 'Custom Preset',
      description: 'User-created EQ preset',
      version: '1.0',
      preamp: preampGain,
      bands: peqBands,
      createdAt: new Date().toISOString()
    };
  }, [currentPresetName, preampGain, peqBands]);

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

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await processImportFile(file);
    }
  }, [processImportFile]);

  // Export handlers
  const handleExportNative = useCallback(() => {
    try {
      const preset = getCurrentPreset();
      exportPresetAsJSON(preset, 'native');
      setImportStatus({
        type: 'success',
        message: `Exported "${preset.name}" in native format`
      });
      setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 2000);
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: `Export failed: ${error.message}`
      });
    }
  }, [getCurrentPreset]);

  const handleExportAutoEq = useCallback(() => {
    try {
      const preset = getCurrentPreset();
      exportPresetAsJSON(preset, 'autoeq');
      setImportStatus({
        type: 'success',
        message: `Exported "${preset.name}" in AutoEq format`
      });
      setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 2000);
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: `Export failed: ${error.message}`
      });
    }
  }, [getCurrentPreset]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearStatus = useCallback(() => {
    setImportStatus({ type: 'idle', message: '' });
  }, []);

  return (
    <div className="preset-import-export">
      <div className="preset-import-export__header">
        <h4>Import / Export</h4>
      </div>

      <div className="preset-import-export__actions">
        {/* Import Section */}
        <div className="preset-import-export__section">
          <h5>Import Preset</h5>
          <div 
            className={`preset-import-export__drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleImportClick}
          >
            <div className="preset-import-export__drop-content">
              <span className="preset-import-export__drop-icon">📁</span>
              <p>
                <strong>Click to select</strong> or drag & drop file
              </p>
              <p className="preset-import-export__drop-hint">
                Supports: JSON, AutoEq ParametricEQ.txt, PowerAmp
              </p>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            aria-label="Select preset file"
          />
        </div>

        {/* Export Section */}
        <div className="preset-import-export__section">
          <h5>Export Current Preset</h5>
          <div className="preset-import-export__export-buttons">
            <button
              type="button"
              className="preset-import-export__export-btn preset-import-export__export-btn--native"
              onClick={handleExportNative}
              title="Export in native format (recommended)"
            >
              <span className="preset-import-export__btn-icon">💾</span>
              Native Format
            </button>
            
            <button
              type="button"
              className="preset-import-export__export-btn preset-import-export__export-btn--autoeq"
              onClick={handleExportAutoEq}
              title="Export in AutoEq format for compatibility"
            >
              <span className="preset-import-export__btn-icon">🎧</span>
              AutoEq Format
            </button>
          </div>
          
          <p className="preset-import-export__export-info">
            Current: <strong>{currentPresetName}</strong>
            {preampGain !== 0 && (
              <span className="preset-import-export__preamp-info">
                {' '}(Preamp: {preampGain > 0 ? '+' : ''}{preampGain.toFixed(1)}dB)
              </span>
            )}
          </p>
        </div>
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

      {/* Help Section */}
      <div className="preset-import-export__help">
        <details>
          <summary>Supported Formats</summary>
          <div className="preset-import-export__help-content">
            <ul>
              <li><strong>Native JSON:</strong> Saku player's native format with full metadata</li>
              <li><strong>AutoEq ParametricEQ.txt:</strong> Text files from AutoEq headphone corrections</li>
              <li><strong>AutoEq JSON:</strong> JSON format AutoEq presets</li>
              <li><strong>PowerAmp:</strong> Import presets from PowerAmp music player</li>
            </ul>
            <div className="preset-import-export__autoeq-guide">
              <p><strong>How to get AutoEq presets:</strong></p>
              <ol>
                <li>Visit <a href="https://github.com/jaakkopasanen/AutoEq" target="_blank" rel="noopener noreferrer">AutoEq on GitHub</a></li>
                <li>Navigate to: <code>results/[brand]/[model]/</code></li>
                <li>Download the <strong>ParametricEQ.txt</strong> file</li>
                <li>Import it here for headphone correction</li>
              </ol>
              <p><em>Example: Sony WH-1000XM4 → results/Sony/WH-1000XM4/ParametricEQ.txt</em></p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default PresetImportExport;