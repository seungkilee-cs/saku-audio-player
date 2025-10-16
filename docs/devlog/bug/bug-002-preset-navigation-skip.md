# Bug Report #002: PEQ Preset Navigation Skips Newly Added Presets

## Bug Summary
**Title**: Navigation for PEQ Presets skip the newly added presets  
**Severity**: Medium  
**Status**: Identified  
**Date Reported**: Current  
**Component**: PeqPanel.jsx, presetLibrary.js  

## Description
Both keyboard and button navigation for PEQ Presets only navigates through existing presets (the PEQ presets that were added previous to the app loading) and not the newly added ones (the ones you upload and save current with). The PEQ otherwise acts as expected - the presets work when selected manually, but navigation skips them.

## Root Cause Analysis

### Problem Location
**Primary File**: `src/components/PeqPanel.jsx`  
**Lines**: 18-28 (presetLibrary useMemo)  
**Secondary File**: `src/utils/presetLibrary.js`  
**Issue**: Stale closure in preset library loading

### Technical Analysis

The bug occurs in the `PeqPanel.jsx` component where the preset library is loaded:

```javascript
// Load preset library for keyboard shortcuts (bundled + user presets)
const presetLibrary = useMemo(() => {
  try {
    const userPresets = loadPresetLibrary();
    const bundledPresets = Object.values(BUNDLED_PRESETS);
    return [...bundledPresets, ...userPresets];
  } catch (error) {
    console.warn('Could not load preset library:', error);
    return Object.values(BUNDLED_PRESETS);
  }
}, []); // ← PROBLEM: Empty dependency array
```

### Why This Happens

1. **Stale Closure**: The `useMemo` hook has an empty dependency array `[]`, which means it only runs once when the component mounts. This creates a closure that captures the initial state of the preset library.

2. **No Re-evaluation**: When new presets are added to localStorage via `addPresetToLibrary()`, the `presetLibrary` memoized value is never updated because there are no dependencies to trigger re-evaluation.

3. **Navigation Logic**: The preset cycling functions (`cyclePrevPreset` and `cycleNextPreset`) depend on this stale `presetLibrary` array:

```javascript
const cyclePrevPreset = useCallback(() => {
  if (presetLibrary.length === 0) return;
  
  const currentIndex = presetLibrary.findIndex(p => p.name === currentPresetName);
  // ... navigation logic uses stale presetLibrary
}, [presetLibrary, currentPresetName, loadPeqPreset]);
```

4. **Manual Selection Works**: Direct preset selection works because it doesn't rely on the cached `presetLibrary` array - it directly loads the preset from localStorage when selected.

### Evidence from Code Flow

1. **Preset Addition**: In `PresetImportExport.jsx` or `PresetLibrary.jsx`, when a user adds a preset:
   ```javascript
   // This updates localStorage but doesn't trigger PeqPanel re-render
   addPresetToLibrary(newPreset);
   ```

2. **Navigation Failure**: In `PeqPanel.jsx`, navigation uses the stale library:
   ```javascript
   // This array never includes newly added presets
   const currentIndex = presetLibrary.findIndex(p => p.name === currentPresetName);
   ```

3. **Manual Selection Success**: Direct selection bypasses the cached library and loads from localStorage directly.

## Impact Assessment

### User Experience Impact
- **Broken Navigation**: Users cannot navigate to presets they just added
- **Inconsistent Behavior**: Manual selection works but keyboard/button navigation doesn't
- **Workflow Disruption**: Users must manually select newly added presets instead of using navigation
- **Confusion**: Users may think their presets weren't saved properly

### Technical Impact
- **State Synchronization**: Mismatch between UI state and actual data
- **Memory Usage**: Potential memory leaks from stale closures
- **User Trust**: Inconsistent behavior reduces confidence in the application

## Proposed Solution

### Option 1: Add Dependency to Trigger Re-evaluation (Recommended)
Add a dependency that changes when presets are added/removed to trigger `useMemo` re-evaluation.

