# AutoEQ Search Integration Plan

## Executive Summary

This document outlines the integration of AutoEQ preset search functionality into Saku Audio Player, enabling users to search and download presets directly from the AutoEQ database without manually managing text files across browsers.

**Feasibility**: ⭐⭐⭐⭐⭐ (5/5) - Highly feasible  
**Effort**: ⭐⭐⭐☆☆ (3/5) - Moderate (3-5 days)  
**Value**: ⭐⭐⭐⭐⭐ (5/5) - Extremely high user value

---

## 1. AutoEQ Database Overview

### What is AutoEQ?

AutoEQ is a massive open-source database of headphone/IEM frequency response compensation profiles:
- **Repository**: https://github.com/jaakkopasanen/AutoEq
- **Preset Count**: 3,000+ headphone models
- **Format**: ParametricEQ.txt files
- **License**: MIT (free to use)
- **Update Frequency**: Regular community contributions

### Current AutoEQ Structure

```
AutoEq/
├── results/
│   ├── AKG/
│   │   ├── AKG K701/
│   │   │   └── AKG K701 ParametricEQ.txt
│   │   ├── AKG K702/
│   │   └── ...
│   ├── Sennheiser/
│   ├── Sony/
│   └── ... (50+ brands)
```

---

## 2. Integration Architecture

### Option A: GitHub API Integration (Recommended)

**Approach**: Query GitHub API to search and fetch presets on-demand

**Advantages**:
- ✅ Always up-to-date (live data)
- ✅ No hosting costs
- ✅ No database maintenance
- ✅ Leverages GitHub's search infrastructure
- ✅ Free tier: 60 requests/hour (unauthenticated), 5000/hour (authenticated)

**Disadvantages**:
- ❌ Requires internet connection
- ❌ Rate limiting (mitigated with caching)
- ❌ Slight latency on first search

### Option B: Self-Hosted Index

**Approach**: Build and host a searchable index of all presets

**Advantages**:
- ✅ Faster search
- ✅ No rate limits
- ✅ Custom search features

**Disadvantages**:
- ❌ Hosting costs ($5-10/month)
- ❌ Maintenance overhead
- ❌ Need to sync with AutoEQ updates

### Recommendation: **Option A (GitHub API)** with aggressive caching

---

## 3. Technical Implementation

### 3.1 Search Service Architecture

```javascript
// src/services/autoEqSearch.js

export class AutoEQSearchService {
  constructor() {
    this.cache = new Map();
    this.indexCache = null;
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Search for headphone presets
   * @param {string} query - Search term (e.g., "Sony WH-1000XM4")
   * @returns {Promise<Array>} - Matching presets
   */
  async search(query) {
    // Check cache first
    const cached = this.getFromCache(query);
    if (cached) return cached;

    // Search GitHub API
    const results = await this.searchGitHub(query);
    
    // Cache results
    this.saveToCache(query, results);
    
    return results;
  }

  async searchGitHub(query) {
    const apiUrl = 'https://api.github.com/search/code';
    const params = new URLSearchParams({
      q: `${query} ParametricEQ.txt repo:jaakkopasanen/AutoEq path:results`,
      per_page: 20
    });

    const response = await fetch(`${apiUrl}?${params}`);
    const data = await response.json();

    return data.items.map(item => ({
      name: this.extractModelName(item.path),
      brand: this.extractBrand(item.path),
      path: item.path,
      downloadUrl: item.html_url.replace('github.com', 'raw.githubusercontent.com')
                                 .replace('/blob/', '/')
    }));
  }

  /**
   * Download and parse preset
   * @param {string} downloadUrl - Raw GitHub URL
   * @returns {Promise<Object>} - Parsed preset
   */
  async downloadPreset(downloadUrl) {
    const response = await fetch(downloadUrl);
    const text = await response.text();
    
    // Use existing parser from peqIO.js
    return importPresetFromText(text);
  }

  extractModelName(path) {
    // "results/Sony/Sony WH-1000XM4/Sony WH-1000XM4 ParametricEQ.txt"
    // -> "Sony WH-1000XM4"
    const parts = path.split('/');
    return parts[parts.length - 2];
  }

  extractBrand(path) {
    const parts = path.split('/');
    return parts[1]; // "Sony"
  }
}
```

