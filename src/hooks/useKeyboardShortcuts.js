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
        currentActions.toggleBypass?.();
        return 'Bypass Toggled';
      },
      
      'arrowleft': () => {
        event.preventDefault();
        currentActions.previousPreset?.();
        return 'Previous Preset';
      },
      
      'arrowright': () => {
        event.preventDefault();
        currentActions.nextPreset?.();
        return 'Next Preset';
      },
      
      'arrowup': () => {
        event.preventDefault();
        currentActions.previousPreset?.();
        return 'Previous Preset';
      },
      
      'arrowdown': () => {
        event.preventDefault();
        currentActions.nextPreset?.();
        return 'Next Preset';
      },
      
      'r': () => {
        event.preventDefault();
        currentActions.resetToFlat?.();
        return 'Reset to Flat';
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
      { key: 'B', description: 'Toggle EQ Bypass' },
      { key: '← →', description: 'Previous/Next Preset' },
      { key: '↑ ↓', description: 'Previous/Next Preset' },
      { key: 'R', description: 'Reset to Flat EQ' },
      { key: 'Space', description: 'Play/Pause (if available)' },
      { key: 'Esc', description: 'Close Modal (if available)' }
    ]
  };
};

export default useKeyboardShortcuts;