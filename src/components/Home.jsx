import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const HomePage = () => {
  const navigate = useNavigate();

  const handleUploadPlaylist = () => {
    navigate("/upload-playlist");
  };

  const handleTestItOut = () => {
    navigate("/player");
  };

  return (
    <div className="home-page">
      <h1>Audio Player App</h1>
      <div className="button-container">
        <button onClick={handleUploadPlaylist}>Upload Playlist</button>
        <button onClick={handleTestItOut}>Test It Out</button>
      </div>
    </div>
  );
};

export default HomePage;
