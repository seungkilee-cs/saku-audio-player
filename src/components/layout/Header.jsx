import React from 'react';
import useTheme from '../../hooks/useTheme';
import '../../styles/Header.css';

const Header = ({ onTogglePlaylist, onToggleEq, playlistOpen, eqOpen }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const handleShowShortcuts = () => {
    const shortcuts = `
Keyboard Shortcuts:

Playback:
  Space       - Play/Pause
  ← / →       - Skip ±10 seconds
  ↑ / ↓       - Volume ±10%
  N           - Next track
  B           - Previous track
  M           - Mute/Unmute

Panels:
  P           - Toggle Playlist
  E           - Toggle EQ
  
EQ Controls:
  T           - Toggle EQ Bypass
  R           - Reset EQ to Flat
  Shift + ← → - Cycle Presets

Help:
  ?           - Show this help
    `.trim();
    
    alert(shortcuts);
  };

  return (
    <header className="app-header">
      <div className="app-header__left">
        <h1 className="app-header__logo">
          <span className="app-header__logo-icon">🌸</span>
          <span className="app-header__logo-text">Saku</span>
        </h1>
        <p className="app-header__tagline">Let your music bloom</p>
      </div>

      <div className="app-header__center">
        <div className="app-header__quick-actions">
          <button
            className={`header-btn ${playlistOpen ? 'header-btn--active' : ''}`}
            onClick={onTogglePlaylist}
            title="Toggle Playlist (P)"
            aria-label="Toggle Playlist"
          >
            <span className="header-btn__icon">📋</span>
            <span className="header-btn__label">Playlist</span>
            <kbd className="header-btn__kbd">P</kbd>
          </button>
          
          <button
            className={`header-btn ${eqOpen ? 'header-btn--active' : ''}`}
            onClick={onToggleEq}
            title="Toggle Equalizer (E)"
            aria-label="Toggle Equalizer"
          >
            <span className="header-btn__icon">🎛️</span>
            <span className="header-btn__label">Equalizer</span>
            <kbd className="header-btn__kbd">E</kbd>
          </button>
        </div>
      </div>

      <div className="app-header__right">
        <button
          className="header-btn header-btn--icon"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
          aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
        >
          <span className="header-btn__icon">{isDark ? '☀️' : '🌙'}</span>
        </button>
        
        <button
          className="header-btn header-btn--icon"
          onClick={handleShowShortcuts}
          title="Keyboard Shortcuts"
          aria-label="Show keyboard shortcuts"
        >
          <span className="header-btn__icon">❓</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
