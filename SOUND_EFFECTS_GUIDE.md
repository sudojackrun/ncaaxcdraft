# 🔊 Retro 8-Bit Sound Effects Guide

## Overview

Your app now has retro 8-bit sound effects that match the pixel art theme! All sounds are generated using the Web Audio API, so no external files are needed.

## 🎮 Available Sounds

### Button Interactions
- **`playClick()`** - Quick button press blip (800Hz, 0.05s)
- **`playHover()`** - Soft hover beep (600Hz, 0.03s) - *Use sparingly to avoid annoying users*

### Feedback Sounds
- **`playSuccess()`** - Rising success tones (C-E-G chord progression)
- **`playError()`** - Descending error buzz (sawtooth wave)
- **`playWarning()`** - Alert double-beep (880Hz x2)

### Draft Actions
- **`playDraftPick()`** - Coin collect sound for picking an athlete
- **`playStartDraft()`** - Power-up sound for starting a draft
- **`playCompleteDraft()`** - Victory fanfare melody

### Navigation & Data
- **`playNavigate()`** - Whoosh sound for page transitions
- **`playRefresh()`** - Spinning sound for loading data
- **`playSave()`** - Quick confirmation beep for saves
- **`playDelete()`** - Descending whoosh for deletions

### Settings
- **`toggleSounds()`** - Turn sounds on/off (returns boolean state)
- **`setVolume(0-1)`** - Adjust volume level

## 🎯 How to Use

### 1. Import the Hook
```jsx
import { useSounds } from '../hooks/useSounds';
```

### 2. Use in Your Component
```jsx
function MyComponent() {
  const { playClick, playSuccess, playError } = useSounds();

  const handleSubmit = async () => {
    playClick(); // Immediate feedback

    try {
      const result = await saveData();
      playSuccess(); // Success feedback
    } catch (error) {
      playError(); // Error feedback
    }
  };

  return (
    <button onClick={handleSubmit}>
      Save
    </button>
  );
}
```

### 3. Navigation Links
```jsx
<Link to="/athletes" onClick={playNavigate}>
  Athletes
</Link>
```

### 4. Button Actions
```jsx
<button onClick={() => {
  playClick();
  deleteItem();
}} className="btn btn-danger">
  Delete
</button>
```

## 🎨 Sound Design Philosophy

### When to Use Each Sound

**Click** - General button presses, selections, toggles
- ✅ Form submissions
- ✅ Modal confirmations
- ✅ Action buttons

**Hover** - Use VERY sparingly or not at all
- ⚠️ Can be annoying with many elements
- ✅ Maybe for special "big" buttons only

**Success** - Positive confirmations
- ✅ Draft completed
- ✅ Data saved successfully
- ✅ Athlete drafted

**Error** - Problems or failures
- ✅ API errors
- ✅ Validation failures
- ✅ Network issues

**Warning** - Alerts that need attention
- ✅ Time running out
- ✅ Draft deadline approaching
- ✅ Important notifications

**Draft Pick** - Special draft-related actions
- ✅ Athlete selected
- ✅ Team picks someone
- ✅ Your turn notification

**Start Draft** - Beginning major actions
- ✅ Starting a new draft
- ✅ Beginning a round
- ✅ Launching live mode

**Complete Draft** - Major achievements
- ✅ Draft finished
- ✅ All rounds complete
- ✅ Championship won

**Navigate** - Moving between pages
- ✅ Nav bar clicks
- ✅ Breadcrumb navigation
- ✅ Back buttons

**Refresh** - Loading data
- ✅ API calls starting
- ✅ Data refreshing
- ✅ Live updates syncing

**Save** - Persisting data
- ✅ Auto-save indicators
- ✅ Settings saved
- ✅ Draft settings confirmed

**Delete** - Removing items
- ✅ Delete buttons
- ✅ Clearing forms
- ✅ Removing athletes

## 🎛️ Sound Toggle Component

A floating sound toggle button is automatically added to your app:
- Located in bottom-right corner
- Shows 🔊 when on, 🔇 when off
- Click to toggle sounds
- Plays confirmation sound when enabled

## ⚙️ Advanced Usage

### Volume Control
```jsx
const { setVolume } = useSounds();

// Set to 50%
setVolume(0.5);

// Mute
setVolume(0);

// Max
setVolume(1);
```

### Custom Sound Sequences
```jsx
const playVictory = () => {
  playSuccess();
  setTimeout(() => playCompleteDraft(), 300);
};
```

### Conditional Sounds
```jsx
const handleAction = (isImportant) => {
  if (isImportant) {
    playWarning();
  } else {
    playClick();
  }
};
```

## 🎵 Technical Details

### How It Works
- Uses Web Audio API's OscillatorNode
- Generates square waves (retro chiptune sound)
- ADSR envelope for natural attack/decay
- No external audio files needed
- Very lightweight (~2KB)

### Sound Characteristics
- **Frequency Range**: 200Hz - 1500Hz
- **Duration Range**: 30ms - 400ms
- **Wave Types**: Square (buttons), Sine (soft), Sawtooth (harsh)
- **Default Volume**: 30% (0.3)

### Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (requires user interaction first)
- Mobile: ✅ Works but may require user gesture

## 🚫 Best Practices

### DO ✅
- Use sounds for user-initiated actions
- Provide visual alternatives to sounds
- Allow users to disable sounds easily
- Keep volume reasonable (default 30%)
- Match sound to action importance

### DON'T ❌
- Play sounds automatically on page load
- Use sounds for every hover state
- Make sounds too loud or jarring
- Play multiple sounds simultaneously
- Force sounds when user has disabled them

## 📱 Mobile Considerations

- Sounds work on mobile browsers
- First sound requires user interaction (browser security)
- Volume may be affected by device ringer settings
- Some users may have reduced-motion preferences

## 🎨 Examples by Page

### Home Page
```jsx
// Load drafts
playRefresh();

// Create new draft
<Link to="/draft/setup" onClick={playClick}>New Draft</Link>

// Delete draft
playDelete();
if (success) playSuccess();
```

### Draft Room
```jsx
// Start draft
<button onClick={() => {
  playStartDraft();
  beginDraft();
}}>Start</button>

// Make pick
const draftAthlete = (athlete) => {
  playDraftPick();
  savePick(athlete);
};

// Complete draft
if (allRoundsComplete) {
  playCompleteDraft();
}
```

### Athletes Page
```jsx
// Sort/filter
<button onClick={() => {
  playClick();
  sortAthletes();
}}>Sort</button>

// Export data
<button onClick={() => {
  playSave();
  exportCSV();
}}>Export</button>
```

## 🔧 Troubleshooting

### Sounds Not Playing?
1. Check if sound toggle is enabled (🔊)
2. Ensure user has interacted with page first
3. Check browser console for errors
4. Verify volume isn't at 0
5. Test in incognito mode (extensions might block)

### Sounds Too Quiet/Loud?
```jsx
const { setVolume } = useSounds();
setVolume(0.5); // Adjust between 0-1
```

### Want Different Sounds?
Edit `/client/src/utils/sounds.js` and adjust:
- Frequencies (pitch)
- Durations (length)
- Wave types (tone quality)
- Volume (loudness)

## 🎯 Future Enhancements

Potential additions:
- Achievement unlocked jingles
- Round countdown beeps
- Pick clock ticking
- Team fanfare sounds
- "Your turn" notification ding
- Background music toggle
- Custom team sounds

---

**🎮 Ready to make some noise!** 🔊

Your draft now has that authentic retro gaming feel with perfect sound effects to match your 8-bit theme!
