// ⌨️ React Hook for Keyboard Sound Effects
import { useEffect, useCallback } from 'react';
import { useSounds } from './useSounds';

/**
 * Hook to add keyboard typing sounds to input elements
 *
 * Usage:
 * const inputRef = useKeyboardSounds(); // Auto-attach to ref
 * <input ref={inputRef} ... />
 *
 * Or manually:
 * const { handleKeyDown } = useKeyboardSounds({ autoAttach: false });
 * <input onKeyDown={handleKeyDown} ... />
 */
export const useKeyboardSounds = (options = {}) => {
  const {
    autoAttach = true,
    enabled = true,
    excludeKeys = [], // Keys to not make sounds for
  } = options;

  const { playKeyPress, playKeyEnter, playKeyBackspace, playKeySpace } = useSounds();

  // Handle key down events
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    const key = event.key;

    // Skip excluded keys
    if (excludeKeys.includes(key)) return;

    // Skip modifier keys alone (Shift, Ctrl, Alt, etc.)
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Escape'].includes(key)) {
      return;
    }

    // Play appropriate sound based on key
    if (key === 'Enter') {
      playKeyEnter();
    } else if (key === 'Backspace' || key === 'Delete') {
      playKeyBackspace();
    } else if (key === ' ') {
      playKeySpace();
    } else {
      // Normal key press
      playKeyPress();
    }
  }, [enabled, excludeKeys, playKeyPress, playKeyEnter, playKeyBackspace, playKeySpace]);

  // Ref callback for auto-attaching
  const inputRef = useCallback((element) => {
    if (!element || !autoAttach) return;

    element.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [autoAttach, handleKeyDown]);

  return autoAttach ? inputRef : { handleKeyDown };
};

/**
 * Global keyboard sounds for the entire page
 * Add this in App.jsx to enable keyboard sounds everywhere
 *
 * Usage:
 * useGlobalKeyboardSounds({ enabled: true });
 */
export const useGlobalKeyboardSounds = (options = {}) => {
  const {
    enabled = false, // Default disabled to not annoy users
    excludeSelectors = [], // CSS selectors to exclude
  } = options;

  const { playKeyPress, playKeyEnter, playKeyBackspace, playKeySpace } = useSounds();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Check if event target matches any excluded selectors
      if (excludeSelectors.some(selector => event.target.matches(selector))) {
        return;
      }

      // Only play sounds if focused on an input element
      const target = event.target;
      const isInput = target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.isContentEditable;

      if (!isInput) return;

      const key = event.key;

      // Skip modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Escape'].includes(key)) {
        return;
      }

      // Play appropriate sound
      if (key === 'Enter') {
        playKeyEnter();
      } else if (key === 'Backspace' || key === 'Delete') {
        playKeyBackspace();
      } else if (key === ' ') {
        playKeySpace();
      } else {
        playKeyPress();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, excludeSelectors, playKeyPress, playKeyEnter, playKeyBackspace, playKeySpace]);
};
