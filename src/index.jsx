import React, { useState, useEffect, useTransition } from "react";
import { createRoot } from "react-dom/client";
import AudioPlayer from "./components/AudioPlayer";
import Playlist from "./components/Playlist";
import tracksPromise from "./assets/meta/tracks";
import "./App.css";

function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      tracksPromise
        .then((resolvedTracks) => {
          setTracks(resolvedTracks);
        })
        .catch((error) => console.error("Failed loading tracks:", error));
    });
  }, []);

  const handleTrackSelect = (index) => {
    setCurrentTrackIndex(index);
  };

  if (tracks.length === 0) {
    return <div>{isPending ? "Loading tracks..." : "No tracks available"}</div>;
  }

  return (
    <div className="audio-app-container">
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
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