### 3.2 Caching Strategy

**Multi-Layer Caching**:

1. **Memory Cache** (Session-level)
   - Fast access during app session
   - Cleared on page reload

2. **localStorage Cache** (Persistent)
   - Survives page reloads
   - 24-hour expiry
   - Stores search results and downloaded presets

3. **IndexedDB Cache** (Optional, for large datasets)
   - Store full preset index
   - Better for offline support

```javascript
// src/services/autoEqCache.js

export class AutoEQCache {
  constructor() {
    this.storageKey = 'saku-autoeq-cache';
  }

  saveSearchResults(query, results) {
    const cache = this.loadCache();
    cache.searches[query] = {
      results,
      timestamp: Date.now()
    };
    this.saveCache(cache);
  }

  savePreset(modelName, preset) {
    const cache = this.loadCache();
    cache.presets[modelName] = {
      preset,
      timestamp: Date.now()
    };
    this.saveCache(cache);
  }

  getSearchResults(query) {
    const cache = this.loadCache();
    const entry = cache.searches[query];
    
    if (!entry) return null;
    
    // Check if expired (24 hours)
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    return entry.results;
  }

  loadCache() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : { searches: {}, presets: {} };
    } catch (error) {
      return { searches: {}, presets: {} };
    }
  }

  saveCache(cache) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('Cache save failed:', error);
      // Handle quota exceeded
      this.clearOldEntries();
    }
  }

  clearOldEntries() {
    const cache = this.loadCache();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Remove old searches
    Object.keys(cache.searches).forEach(key => {
      if (now - cache.searches[key].timestamp > maxAge) {
        delete cache.searches[key];
      }
    });

    this.saveCache(cache);
  }
}
```

### 3.3 UI Component

```javascript
// src/components/AutoEQSearch.jsx

import React, { useState, useCallback } from 'react';
import { AutoEQSearchService } from '../services/autoEqSearch';
import { usePlayback } from '../context/PlaybackContext';

const AutoEQSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const { loadPeqPreset } = usePlayback();
  const searchService = new AutoEQSearchService();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await searchService.search(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleLoadPreset = useCallback(async (result) => {
    setLoading(true);
    try {
      const preset = await searchService.downloadPreset(result.downloadUrl);
      loadPeqPreset(preset);
      setSelectedPreset(result.name);
    } catch (error) {
      console.error('Failed to load preset:', error);
    } finally {
      setLoading(false);
    }
  }, [loadPeqPreset]);

  return (
    <div className="autoeq-search">
      <div className="search-box">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search headphones (e.g., Sony WH-1000XM4)"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="search-results">
        {results.map((result, index) => (
          <div key={index} className="result-item">
            <div className="result-info">
              <strong>{result.name}</strong>
              <span className="brand">{result.brand}</span>
            </div>
            <button onClick={() => handleLoadPreset(result)}>
              Load Preset
            </button>
          </div>
        ))}
      </div>

      {selectedPreset && (
        <div className="selected-preset">
          ✓ Loaded: {selectedPreset}
        </div>
      )}
    </div>
  );
};

export default AutoEQSearch;
```

---

## 4. Integration with Local Storage

### 4.1 Unified Preset Management

**Strategy**: Merge AutoEQ presets with user's local preset library

```javascript
// Enhanced presetLibrary.js

export function addAutoEQPreset(preset, metadata) {
  const enhancedPreset = {
    ...preset,
    source: 'autoeq',
    autoEqMetadata: {
      modelName: metadata.modelName,
      brand: metadata.brand,
      downloadUrl: metadata.downloadUrl,
      downloadedAt: new Date().toISOString()
    }
  };
  
  return addPresetToLibrary(enhancedPreset);
}

export function getAutoEQPresets() {
  const library = loadPresetLibrary();
  return library.filter(p => p.source === 'autoeq');
}

export function syncAutoEQPreset(modelName) {
  // Re-download from AutoEQ to get latest version
  const searchService = new AutoEQSearchService();
  // ... update logic
}
```

