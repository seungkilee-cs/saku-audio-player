# Browser Extension Integration Plan

## Executive Summary

**Feasibility**: ⭐⭐⭐⭐⭐ (5/5) - Highly feasible and LEGAL  
**Effort**: ⭐⭐⭐☆☆ (3/5) - Moderate (1-2 weeks)  
**Legal Risk**: ⭐☆☆☆☆ (1/5) - Minimal (user's local audio processing)  
**Recommendation**: ✅ **HIGHLY RECOMMENDED** - Best approach for streaming services

---

## 1. Why Browser Extension is Superior

### Advantages Over Direct Integration

| Feature | Web App Integration | Browser Extension |
|---------|-------------------|-------------------|
| **Legal** | ❌ ToS violations | ✅ Legal (local processing) |
| **Streaming Support** | ❌ Impossible (DRM) | ✅ Works with ALL services |
| **Maintenance** | ❌ Very high | ✅ Low |
| **Installation** | ✅ None | ⚠️ One-time install |
| **Cross-Platform** | ✅ Any OS | ✅ Any OS with browser |
| **Effort** | ❌ 4-8 weeks | ✅ 1-2 weeks |
| **Cost** | ❌ $10k-50k+ | ✅ $0 |

**Winner**: Browser Extension by far

---

## 2. How It Works

### Architecture

```
Browser Tab (Spotify/YouTube/etc)
    ↓ (Audio Stream)
Web Audio API Injection
    ↓
PEQ Processing Chain
    ↓
User's Speakers
```

### Technical Flow

```javascript
// 1. Extension injects content script into tab
// 2. Content script intercepts audio context
// 3. Applies PEQ processing
// 4. Outputs processed audio

// Background script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isStreamingService(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js']
    });
  }
});

// Content script (injected into page)
const originalAudioContext = window.AudioContext;
window.AudioContext = function(...args) {
  const context = new originalAudioContext(...args);
  
  // Intercept createMediaElementSource
  const originalCreateSource = context.createMediaElementSource;
  context.createMediaElementSource = function(element) {
    const source = originalCreateSource.call(context, element);
    
    // Insert PEQ chain
    const peqChain = createPeqChain(context);
    source.connect(peqChain.inputNode);
    peqChain.outputNode.connect(context.destination);
    
    return source;
  };
  
  return context;
};
```

---

## 3. Extension Structure

```
saku-peq-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background tasks
├── content/
│   ├── injector.js            # Audio context interceptor
│   ├── peq-processor.js       # PEQ logic (from npm package)
│   └── ui-overlay.js          # Control panel overlay
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup logic
│   └── popup.css              # Popup styles
├── options/
│   ├── options.html           # Settings page
│   └── options.js             # Settings logic
├── lib/
│   └── peq-10band.js          # Your PEQ library
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 4. manifest.json

```json
{
  "manifest_version": 3,
  "name": "Saku PEQ - Universal Audio Equalizer",
  "version": "1.0.0",
  "description": "10-band parametric EQ for any streaming service",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://open.spotify.com/*",
    "https://music.youtube.com/*",
    "https://www.youtube.com/*",
    "https://soundcloud.com/*",
    "https://music.apple.com/*",
    "*://*/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["lib/peq-10band.js", "content/injector.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options/options.html",
  "web_accessible_resources": [
    {
      "resources": ["content/ui-overlay.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 5. Core Implementation

### 5.1 Audio Context Interception

```javascript
// content/injector.js

(function() {
  'use strict';
  
  // Store original constructors
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
  const OriginalAudio = window.Audio;
  const OriginalHTMLMediaElement = HTMLMediaElement.prototype;
  
  // Global PEQ state
  let globalPEQSettings = null;
  
  // Load settings from extension storage
  chrome.storage.sync.get(['peqSettings'], (result) => {
    globalPEQSettings = result.peqSettings || getDefaultSettings();
  });
  
  // Intercept AudioContext
  const CustomAudioContext = function(...args) {
    const ctx = new OriginalAudioContext(...args);
    
    // Wrap createMediaElementSource
    const originalCreateSource = ctx.createMediaElementSource.bind(ctx);
    ctx.createMediaElementSource = function(element) {
      const source = originalCreateSource(element);
      
      if (globalPEQSettings && globalPEQSettings.enabled) {
        // Create PEQ chain
        const peqChain = createPeqChain(ctx, globalPEQSettings.bands);
        updatePeqFilters(peqChain.filters, globalPEQSettings.bands);
        updatePreamp(peqChain.preampNode, globalPEQSettings.preamp);
        
        // Insert into audio graph
        source.connect(peqChain.inputNode);
        
        // Store reference for live updates
        window.__SAKU_PEQ__ = peqChain;
        
        return {
          ...source,
          connect: function(destination) {
            peqChain.outputNode.connect(destination);
          },
          disconnect: function() {
            peqChain.outputNode.disconnect();
          }
        };
      }
      
      return source;
    };
    
    return ctx;
  };
  
  // Replace global AudioContext
  window.AudioContext = CustomAudioContext;
  window.webkitAudioContext = CustomAudioContext;
  
  // Listen for settings updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_PEQ') {
      globalPEQSettings = message.settings;
      
      // Update live if PEQ chain exists
      if (window.__SAKU_PEQ__) {
        updatePeqFilters(window.__SAKU_PEQ__.filters, message.settings.bands);
        updatePreamp(window.__SAKU_PEQ__.preampNode, message.settings.preamp);
      }
      
      sendResponse({ success: true });
    }
  });
})();
```

### 5.2 Extension Popup UI

```javascript
// popup/popup.js

class PEQPopup {
  constructor() {
    this.settings = null;
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    this.renderUI();
    this.attachEventListeners();
  }
  
  async loadSettings() {
    const result = await chrome.storage.sync.get(['peqSettings']);
    this.settings = result.peqSettings || getDefaultSettings();
  }
  
  async saveSettings() {
    await chrome.storage.sync.set({ peqSettings: this.settings });
    
    // Notify all tabs
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_PEQ',
        settings: this.settings
      });
    });
  }
  
  renderUI() {
    const container = document.getElementById('peq-controls');
    
    // Render band controls
    this.settings.bands.forEach((band, index) => {
      const bandControl = this.createBandControl(band, index);
      container.appendChild(bandControl);
    });
    
    // Render preamp
    const preampControl = this.createPreampControl();
    container.appendChild(preampControl);
  }
  
  createBandControl(band, index) {
    const div = document.createElement('div');
    div.className = 'band-control';
    div.innerHTML = `
      <label>${band.frequency}Hz</label>
      <input type="range" 
             min="-12" max="12" step="0.1" 
             value="${band.gain}"
             data-band="${index}">
      <span class="gain-value">${band.gain.toFixed(1)}dB</span>
    `;
    return div;
  }
  
  attachEventListeners() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const bandIndex = parseInt(e.target.dataset.band);
        const gain = parseFloat(e.target.value);
        
        this.settings.bands[bandIndex].gain = gain;
        this.saveSettings();
        
        // Update display
        e.target.nextElementSibling.textContent = `${gain.toFixed(1)}dB`;
      });
    });
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PEQPopup();
});
```

---

## 6. Platform-Specific Features

### Chrome/Brave/Edge (Chromium)

```javascript
// Use chrome.storage.sync for cross-device sync
chrome.storage.sync.set({ peqSettings });

// Use chrome.declarativeNetRequest for advanced features
```

### Firefox/Zen

```javascript
// Use browser.storage.sync
browser.storage.sync.set({ peqSettings });

// Firefox has stricter CSP, may need adjustments
```

### Cross-Browser Compatibility

```javascript
// Use webextension-polyfill for compatibility
import browser from 'webextension-polyfill';

// Works on both Chrome and Firefox
await browser.storage.sync.set({ peqSettings });
```

---

## 7. Advanced Features

### 7.1 Per-Site Presets

```javascript
// Auto-load presets based on domain
const sitePresets = {
  'spotify.com': 'Bass Boost',
  'youtube.com': 'Vocal Clarity',
  'soundcloud.com': 'Flat'
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const domain = new URL(tab.url).hostname;
    const preset = sitePresets[domain];
    
    if (preset) {
      loadPreset(preset);
    }
  }
});
```

### 7.2 Visual Overlay

```javascript
// Inject floating control panel into page
function injectOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'saku-peq-overlay';
  overlay.innerHTML = `
    <div class="saku-peq-mini-controls">
      <button id="saku-toggle">PEQ: ON</button>
      <button id="saku-presets">Presets</button>
    </div>
  `;
  document.body.appendChild(overlay);
}
```

### 7.3 AutoEQ Integration

```javascript
// Search AutoEQ from extension popup
async function searchAutoEQ(query) {
  const results = await autoEQService.search(query);
  
  // Display in popup
  displayResults(results);
}

// One-click load from AutoEQ
async function loadAutoEQPreset(result) {
  const preset = await autoEQService.downloadPreset(result.downloadUrl);
  
  // Apply to current tab
  chrome.tabs.query({ active: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'LOAD_PRESET',
      preset
    });
  });
}
```

---

## 8. Implementation Phases

### Phase 1: Core Functionality (3-4 days)
- [ ] Setup extension structure
- [ ] Implement audio context interception
- [ ] Create basic popup UI
- [ ] Add 10-band PEQ controls
- [ ] Test on Spotify/YouTube

### Phase 2: Enhanced UX (2-3 days)
- [ ] Add preset management
- [ ] Implement per-site settings
- [ ] Add visual overlay option
- [ ] Keyboard shortcuts
- [ ] Settings page

### Phase 3: AutoEQ Integration (2 days)
- [ ] Add AutoEQ search to popup
- [ ] Implement preset download
- [ ] Add favorites and recent
- [ ] Cloud sync for presets

### Phase 4: Polish & Distribution (2-3 days)
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Submit to Chrome Web Store
- [ ] Submit to Firefox Add-ons

**Total: 1-2 weeks**

---

## 9. Distribution

### Chrome Web Store

**Requirements**:
- One-time $5 developer fee
- Privacy policy
- Store listing (description, screenshots)
- Review process (1-3 days)

**Submission**:
```bash
# Build extension
npm run build

# Create .zip
zip -r saku-peq-extension.zip dist/

# Upload to Chrome Web Store Developer Dashboard
```

### Firefox Add-ons

**Requirements**:
- Free (no fee)
- Privacy policy
- Add-on listing
- Review process (1-7 days)

**Submission**:
```bash
# Build for Firefox
npm run build:firefox

# Submit to addons.mozilla.org
```

### Edge Add-ons

**Requirements**:
- Free (no fee)
- Uses Chrome extension (compatible)
- Review process (1-3 days)

---

## 10. Comparison: Extension vs Web App Integration

| Aspect | Browser Extension | Web App Integration |
|--------|------------------|---------------------|
| **Works with Spotify** | ✅ Yes | ❌ No (DRM) |
| **Works with YouTube** | ✅ Yes | ❌ No (ToS) |
| **Works with ANY service** | ✅ Yes | ❌ No |
| **Legal** | ✅ Yes | ❌ ToS violations |
| **Installation** | One-time | None |
| **Updates** | Auto-update | Auto-update |
| **Cross-device** | ✅ Sync via browser | ✅ Web-based |
| **Offline** | ✅ Yes | ✅ Yes |
| **Development time** | 1-2 weeks | 4-8 weeks |
| **Maintenance** | Low | Very high |
| **Cost** | $5 (one-time) | $10k-50k+ |
| **Legal risk** | None | Extreme |

**Winner**: Browser Extension

---

## 11. User Experience Flow

### Installation
```
1. User visits Chrome Web Store / Firefox Add-ons
2. Click "Add to Browser"
3. Grant permissions
4. Extension installed (< 1 minute)
```

### First Use
```
1. User opens Spotify/YouTube
2. Extension icon shows "Active"
3. Click icon → PEQ controls appear
4. Adjust bands or load preset
5. Audio instantly processed
```

### Daily Use
```
1. Open any streaming service
2. PEQ automatically applies saved settings
3. Optional: Click icon to adjust
4. Settings sync across devices
```

---

## 12. Technical Challenges & Solutions

### Challenge 1: Service Worker Limitations (Manifest V3)

**Problem**: Background scripts are now service workers (limited lifetime)

**Solution**: Store PEQ state in chrome.storage, inject on-demand
```javascript
// Service worker stays minimal
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js']
    });
  }
});
```

### Challenge 2: CSP Restrictions

**Problem**: Some sites have strict Content Security Policy

**Solution**: Inject scripts before page loads
```json
{
  "content_scripts": [{
    "run_at": "document_start",
    "world": "MAIN"
  }]
}
```

### Challenge 3: Audio Context Detection

**Problem**: Some sites create AudioContext dynamically

**Solution**: Intercept constructor globally
```javascript
// Runs before any page script
const script = document.createElement('script');
script.textContent = `(${interceptAudioContext.toString()})();`;
document.documentElement.appendChild(script);
```

---

## 13. Monetization Options

### Free Version
- 10-band PEQ
- Basic presets
- Manual preset management

### Premium Version ($2.99/month or $19.99/year)
- AutoEQ search integration
- Cloud preset sync
- Per-site auto-presets
- Advanced visualizations
- Priority support

### One-Time Purchase ($9.99)
- All features
- Lifetime updates
- No subscription

---

## 14. Effort & Cost Breakdown

### Development
- **Time**: 1-2 weeks
- **Cost**: $0 (DIY) or $2,000-$5,000 (hire developer)

### Distribution
- **Chrome Web Store**: $5 (one-time)
- **Firefox Add-ons**: Free
- **Edge Add-ons**: Free

### Maintenance
- **Time**: 2-4 hours/month
- **Cost**: Minimal

### Total First Year
- **Development**: 1-2 weeks
- **Cost**: $5-$5,000
- **Legal risk**: None
- **Maintenance**: Low

---

## 15. Conclusion

### Final Verdict: ✅ **HIGHLY RECOMMENDED**

**Why Extension is the Best Approach**:

1. ✅ **Legal** - No ToS violations, user's local processing
2. ✅ **Universal** - Works with ALL streaming services
3. ✅ **Low effort** - 1-2 weeks vs 4-8 weeks for web integration
4. ✅ **Low cost** - $5 vs $10k-50k+
5. ✅ **Low maintenance** - Minimal updates needed
6. ✅ **Better UX** - One install, works everywhere
7. ✅ **Cross-platform** - Windows, Mac, Linux (via browser)

### Recommended Implementation Order

**Phase 1**: Core Extension (Week 1)
- Audio interception
- Basic PEQ controls
- Preset management

**Phase 2**: AutoEQ Integration (Week 2)
- Search functionality
- Preset download
- Cloud sync

**Phase 3**: Polish (Week 3)
- Visual overlay
- Per-site settings
- Submit to stores

### Expected Results

**After 2-3 weeks**:
- ✅ Working extension on Chrome/Firefox/Edge
- ✅ Works with Spotify, YouTube, SoundCloud, etc.
- ✅ 3,000+ AutoEQ presets available
- ✅ Zero legal issues
- ✅ Published on extension stores
- ✅ Users can install in < 1 minute

**This is the clear winner over web app streaming integration.**
