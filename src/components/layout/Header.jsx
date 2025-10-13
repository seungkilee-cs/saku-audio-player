import React, { useState, useEffect } from "react";
import useTheme from "../../hooks/useTheme";
import "../../styles/Header.css";

const Header = ({ onTogglePlaylist, onToggleEq, playlistOpen, eqOpen }) => {
  const { toggleTheme, isDark } = useTheme();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const shortcuts = [
    {
      category: "Playback",
      items: [
        { key: "Space", description: "Play/Pause" },
        { key: "← / →", description: "Skip ±10 seconds" },
        { key: "↑ / ↓", description: "Volume ±10%" },
        { key: "N", description: "Next track" },
        { key: "B", description: "Previous track" },
        { key: "M", description: "Mute/Unmute" },
      ],
    },
    {
      category: "Panels",
      items: [
        { key: "P", description: "Toggle Playlist" },
        { key: "E", description: "Toggle EQ" },
        { key: "A", description: "Add to Playlist" },
      ],
    },
    {
      category: "EQ Controls",
      items: [
        { key: "T", description: "Toggle EQ Bypass" },
        { key: "R", description: "Reset EQ to Flat" },
        { key: "Shift + ← →", description: "Cycle Presets" },
      ],
    },
    {
      category: "Help",
      items: [
        { key: "?", description: "Show this help" },
        { key: "Esc", description: "Close modal" },
      ],
    },
  ];

  const handleShowShortcuts = () => {
    setShowShortcutsModal(true);
  };

  const handleCloseModal = () => {
    setShowShortcutsModal(false);
  };

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && showShortcutsModal) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showShortcutsModal]);

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
            className={`header-btn ${playlistOpen ? "header-btn--active" : ""}`}
            onClick={onTogglePlaylist}
            title="Toggle Playlist (P)"
            aria-label="Toggle Playlist"
          >
            <span className="header-btn__icon">📋</span>
            <span className="header-btn__label">Playlist</span>
            <kbd className="header-btn__kbd">P</kbd>
          </button>

          <button
            className={`header-btn ${eqOpen ? "header-btn--active" : ""}`}
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
          title={`Switch to ${isDark ? "Light" : "Dark"} Theme`}
          aria-label={`Switch to ${isDark ? "Light" : "Dark"} Theme`}
        >
          <span className="header-btn__icon">{isDark ? "☀️" : "🌙"}</span>
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
      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="shortcuts-modal-overlay" onClick={handleCloseModal}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-modal__header">
              <h2>Keyboard Shortcuts</h2>
              <button
                className="shortcuts-modal__close"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>
            <div className="shortcuts-modal__content">
              {shortcuts.map((section, idx) => (
                <div key={idx} className="shortcuts-section">
                  <h3 className="shortcuts-section__title">
                    {section.category}
                  </h3>
                  <div className="shortcuts-section__items">
                    {section.items.map((shortcut, i) => (
                      <div key={i} className="shortcut-item">
                        <kbd className="shortcut-key">{shortcut.key}</kbd>
                        <span className="shortcut-description">
                          {shortcut.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
