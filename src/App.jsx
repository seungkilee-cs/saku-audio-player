import React, { useState } from "react";
import AudioPlayer from "./components/AudioPlayer";
import Playlist from "./components/Playlist";
import FileUploader from "./components/FileUploader";

function App() {
  const [tracks, setTracks] = useState([]);

  const handleFileUpload = (files) => {
    const newTracks = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setTracks((prevTracks) => [...prevTracks, ...newTracks]);
  };

  return (
    <div className="app">
      <FileUploader onFileUpload={handleFileUpload} />
      <div className="audio-player-container">
        <AudioPlayer tracks={tracks} />
      </div>
      <div className="playlist-container">
        <Playlist tracks={tracks} />
      </div>
    </div>
  );
}

export default App;
