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
    <div className="test-player-container">
      <div className="player-content">
        <AudioPlayer
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={playTrackAt}
        />
        <Playlist
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackSelect={playTrackAt}
          onNext={playTrackAt}
        />
      </div>
      <p className="player-meta">
        <span className="source-label">
          Source: {activeSource === "uploaded" ? "Your uploads" : "Demo playlist"}
        </span>
      </p>
      <div className="home-btn">
        <button onClick={handleGoHome} className="btn-home">
          Go Back
        </button>
      </div>
    </div>
  );
};

export default TestPlayer;
