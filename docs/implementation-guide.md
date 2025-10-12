# Implementation Guide
## Integrated Layout - Step-by-Step

**Goal:** Transform modal-based UI into integrated three-panel layout

---

## Quick Start: File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx          # NEW: Main layout container
│   │   ├── Header.jsx              # NEW: App header
│   │   ├── Sidebar.jsx             # NEW: Reusable sidebar
│   │   └── Panel.jsx               # NEW: Collapsible panel
│   ├── player/
│   │   ├── AudioPlayer.jsx         # REFACTOR: Remove modal logic
│   │   ├── WaveformCanvas.jsx      # KEEP: No changes
│   │   └── VolumeControl.jsx       # KEEP: No changes
│   ├── eq/
│   │   ├── PeqPanel.jsx            # REFACTOR: Sidebar version
│   │   ├── PeqResponseChart.jsx    # KEEP: No changes
│   │   └── BandControl.jsx         # KEEP: No changes
│   └── playlist/
│       └── Playlist.jsx            # REFACTOR: Sidebar version
└── styles/
    ├── layout.css                  # NEW: Grid system
    └── integrated.css              # NEW: Integrated styles
```

---

## Step 1: Create Layout Components

### AppLayout.jsx
```jsx
import React, { useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import Header from './Header';
import Sidebar from './Sidebar';
import AudioPlayer from '../player/AudioPlayer';
import PeqPanel from '../eq/PeqPanel';
import Playlist from '../playlist/Playlist';
import './layout.css';

const AppLayout = () => {
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeMobilePanel, setActiveMobilePanel] = useState(null);

  return (
    <div className="app-layout">
      <Header 
        onTogglePlaylist={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleEq={() => setRightSidebarOpen(!rightSidebarOpen)}
      />
      
      <main className="app-main">
        {/* Left Sidebar: Playlist */}
        {isDesktop && (
          <Sidebar 
            position="left" 
            isOpen={leftSidebarOpen}
            onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          >
            <Playlist />
          </Sidebar>
        )}

        {/* Center: Audio Player */}
        <div className="app-center">
          <AudioPlayer 
            onToggleEq={() => setRightSidebarOpen(!rightSidebarOpen)}
            onTogglePlaylist={() => setLeftSidebarOpen(!leftSidebarOpen)}
          />
        </div>

        {/* Right Sidebar: EQ */}
        {isDesktop && (
          <Sidebar 
            position="right" 
            isOpen={rightSidebarOpen}
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
          >
            <PeqPanel />
          </Sidebar>
        )}
      </main>

      {/* Mobile Bottom Sheets */}
      {!isDesktop && (
        <>
          <BottomSheet 
            isOpen={activeMobilePanel === 'playlist'}
            onClose={() => setActiveMobilePanel(null)}
          >
            <Playlist />
          </BottomSheet>
          
          <BottomSheet 
            isOpen={activeMobilePanel === 'eq'}
            onClose={() => setActiveMobilePanel(null)}
          >
            <PeqPanel />
          </BottomSheet>
        </>
      )}
    </div>
  );
};

export default AppLayout;
```

### layout.css
```css
.app-layout {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

/* Desktop: Three-column layout */
@media (min-width: 1280px) {
  .app-main {
    display: grid;
    grid-template-columns: 300px 1fr 350px;
    gap: 1rem;
    padding: 1rem;
    overflow: hidden;
  }

  .app-main.left-collapsed {
    grid-template-columns: 0 1fr 350px;
  }

  .app-main.right-collapsed {
    grid-template-columns: 300px 1fr 0;
  }

  .app-main.both-collapsed {
    grid-template-columns: 0 1fr 0;
  }
}

/* Tablet: Two-column or stacked */
@media (min-width: 768px) and (max-width: 1279px) {
  .app-main {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    padding: 1rem;
  }
}

/* Mobile: Single column */
@media (max-width: 767px) {
  .app-main {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
  }
}

.app-center {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

---

## Step 2: Create Sidebar Component

### Sidebar.jsx
```jsx
import React from 'react';
import './Sidebar.css';

const Sidebar = ({ 
  position = 'left', 
  isOpen = true, 
  onToggle, 
  children 
}) => {
  return (
    <aside 
      className={`sidebar sidebar--${position} ${isOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}
    >
      <button 
        className="sidebar__toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? (position === 'left' ? '◀' : '▶') : (position === 'left' ? '▶' : '◀')}
      </button>
      
      <div className="sidebar__content">
        {children}
      </div>
    </aside>
  );
};

export default Sidebar;
```

### Sidebar.css
```css
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.sidebar--left {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar--right {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar--collapsed {
  width: 48px !important;
}

.sidebar--collapsed .sidebar__content {
  opacity: 0;
  pointer-events: none;
}

.sidebar__toggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar__toggle:hover {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  transition: opacity 0.3s ease;
}

/* Custom scrollbar */
.sidebar__content::-webkit-scrollbar {
  width: 8px;
}

.sidebar__content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar__content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.sidebar__content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
```

---

## Step 3: Refactor AudioPlayer

### Changes to AudioPlayer.jsx
```jsx
// Remove modal-related props
// Add sidebar toggle props

const AudioPlayer = ({ 
  onToggleEq,
  onTogglePlaylist,
  // ... other props
}) => {
  return (
    <section className="audio-player audio-player--integrated">
      {/* Remove topbar with modal buttons */}
      
      <div className="audio-player__card">
        {/* Album art and info */}
        <div className="audio-player__header">
          <div className="audio-player__art">
            {image ? (
              <img src={image} alt={`Album art for ${displayTitle}`} />
            ) : (
              <div className="audio-player__art-placeholder">
                <span>U</span>
              </div>
            )}
          </div>
          <div className="audio-player__info">
            <h2 className="audio-player__title">{displayTitle}</h2>
            <p className="audio-player__artist">{displayArtist}</p>
            {metaSummary && <p className="audio-player__meta">{metaSummary}</p>}
          </div>
        </div>

        {/* Playback controls */}
        <div className="audio-player__controls">
          <button onClick={toPrevTrack} aria-label="Previous track">
            <Prev />
          </button>
          <button onClick={onBackward10Click} aria-label="Rewind 10 seconds">
            <Backward10 />
          </button>
          <button 
            className={`audio-player__play ${isPlaying ? 'is-playing' : ''}`}
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <button onClick={onForward10Click} aria-label="Forward 10 seconds">
            <Forward10 />
          </button>
          <button onClick={toNextTrack} aria-label="Next track">
            <Next />
          </button>
        </div>

        {/* Waveform */}
        <div className="audio-player__progress">
          {currentTrack && showWaveform && (
            <WaveformCanvas
              src={audioSrc}
              progress={duration > 0 ? trackProgress / duration : 0}
              accentColor={currentTrack?.color}
              onScrub={handleScrub}
              onScrubEnd={handleScrubEnd}
            />
          )}
          <div className="audio-player__time">
            <span>{currentTimeLabel}</span>
            <span>/</span>
            <span>{totalTimeLabel}</span>
          </div>
        </div>

        {/* Volume control */}
        <div className="audio-player__footer">
          <VolumeControl volume={volume} onVolumeChange={setVolume} />
        </div>

        {/* Quick access buttons (mobile only) */}
        <div className="audio-player__quick-actions">
          <button onClick={onToggleEq} className="quick-action-btn">
            🎛️ EQ
          </button>
          <button onClick={onTogglePlaylist} className="quick-action-btn">
            📋 Playlist
          </button>
        </div>
      </div>
    </section>
  );
};
```

---

## Step 4: Update FluxStudio

### FluxStudio.jsx (Simplified)
```jsx
import React from 'react';
import AppLayout from './components/layout/AppLayout';
import { PlaybackProvider } from './context/PlaybackContext';

const FluxStudio = () => {
  return (
    <PlaybackProvider>
      <AppLayout />
    </PlaybackProvider>
  );
};

export default FluxStudio;
```

---

## Step 5: Add Mobile Bottom Sheet

### BottomSheet.jsx
```jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BottomSheet.css';

const BottomSheet = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="bottom-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose();
              }
            }}
          >
            <div className="bottom-sheet__handle" />
            <div className="bottom-sheet__content">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
