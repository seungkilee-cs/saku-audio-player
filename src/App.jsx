import React from "react";
import AudioPlayer from "./components/AudioPlayer";
import Playlist from "./components/Playlist";

let tracks = [];

function App() {
  return (
    <div className="app">
      <div className="audio-player-container">
        <AudioPlayer />
      </div>
      <div className="playlist-container">
        <Playlist tracks={tracks} />
      </div>
    </div>
  );
}

export default App;