**Implementation**:
```javascript
// Add a state variable to track preset library changes
const [presetLibraryVersion, setPresetLibraryVersion] = useState(0);

const presetLibrary = useMemo(() => {
  try {
    const userPresets = loadPresetLibrary();
    const bundledPresets = Object.values(BUNDLED_PRESETS);
    return [...bundledPresets, ...userPresets];
  } catch (error) {
    console.warn('Could not load preset library:', error);
    return Object.values(BUNDLED_PRESETS);
  }
}, [presetLibraryVersion]); // Add dependency

// Provide a way to trigger refresh
const refreshPresetLibrary = useCallback(() => {
  setPresetLibraryVersion(prev => prev + 1);
}, []);
```

### Option 2: Use Context for Preset Library Management
Move preset library management to the PlaybackContext to ensure global state consistency.

### Option 3: Remove Memoization and Load Fresh Each Time
Remove `useMemo` and load the preset library fresh on each render (less performant but more reliable).

## Files That Need Changes

### Primary Changes
1. **`src/components/PeqPanel.jsx`**
   - Fix the `useMemo` dependency array
   - Add preset library refresh mechanism
   - Update navigation functions to use fresh data

### Secondary Changes
2. **`src/components/PresetImportExport.jsx`**
   - Trigger preset library refresh after adding presets
   - Add callback to notify parent components of changes

3. **`src/components/PresetLibrary.jsx`**
   - Trigger preset library refresh after preset operations
   - Ensure UI updates reflect actual data

### Supporting Changes
4. **`src/context/PlaybackContext.jsx`** (Optional)
   - Add preset library management to global state
   - Provide consistent preset library access across components

## Detailed Fix Implementation

### Step 1: Update PeqPanel.jsx
```javascript
const PeqPanel = () => {
  const [presetLibraryVersion, setPresetLibraryVersion] = useState(0);
  
  // Fixed: Add dependency to trigger re-evaluation
  const presetLibrary = useMemo(() => {
    try {
      const userPresets = loadPresetLibrary();
      const bundledPresets = Object.values(BUNDLED_PRESETS);
      return [...bundledPresets, ...userPresets];
    } catch (error) {
      console.warn('Could not load preset library:', error);
      return Object.values(BUNDLED_PRESETS);
    }
  }, [presetLibraryVersion]); // Fixed: Add dependency
  
  const refreshPresetLibrary = useCallback(() => {
    setPresetLibraryVersion(prev => prev + 1);
  }, []);
  
  // Pass refresh function to child components
  return (
    <div className="peq-panel">
      {/* ... other components */}
      <PresetImportExport onPresetAdded={refreshPresetLibrary} />
      <PresetLibrary onPresetChanged={refreshPresetLibrary} />
    </div>
  );
};
```

### Step 2: Update Child Components
Add callbacks to notify parent when presets change:

```javascript
// In PresetImportExport.jsx
const handlePresetImport = async (preset) => {
  try {
    addPresetToLibrary(preset);
    onPresetAdded?.(); // Notify parent
  } catch (error) {
    // handle error
  }
};
```

## Testing Strategy

### Test Cases
1. **Add New Preset**: Import/create a new preset, then test navigation
2. **Delete Preset**: Remove a preset, verify navigation updates
3. **Multiple Operations**: Add several presets in sequence, test navigation
4. **Keyboard Navigation**: Test Shift+Arrow navigation after adding presets
5. **Button Navigation**: Test prev/next buttons after adding presets
6. **Mixed Navigation**: Combine manual selection with navigation
7. **Page Refresh**: Verify navigation works after page reload

### Expected Behavior After Fix
- Navigation should include all presets (bundled + user-added)
- Keyboard shortcuts should work with newly added presets
- Button navigation should work with newly added presets
- Navigation order should be consistent and predictable

## Priority and Timeline
**Priority**: Medium-High (affects core functionality for power users)  
**Estimated Fix Time**: 2-3 hours  
**Dependencies**: None  

## Related Issues
- May affect other components that cache preset library data
- Could be part of a broader state management improvement

## Prevention Strategy
- Add unit tests for preset library state management
- Implement integration tests for preset navigation
- Consider moving to a more robust state management solution
- Add logging to track preset library changes

## Notes
This bug highlights the importance of proper dependency management in React hooks. The fix should ensure that any component relying on dynamic data includes appropriate dependencies in their hook dependency arrays.

The root cause is a classic React anti-pattern where a `useMemo` or `useCallback` hook has missing dependencies, leading to stale closures that don't reflect current state.