```

### BottomSheet.css
```css
.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 90vh;
  background: var(--color-bg-secondary);
  border-radius: 1.5rem 1.5rem 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.bottom-sheet__handle {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin: 0.75rem auto;
  cursor: grab;
}

.bottom-sheet__handle:active {
  cursor: grabbing;
}

.bottom-sheet__content {
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem 1rem;
}
```

---

## Step 6: Add Keyboard Shortcuts

### useKeyboardShortcuts.js (Enhanced)
```jsx
import { useEffect } from 'react';

const useKeyboardShortcuts = (actions, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          actions.togglePlayback?.();
          break;
        case 'arrowleft':
          e.preventDefault();
          actions.skipBackward?.();
          break;
        case 'arrowright':
          e.preventDefault();
          actions.skipForward?.();
          break;
        case 'arrowup':
          e.preventDefault();
          actions.volumeUp?.();
          break;
        case 'arrowdown':
          e.preventDefault();
          actions.volumeDown?.();
          break;
        case 'n':
          actions.nextTrack?.();
          break;
        case 'b':
          actions.previousTrack?.();
          break;
        case 'm':
          actions.toggleMute?.();
          break;
        case 'e':
          actions.toggleEqPanel?.();
          break;
        case 'p':
          actions.togglePlaylistPanel?.();
          break;
        case 't':
          actions.toggleBypass?.();
          break;
        case 'r':
          actions.resetToFlat?.();
          break;
        case '?':
          actions.showShortcuts?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, enabled]);
};