### 4.2 Cross-Browser Sync Strategy

**Problem**: localStorage is browser-specific

**Solutions**:

#### Solution 1: Cloud Sync (Recommended)
```javascript
// src/services/cloudSync.js

export class CloudSyncService {
  constructor() {
    this.provider = 'github-gist'; // or 'dropbox', 'google-drive'
  }

  async syncPresets() {
    const local = loadPresetLibrary();
    const remote = await this.fetchRemotePresets();
    
    // Merge strategy: latest wins
    const merged = this.mergePresets(local, remote);
    
    savePresetLibrary(merged);
    await this.uploadPresets(merged);
  }

  async fetchRemotePresets() {
    // Fetch from GitHub Gist (free, simple)
    const gistId = this.getUserGistId();
    const response = await fetch(`https://api.github.com/gists/${gistId}`);
    const data = await response.json();
    return JSON.parse(data.files['saku-presets.json'].content);
  }
}
```

#### Solution 2: Export/Import Workflow
```javascript
// Simple QR code or link-based transfer
export function generateSyncLink() {
  const presets = loadPresetLibrary();
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(presets));
  return `https://saku-player.app/sync?data=${compressed}`;
}
```

#### Solution 3: Browser Extension Storage Sync
```javascript
// Use browser.storage.sync API (Chrome/Firefox)
// Automatically syncs across devices
chrome.storage.sync.set({ 'saku-presets': presets });
```

---

## 5. PowerAmp-Style Features

### 5.1 Preset Browser with Categories

```javascript
const categories = {
  'Over-Ear': ['Sony WH-1000XM4', 'Bose QC35 II', ...],
  'In-Ear': ['Sony WF-1000XM4', 'AirPods Pro', ...],
  'Studio': ['Beyerdynamic DT 770', 'Audio-Technica M50x', ...],
  'Gaming': ['SteelSeries Arctis 7', 'HyperX Cloud II', ...]
};
```

### 5.2 Favorites and Recent

```javascript
export function markAsFavorite(presetId) {
  const library = loadPresetLibrary();
  const preset = library.find(p => p.id === presetId);
  if (preset) {
    preset.favorite = true;
    preset.favoritedAt = new Date().toISOString();
    savePresetLibrary(library);
  }
}

export function getRecentPresets(limit = 10) {
  const library = loadPresetLibrary();
  return library
    .filter(p => p.lastUsed)
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
    .slice(0, limit);
}
```

### 5.3 Smart Search with Fuzzy Matching

```javascript
import Fuse from 'fuse.js';

export class SmartSearch {
  constructor(presets) {
    this.fuse = new Fuse(presets, {
      keys: ['name', 'brand', 'description'],
      threshold: 0.3,
      includeScore: true
    });
  }

