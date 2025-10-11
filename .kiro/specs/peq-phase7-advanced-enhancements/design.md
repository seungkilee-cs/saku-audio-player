# Phase 7: Advanced PEQ Enhancements - Technical Design

## Architecture Overview

Phase 7 adds three main enhancement layers to the existing PEQ system:
1. **Audio Analysis Layer**: Real-time clipping detection
2. **Interaction Layer**: Global keyboard shortcuts
3. **Export Enhancement Layer**: Additional format support

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PeqPanel (Enhanced)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  ClippingMonitor│  │ KeyboardShortcuts│  │ ExportFormats│ │
│  │                 │  │                 │  │             │ │
│  │ AnalyserNode    │  │ Global Listeners│  │ PowerAmp    │ │
│  │ Visual Indicator│  │ Focus Management│  │ Qudelix     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 1. Clipping Monitor Implementation

### Audio Analysis Chain
```
AudioPlayer → PEQ Chain → AnalyserNode → Destination
                              ↓
                        ClippingMonitor
                              ↓
                        Visual Indicator
```

### ClippingMonitor Component
```javascript
// src/components/ClippingMonitor.jsx
const ClippingMonitor = ({ audioContext, peqChain }) => {
  const [isClipping, setIsClipping] = useState(false);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  
  // Setup AnalyserNode
  useEffect(() => {
    if (!audioContext || !peqChain?.output) return;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    
    // Connect after PEQ chain
    peqChain.output.connect(analyser);
    analyser.connect(audioContext.destination);
    
    analyserRef.current = analyser;
    startMonitoring();
    
    return () => {
      stopMonitoring();
      analyser.disconnect();
    };
  }, [audioContext, peqChain]);
  
  const startMonitoring = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    
    const checkClipping = () => {
      analyser.getFloatTimeDomainData(dataArray);
      
      // Check for peaks > 0 dBFS (1.0 in linear scale)
      const hasClipping = dataArray.some(sample => Math.abs(sample) >= 0.99);
      
      setIsClipping(hasClipping);
      animationRef.current = requestAnimationFrame(checkClipping);
    };
    
    checkClipping();
  };
  
  return (
    <div className={`clipping-monitor ${isClipping ? 'clipping' : ''}`}>
      <div className="clipping-indicator" />
      <span className="clipping-label">CLIP</span>
    </div>
  );
};
```