export default useKeyboardShortcuts;
```

---

## Step 7: Testing Checklist

### Desktop (1280px+)
- [ ] Three panels visible
- [ ] Sidebars collapsible
- [ ] Smooth transitions
- [ ] Keyboard shortcuts work
- [ ] No layout shifts

### Tablet (768-1279px)
- [ ] Player + one sidebar
- [ ] Toggle between panels
- [ ] Touch targets 44px+
- [ ] Smooth animations

### Mobile (<768px)
- [ ] Player only by default
- [ ] Bottom sheets work
- [ ] Swipe to dismiss
- [ ] Gesture controls
- [ ] No horizontal scroll

---

## Migration Strategy

### Phase 1: Parallel Implementation
1. Create new layout components
2. Keep existing modal system
3. Add feature flag to toggle

### Phase 2: Testing
1. Test on all breakpoints
2. Validate keyboard shortcuts
3. Performance testing
4. User feedback

### Phase 3: Cutover
1. Make integrated layout default
2. Remove modal components
3. Clean up unused code
4. Update documentation

---

## Performance Considerations

1. **Lazy Load Sidebars:** Only render when visible
2. **Virtual Scrolling:** For large playlists
3. **Memoization:** Prevent unnecessary re-renders
4. **Code Splitting:** Load panels on demand

```jsx
// Lazy load panels
const PeqPanel = lazy(() => import('./components/eq/PeqPanel'));
const Playlist = lazy(() => import('./components/playlist/Playlist'));

// In AppLayout
<Suspense fallback={<LoadingSpinner />}>
  <PeqPanel />
</Suspense>
```

---

## Next Steps

1. Implement AppLayout component
2. Create Sidebar component
3. Refactor AudioPlayer
4. Add BottomSheet for mobile
5. Test across devices
6. Gather user feedback
7. Iterate and improve
