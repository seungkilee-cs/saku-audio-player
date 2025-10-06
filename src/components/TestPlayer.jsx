import React from "react";
import AudioPlayer from "./AudioPlayer";
import Playlist from "./Playlist";
import "../styles/TestPlayer.css";
import { useNavigate } from "react-router-dom";
import { usePlayback } from "../context/PlaybackContext";

const TestPlayer = () => {
  const navigate = useNavigate();
  const {
    tracks,
    currentTrackIndex,
    playTrackAt,
    loading,
    error,
    activeSource,
  } = usePlayback();

  const handleGoHome = () => {
    navigate("/");
  };

  if (loading) {
    return <div className="test-player-status">Loading tracks...</div>;
  }

  if (error) {
    return (
      <div className="test-player-status error">
        <p>{error}</p>
        <button onClick={handleGoHome} className="btn-home">
          Go Home
        </button>
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="test-player-status">
        <p>No tracks available. Try uploading a playlist.</p>
        <button onClick={() => navigate("/upload-playlist")} className="btn-home">
          Upload Music
        </button>
      </div>
    );
  }

  return (
    <div className="player-gallery player-gallery--flux">
      <div className="player-gallery__background">
        <span className="floating-bloom floating-bloom--primary player-gallery__bloom player-gallery__bloom--one" />
        <span className="floating-bloom floating-bloom--secondary player-gallery__bloom player-gallery__bloom--two" />
        <span className="floating-bloom floating-bloom--accent player-gallery__bloom player-gallery__bloom--three" />
      </div>

      <header className="player-gallery__masthead">
        <div className="player-gallery__chrome">
          <span className="pill-chip">Saku Flux Listening Room</span>
          <button type="button" className="player-gallery__nav kinetic-pad" onClick={handleGoHome}>
            <span>Return to Lobby</span>
          </button>
        </div>

        <div className="player-gallery__hero">
          <div className="player-gallery__hero-copy">
            <h1 className="player-gallery__title">Where waveforms become light sculptures.</h1>
            <p className="player-gallery__subtitle">
              Scroll through playlists, bend kinetic controls, and watch metadata bloom into color.
            </p>
            <div className="player-gallery__hero-meta">
              <span className="pill-chip">Source · {activeSource === "uploaded" ? "Your uploads" : "Demo playlist"}</span>
              <span className="pill-chip">Reactive controls</span>
              <span className="pill-chip">Spectral canvas</span>
            </div>
          </div>
          <div className="player-gallery__hero-visual glass-card glass-card--noisy">
            <div className="player-gallery__waveform" aria-hidden="true">
              <span className="player-gallery__wave player-gallery__wave--one" />
              <span className="player-gallery__wave player-gallery__wave--two" />
              <span className="player-gallery__wave player-gallery__wave--three" />
              <span className="player-gallery__wave player-gallery__wave--four" />
            </div>
            <p className="player-gallery__hero-legend">Flux spectrogram rendered as flowing ribbons.</p>
          </div>
        </div>
      </header>

      <div className="player-gallery__content">
        <AudioPlayer
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={playTrackAt}
        />
        <Playlist
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackSelect={playTrackAt}
        />
      </div>

      <section className="player-gallery__notes glass-card glass-card--noisy">
        <div className="player-gallery__notes-heading">
          <span className="section-heading__eyebrow">Listening Notes</span>
          <h2 className="player-gallery__notes-title">How to wander the bloom</h2>
        </div>
        <ol className="player-gallery__notes-list">
          <li>Use the kinetic dial to linger, leap ten seconds, or reverse the bloom.</li>
          <li>Drag the timeline glaze to reveal petals of the waveform in motion.</li>
          <li>Balance the sonic bouquet with the sculpted volume slider on the right.</li>
        </ol>
      </section>
    </div>
  );
};

export default TestPlayer;
