// 🎮 React Hook for Sound Effects
import { useCallback } from 'react';
import sounds from '../utils/sounds';

export const useSounds = () => {
  // Button click handler with sound
  const playClick = useCallback(() => {
    sounds.click();
  }, []);

  // Button hover handler with sound
  const playHover = useCallback(() => {
    sounds.hover();
  }, []);

  // Success sound
  const playSuccess = useCallback(() => {
    sounds.success();
  }, []);

  // Error sound
  const playError = useCallback(() => {
    sounds.error();
  }, []);

  // Draft pick sound
  const playDraftPick = useCallback(() => {
    sounds.draftPick();
  }, []);

  // Start draft sound
  const playStartDraft = useCallback(() => {
    sounds.startDraft();
  }, []);

  // Complete draft sound
  const playCompleteDraft = useCallback(() => {
    sounds.completeDraft();
  }, []);

  // Navigate sound
  const playNavigate = useCallback(() => {
    sounds.navigate();
  }, []);

  // Warning sound
  const playWarning = useCallback(() => {
    sounds.warning();
  }, []);

  // Refresh sound
  const playRefresh = useCallback(() => {
    sounds.refresh();
  }, []);

  // Save sound
  const playSave = useCallback(() => {
    sounds.save();
  }, []);

  // Delete sound
  const playDelete = useCallback(() => {
    sounds.delete();
  }, []);

  // Keyboard sounds
  const playKeyPress = useCallback(() => {
    sounds.keyPress();
  }, []);

  const playKeyEnter = useCallback(() => {
    sounds.keyEnter();
  }, []);

  const playKeyBackspace = useCallback(() => {
    sounds.keyBackspace();
  }, []);

  const playKeySpace = useCallback(() => {
    sounds.keySpace();
  }, []);

  // Toggle sounds on/off
  const toggleSounds = useCallback(() => {
    return sounds.toggle();
  }, []);

  // Set volume
  const setVolume = useCallback((volume) => {
    sounds.setVolume(volume);
  }, []);

  return {
    playClick,
    playHover,
    playSuccess,
    playError,
    playDraftPick,
    playStartDraft,
    playCompleteDraft,
    playNavigate,
    playWarning,
    playRefresh,
    playSave,
    playDelete,
    playKeyPress,
    playKeyEnter,
    playKeyBackspace,
    playKeySpace,
    toggleSounds,
    setVolume,
  };
};
