import React, { useState, useEffect } from "react";
import AudioPlayer from "./AudioPlayer";
import Playlist from "./Playlist";
import tracksPromise from "../assets/meta/tracks";
import "../styles/TestPlayer.css";
import { useNavigate } from "react-router-dom";

const TestPlayer = () => {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    tracksPromise
      .then((resolvedTracks) => {
        setTracks(resolvedTracks);
      })
      .catch((error) => console.error("Failed loading tracks:", error));
  }, []);

  const handleGoHome = () => {
    navigate("/");
  };
  const handleTrackSelect = (index) => {
    setCurrentTrackIndex(index);
  };

  if (tracks.length === 0) {
    return <div>{"Loading Tracks..."}</div>;
  }

  return (
    <div className="test-player-container">
      <div className="player-content">
        <AudioPlayer
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackSelect}
        />
        <Playlist
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackSelect={handleTrackSelect}
        />
      </div>
      <div className="home-btn">
        <button onClick={handleGoHome} className="btn-home">
          Go Back
        </button>
      </div>
    </div>
  );
};

export default TestPlayer;
