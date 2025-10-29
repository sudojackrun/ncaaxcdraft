// 🔊 Sound Toggle Component
import { useState } from 'react';
import { useSounds } from '../hooks/useSounds';

export default function SoundToggle() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toggleSounds } = useSounds();

  const handleToggle = () => {
    const newState = toggleSounds();
    setSoundEnabled(newState);
  };

  return (
    <button
      onClick={handleToggle}
      className="btn btn-secondary"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        padding: '10px 15px',
        fontSize: '1.2rem',
        minWidth: '60px',
      }}
      title={soundEnabled ? 'Sound On' : 'Sound Off'}
    >
      {soundEnabled ? '🔊' : '🔇'}
    </button>
  );
}
