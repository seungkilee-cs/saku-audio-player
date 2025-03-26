import React, { useState, useEffect } from "react";
import AudioPlayer from "./AudioPlayer";
import Playlist from "./Playlist";
import tracksPromise from "../assets/meta/tracks";
import "../styles/TestPlayer.css";

const TestPlayer = () => {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  useEffect(() => {
    tracksPromise
      .then((resolvedTracks) => {
        setTracks(resolvedTracks);
      })
      .catch((error) => console.error("Failed loading tracks:", error));
  }, []);

  const handleTrackSelect = (index) => {
    setCurrentTrackIndex(index);
  };

  if (tracks.length === 0) {
    return <div>{"Loading Tracks..."}</div>;
  }

  return (
    <div className="test-player-container">
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
  );
};

export default TestPlayer;
