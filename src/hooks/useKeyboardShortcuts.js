import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing global keyboard shortcuts
 * @param {Object} actions - Object containing shortcut action functions
 * @param {boolean} enabled - Whether shortcuts are enabled (default: true)
 */
const useKeyboardShortcuts = (actions, enabled = true) => {
  const actionsRef = useRef(actions);
  
  // Update actions ref when actions change
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const handleKeyDown = useCallback((event) => {
    // Skip if shortcuts are disabled
    if (!enabled) return;
    
    // Skip if user is typing in input fields
    const activeElement = document.activeElement;
    const isInputField = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.contentEditable === 'true' ||
      activeElement.isContentEditable
    );
    
    if (isInputField) return;
    
    // Skip if modifier keys are pressed (except Shift for some shortcuts)
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    
    const key = event.key.toLowerCase();
    const currentActions = actionsRef.current;
    
    // Define shortcut mappings
    const shortcuts = {
      'b': () => {
        event.preventDefault();
        currentActions.previousTrack?.();
        return 'Previous Track';
      },
      
      'arrowleft': () => {
        event.preventDefault();
        // Primary: Skip backward, Shift: Previous preset
        if (event.shiftKey) {
          currentActions.previousPreset?.();
          return 'Previous Preset';
        } else {
          currentActions.skipBackward?.();
          return 'Skip Backward 10s';
        }
      },
      
      'arrowright': () => {
        event.preventDefault();
        // Primary: Skip forward, Shift: Next preset
        if (event.shiftKey) {
          currentActions.nextPreset?.();
          return 'Next Preset';
        } else {
          currentActions.skipForward?.();
          return 'Skip Forward 10s';
        }
      },
      
      'arrowup': () => {
        event.preventDefault();
        // Primary: Volume up, Shift: Previous preset
        if (event.shiftKey) {
          currentActions.previousPreset?.();
          return 'Previous Preset';
        } else {
          currentActions.volumeUp?.();
          return 'Volume Up';
        }
      },
      
      'arrowdown': () => {
        event.preventDefault();
        // Primary: Volume down, Shift: Next preset
        if (event.shiftKey) {
          currentActions.nextPreset?.();
          return 'Next Preset';
        } else {
          currentActions.volumeDown?.();
          return 'Volume Down';
        }
      },
      
      'n': () => {
        event.preventDefault();
        currentActions.nextTrack?.();
        return 'Next Track';
      },
      
      't': () => {
        event.preventDefault();
        currentActions.toggleBypass?.();
        return 'Bypass Toggled';
      },
      
      'm': () => {
        event.preventDefault();
        currentActions.toggleMute?.();
        return 'Mute Toggled';
      },
      
      'r': () => {
        event.preventDefault();
        currentActions.resetToFlat?.();
        return 'Reset to Flat';
      },
      
      'e': () => {
        event.preventDefault();
        currentActions.toggleEqModal?.();
        return 'EQ Modal Toggled';
      },
      
      'p': () => {
        event.preventDefault();
        currentActions.togglePlaylistModal?.();
        return 'Playlist Modal Toggled';
      },
      
      ' ': () => {
        // Spacebar for play/pause (if available)
        if (currentActions.togglePlayback) {
          event.preventDefault();
          currentActions.togglePlayback();
          return 'Playback Toggled';
        }
      },
      
      'escape': () => {
        // Escape to close modals or reset focus
        if (currentActions.closeModal) {
          event.preventDefault();
          currentActions.closeModal();
          return 'Modal Closed';
        }
      }
    };
    
    const shortcutAction = shortcuts[key];
    if (shortcutAction) {
      try {
        const actionName = shortcutAction();
        
        // Dispatch custom event for UI feedback
        if (actionName) {
          const shortcutEvent = new CustomEvent('keyboardShortcut', {
            detail: { action: actionName, key: event.key }
          });
          document.dispatchEvent(shortcutEvent);
        }
      } catch (error) {
        console.warn('Keyboard shortcut error:', error);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Return shortcut information for help UI
  return {
    shortcuts: [
      { key: '← →', description: 'Skip Backward/Forward 10s' },
      { key: '↑ ↓', description: 'Volume Up/Down' },
      { key: 'B', description: 'Previous Track' },
      { key: 'N', description: 'Next Track' },
      { key: 'M', description: 'Mute/Unmute' },
      { key: 'Space', description: 'Play/Pause' },
      { key: 'T', description: 'Toggle EQ Bypass' },
      { key: 'R', description: 'Reset to Flat EQ' },
      { key: 'E', description: 'Open/Close EQ Modal' },
      { key: 'P', description: 'Open/Close Playlist Modal' },
      { key: 'Shift + ← →', description: 'Previous/Next Preset' },
      { key: 'Shift + ↑ ↓', description: 'Previous/Next Preset' },
      { key: 'Esc', description: 'Close Modal' }
    ]
  };
};

export default useKeyboardShortcuts;