### Visual Design
```css
/* src/styles/ClippingMonitor.css */
.clipping-monitor {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--bg-secondary);
  transition: all 0.1s ease;
}

.clipping-monitor.clipping {
  background: var(--error-bg);
  animation: pulse-red 0.2s ease-in-out;
}

.clipping-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: background 0.1s ease;
}

.clipping-monitor.clipping .clipping-indicator {
  background: var(--error-color);
  box-shadow: 0 0 4px var(--error-color);
}

@keyframes pulse-red {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

## 2. Keyboard Shortcuts Implementation

### Global Shortcut Manager
```javascript
// src/hooks/useKeyboardShortcuts.js
const useKeyboardShortcuts = (actions) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Skip if user is typing in input fields
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' ||
          event.target.contentEditable === 'true') {
        return;
      }
      
      // Skip if modifier keys are pressed (Ctrl, Alt, etc.)
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          actions.toggleBypass();
          break;
          
        case 'arrowleft':
        case 'arrowup':
          event.preventDefault();
          actions.previousPreset();
          break;
          
        case 'arrowright':
        case 'arrowdown':
          event.preventDefault();
          actions.nextPreset();
          break;
          
        case 'r':
          event.preventDefault();
          actions.resetToFlat();
          break;
          
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};
```

### Integration with PeqPanel
```javascript
// Enhanced PeqPanel with shortcuts
const PeqPanel = () => {
  const { peqState, dispatch } = usePlaybackContext();
  const { presets } = usePresetLibrary();
  
  const shortcutActions = useMemo(() => ({
    toggleBypass: () => dispatch({ type: 'TOGGLE_BYPASS' }),
    previousPreset: () => cyclePrevPreset(),
    nextPreset: () => cycleNextPreset(),
    resetToFlat: () => loadPreset('Flat')
  }), [dispatch, presets]);
  
  useKeyboardShortcuts(shortcutActions);
  
  // ... rest of component
};
```

### Visual Feedback System
```javascript
// src/components/ShortcutFeedback.jsx
const ShortcutFeedback = ({ action, visible }) => {
  return (
    <div className={`shortcut-feedback ${visible ? 'visible' : ''}`}>
      <span className="shortcut-action">{action}</span>
    </div>
  );
};
```

## 3. Extended Format Support

### Format Definitions
```javascript
// src/utils/formatDefinitions.js
export const EXPORT_FORMATS = {
  NATIVE: {
    id: 'native',
    name: 'Saku Native JSON',
    extension: 'json',
    mimeType: 'application/json'
  },
  AUTOEQ: {
    id: 'autoeq',
    name: 'AutoEq ParametricEQ.txt',
    extension: 'txt',
    mimeType: 'text/plain'
  },
  POWERAMP: {
    id: 'poweramp',
    name: 'PowerAmp XML',
    extension: 'xml',
    mimeType: 'application/xml'
  },
  QUDELIX: {
    id: 'qudelix',
    name: 'Qudelix JSON',
    extension: 'json',
    mimeType: 'application/json'
  }
};
```

### PowerAmp XML Converter
```javascript
// src/utils/converters/powerampConverter.js
export const convertToPowerAmp = (preset) => {
  const { bands, preampGain, name } = preset;
  
  // PowerAmp uses 10-band EQ with fixed frequencies
  const powerampBands = bands.map((band, index) => {
    return {
      frequency: band.freq,
      gain: band.gain,
      enabled: band.gain !== 0
    };
  });
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<poweramp_equalizer version="1.0">
  <preset name="${escapeXml(name)}">
    <preamp gain="${preampGain}" />
    ${powerampBands.map((band, i) => 
      `<band index="${i}" freq="${band.frequency}" gain="${band.gain}" enabled="${band.enabled}" />`
    ).join('\n    ')}
  </preset>
</poweramp_equalizer>`;
  
  return xml;
};
```

### Qudelix JSON Converter
```javascript
// src/utils/converters/qudelixConverter.js
export const convertToQudelix = (preset) => {
  const { bands, preampGain, name } = preset;
  
  // Qudelix format structure
  const qudelixPreset = {
    name: name,
    version: "1.0",
    eq: {
      enabled: true,
      preamp: preampGain,
      bands: bands.map((band, index) => ({
        id: index,
        frequency: band.freq,
        gain: band.gain,
        q: band.q,
        type: mapFilterType(band.type),
        enabled: band.gain !== 0
      }))
    }
  };
  
  return JSON.stringify(qudelixPreset, null, 2);
};

const mapFilterType = (sakuType) => {
  const typeMap = {
    'peaking': 'bell',
    'lowshelf': 'low_shelf',
    'highshelf': 'high_shelf',
    'lowpass': 'low_pass',
    'highpass': 'high_pass'
  };
  return typeMap[sakuType] || 'bell';
};
```

### Enhanced Export UI
```javascript
// Enhanced PresetImportExport with format selection
const PresetImportExport = () => {
  const [selectedFormat, setSelectedFormat] = useState('native');
  
  const handleExport = async () => {
    const { currentPreset } = usePlaybackContext();
    
    let content, filename, mimeType;
    
    switch (selectedFormat) {
      case 'poweramp':
        content = convertToPowerAmp(currentPreset);
        filename = `${currentPreset.name}.xml`;
        mimeType = 'application/xml';
        break;
        
      case 'qudelix':
        content = convertToQudelix(currentPreset);
        filename = `${currentPreset.name}.json`;
        mimeType = 'application/json';
        break;
        
      default:
        content = JSON.stringify(currentPreset, null, 2);
        filename = `${currentPreset.name}.json`;
        mimeType = 'application/json';
    }
    
    downloadFile(content, filename, mimeType);
  };
  
  return (
    <div className="preset-export-enhanced">
      <div className="format-selector">
        <label>Export Format:</label>
        <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
          {Object.entries(EXPORT_FORMATS).map(([key, format]) => (
            <option key={key} value={format.id}>
              {format.name}
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleExport}>Export Preset</button>
    </div>
  );
};
```

## 4. Integration Points

### PeqPanel Enhancement
```javascript
// src/components/PeqPanel.jsx - Enhanced version
const PeqPanel = () => {
  return (
    <div className="peq-panel">
      {/* Existing controls */}
      <div className="peq-header">
        <div className="peq-status">
          <span className="current-preset">{currentPresetName}</span>
          <ClippingMonitor audioContext={audioContext} peqChain={peqChain} />
        </div>
        <div className="peq-global-controls">
          {/* Existing bypass, reset controls */}
        </div>
      </div>
      
      {/* Existing band controls and chart */}
      
      {/* Enhanced import/export */}
      <PresetImportExport />
      
      {/* Shortcut help */}
      <div className="shortcut-help">
        <small>
          Shortcuts: B=Bypass, ←→=Presets, R=Reset
        </small>
      </div>
    </div>
  );
};
```

## 5. Performance Considerations

### AnalyserNode Optimization
- **Buffer Size**: 2048 samples balances accuracy with performance
- **Update Rate**: 60 FPS using requestAnimationFrame
- **Smoothing**: 0.3 smoothing constant reduces false positives
- **Threshold**: 0.99 linear (≈-0.09 dB) to catch near-clipping

### Memory Management
- Proper cleanup of event listeners
- AnalyserNode disconnection on unmount
- Animation frame cancellation

### CPU Impact
- Target: <1% additional CPU usage
- Monitoring: Use Chrome DevTools Performance tab
- Optimization: Reduce update frequency if needed

## 6. Testing Strategy

### Clipping Monitor Tests
- Generate test tones at various levels
- Verify detection accuracy at 0 dBFS threshold
- Test with different audio formats and sample rates
- Measure performance impact

### Keyboard Shortcut Tests
- Test all defined shortcuts
- Verify focus management (skip when typing)
- Test modifier key combinations
- Cross-browser compatibility

### Format Export Tests
- Export presets in each format
- Import into target applications (PowerAmp, Qudelix)
- Verify frequency/gain accuracy
- Test edge cases (extreme values, special characters)

## 7. Error Handling

### Clipping Monitor
- Graceful degradation if AnalyserNode unavailable
- Fallback to basic visual indicator
- Error logging for debugging

### Keyboard Shortcuts
- Prevent default browser shortcuts
- Handle focus edge cases
- Graceful failure if actions unavailable

### Format Conversion
- Validate input data before conversion
- Handle unsupported frequency ranges
- Provide meaningful error messages

This design provides a comprehensive enhancement to the PEQ system while maintaining performance and reliability standards established in previous phases.