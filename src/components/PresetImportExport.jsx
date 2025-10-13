import React, { useRef, useState, useCallback } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { 
  exportPresetAsJSON, 
  importPresetFromText, 
  validateImportedPreset,
  detectPresetFormat 
} from '../utils/peqIO';
import { addPresetToLibrary } from '../utils/presetLibrary';
import { EXPORT_FORMATS } from '../utils/formatDefinitions';
import { convertToPowerAmp } from '../utils/converters/powerampConverter';
import { convertToQudelix } from '../utils/converters/qudelixConverter';
import '../styles/PresetImportExport.css';

const PresetImportExport = () => {
  const { peqState, loadPeqPreset } = usePlayback();
  const { peqBands, preampGain, currentPresetName } = peqState;
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState({ type: 'idle', message: '' });
  const [selectedExportFormat, setSelectedExportFormat] = useState('autoeq-text');

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

  // Enhanced export handler with multiple format support
  const handleExport = useCallback(async () => {
    try {
      const preset = getCurrentPreset();
      
      // Find format by id instead of key
      const format = Object.values(EXPORT_FORMATS).find(f => f.id === selectedExportFormat);
      
      if (!format) {
        console.error('Available formats:', Object.values(EXPORT_FORMATS).map(f => f.id));
        console.error('Selected format:', selectedExportFormat);
        throw new Error(`Invalid export format selected: ${selectedExportFormat}`);
      }

      let content, filename, mimeType;
      
      switch (selectedExportFormat) {
        case 'native':
          content = JSON.stringify(preset, null, 2);
          filename = `${preset.name}.json`;
          mimeType = format.mimeType;
          break;
          
        case 'autoeq':
          // Use existing AutoEq JSON export from peqIO
          exportPresetAsJSON(preset, 'autoeq');
          setImportStatus({
            type: 'success',
            message: `Exported "${preset.name}" in AutoEq JSON format`
          });
          setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 2000);
          return;
          
        case 'autoeq-text':
          // Use AutoEq text export from peqIO
          exportPresetAsJSON(preset, 'autoeq-text');
          setImportStatus({
            type: 'success',
            message: `Exported "${preset.name}" in AutoEq ParametricEQ.txt format`
          });
          setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 2000);
          return;
          
        case 'poweramp':
          content = convertToPowerAmp(preset);
          filename = `${preset.name}.xml`;
          mimeType = format.mimeType;
          break;
          
        case 'qudelix':
          content = convertToQudelix(preset);
          filename = `${preset.name}.json`;
          mimeType = format.mimeType;
          break;
          
        default:
          throw new Error('Unsupported export format');
      }
      
      // Download the file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setImportStatus({
        type: 'success',
        message: `Exported "${preset.name}" in ${format.name} format`
      });
      setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 2000);
      
    } catch (error) {
      console.error('Export error:', error);
      console.error('Selected format was:', selectedExportFormat);
      console.error('Available formats:', Object.values(EXPORT_FORMATS).map(f => ({ id: f.id, name: f.name })));
      setImportStatus({
        type: 'error',
        message: `Export failed: ${error.message}`
      });
    }
  }, [getCurrentPreset, selectedExportFormat]);

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

        {/* Export Controls */}
        <div className="preset-import-export__export-row">
          <select
            id="export-format-select"
            value={selectedExportFormat}
            onChange={(e) => setSelectedExportFormat(e.target.value)}
            className="preset-import-export__format-select"
            title="Select export format"
          >
            {Object.entries(EXPORT_FORMATS).map(([key, format]) => (
              <option key={key} value={format.id}>
                {format.name}
              </option>
            ))}
          </select>
          
          <button
            type="button"
            className="preset-import-export__export-btn"
            onClick={handleExport}
            title={`Export in ${EXPORT_FORMATS[selectedExportFormat.toUpperCase()]?.name || 'selected'} format`}
          >
            <span className="preset-import-export__btn-icon">💾</span>
            Export
          </button>
        </div>
        
        <p className="preset-import-export__current-info">
          <strong>{currentPresetName}</strong>
          {preampGain !== 0 && (
            <span> ({preampGain > 0 ? '+' : ''}{preampGain.toFixed(1)}dB)</span>
          )}
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
          <summary>Formats: AutoEq, JSON, PowerAmp, Qudelix</summary>
          <div className="preset-import-export__help-content">
            <p><strong>AutoEq:</strong> Get presets from <a href="https://github.com/jaakkopasanen/AutoEq" target="_blank" rel="noopener noreferrer">github.com/jaakkopasanen/AutoEq</a></p>
            <p><strong>Import:</strong> Supports .txt, .json, .xml files</p>
            <p><strong>Export:</strong> Choose format from dropdown</p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default PresetImportExport;