import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import AudioPlayer from "./components/AudioPlayer";
import tracksPromise from "./assets/meta/tracks";

function App() {
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    tracksPromise.then((resolvedTracks) => {
      setTracks(resolvedTracks);
      console.log("All tracks:", resolvedTracks);
      resolvedTracks.forEach((track, index) => {
        console.log(`Track ${index + 1}:`, track);
      });
    });
  }, []);

  if (tracks.length === 0) {
    return <div>Loading tracks...</div>;
  }

  return <AudioPlayer tracks={tracks} />;
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