  search(query) {
    return this.fuse.search(query).map(result => result.item);
  }
}
```

---

## 6. Implementation Phases

### Phase 1: Basic Search (2 days)
- [ ] Implement GitHub API search
- [ ] Create search UI component
- [ ] Add preset download functionality
- [ ] Basic caching (localStorage)

### Phase 2: Enhanced UX (1 day)
- [ ] Add brand filtering
- [ ] Implement fuzzy search
- [ ] Add loading states and error handling
- [ ] Preset preview before loading

### Phase 3: Library Integration (1 day)
- [ ] Merge with existing preset library
- [ ] Add favorites and recent
- [ ] Implement preset metadata tracking
- [ ] Add "Update from AutoEQ" feature

### Phase 4: Cross-Browser Sync (1 day)
- [ ] Implement cloud sync (GitHub Gist)
- [ ] Add export/import workflow
- [ ] QR code sharing
- [ ] Conflict resolution

**Total: 3-5 days**

---

## 7. API Rate Limiting Strategy

### GitHub API Limits
- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

### Mitigation Strategies

1. **Aggressive Caching**
   - Cache search results for 24 hours
   - Cache downloaded presets permanently

2. **Authentication** (Optional)
   ```javascript
   const response = await fetch(apiUrl, {
     headers: {
       'Authorization': `token ${GITHUB_TOKEN}`
     }
   });
   ```

3. **Batch Requests**
   - Download multiple presets in one request
   - Use GitHub's tree API to fetch directory listings

4. **Fallback to Raw CDN**
   ```javascript
   const cdnUrl = 'https://cdn.jsdelivr.net/gh/jaakkopasanen/AutoEq@master/';
   // No rate limits, but no search capability
   ```

---

## 8. User Experience Flow

### Search Flow
```
1. User types "Sony WH-1000XM4"
2. App checks cache (instant if cached)
3. If not cached, query GitHub API
4. Display results with brand badges
5. User clicks "Load Preset"
6. Download ParametricEQ.txt
7. Parse with existing peqIO.js
8. Apply to PEQ
9. Save to local library (with AutoEQ metadata)
10. Mark as "recently used"
```

### Offline Support
```
1. User searches while offline
2. App shows cached results only
3. Display "Offline - showing cached results"
4. Allow loading previously downloaded presets
5. Queue new downloads for when online
```

---

## 9. Storage Optimization

### localStorage Quota Management

**Typical Limits**:
- Chrome: 10MB
- Firefox: 10MB
- Safari: 5MB

**Optimization Strategies**:

1. **Compress Presets**
   ```javascript
   import LZString from 'lz-string';
   
   function saveCompressed(key, data) {
     const compressed = LZString.compress(JSON.stringify(data));
     localStorage.setItem(key, compressed);
   }
   ```

2. **Selective Caching**
   - Only cache search results (metadata)
   - Download full presets on-demand
   - Limit to 50 most recent/favorite presets

3. **IndexedDB for Large Data**
   ```javascript
   // Store full preset database in IndexedDB (no size limit)
   const db = await openDB('saku-autoeq', 1, {
     upgrade(db) {
       db.createObjectStore('presets', { keyPath: 'id' });
     }
   });
   ```

---

## 10. Security Considerations

### CORS and CSP

**Issue**: GitHub API requires proper CORS handling

**Solution**:
```javascript
// GitHub API supports CORS by default
// No proxy needed for public repos
```

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="connect-src 'self' https://api.github.com https://raw.githubusercontent.com">
```

### Rate Limit Abuse Prevention

```javascript
// Implement client-side rate limiting
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

---

## 11. Comparison: File Management vs Search Integration

| Aspect | Manual Files | AutoEQ Search |
|--------|--------------|---------------|
| **Setup** | Download files manually | One-time search |
| **Updates** | Manual re-download | Auto-update available |
| **Discovery** | Browse GitHub | Search by name |
| **Cross-Browser** | Re-download per browser | Cloud sync |
| **Offline** | Works offline | Requires initial download |
| **Storage** | User manages files | Automatic caching |
| **UX** | 5 steps | 2 steps |

**Winner**: AutoEQ Search Integration

---

## 12. Recommended Implementation

### Minimal Viable Product (MVP)

```javascript
// src/features/autoeq/index.js

export class AutoEQFeature {
  async searchAndLoad(query) {
    // 1. Search
    const results = await this.search(query);
    
    // 2. Download first result
    const preset = await this.download(results[0]);
    
    // 3. Load into PEQ
    this.loadPreset(preset);
    
    // 4. Save to library
    this.saveToLibrary(preset);
  }
}
```

**Lines of Code**: ~300 LOC  
**Dependencies**: None (use fetch API)  
**Time to Implement**: 2-3 days

---

## Conclusion

**Recommendation**: ✅ **Implement AutoEQ Search Integration**

**Benefits**:
- Eliminates manual file management
- Provides PowerAmp-like experience
- Enables cross-browser preset sync
- Leverages 3,000+ community presets
- Low implementation cost (3-5 days)

**Next Steps**:
1. Implement basic GitHub API search
2. Add caching layer
3. Integrate with existing preset library
4. Add cloud sync for cross-browser support

This feature will significantly improve user experience and differentiate Saku from other web-based audio players.
