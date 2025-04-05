import React from "react";
import "../styles/UploadPlaylist.css";
import { useNavigate } from "react-router-dom";

const UploadPlaylist = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="upload-playlist-wrapper">
      <div className="upload-playlist-container">
        <h2>Upload Playlist</h2>
        <p>This feature is currently under development.</p>
      </div>
      <div className="home-btn">
        <button onClick={handleGoHome} className="btn-home">
          Go Home
        </button>
      </div>
    </div>
  );
};

export default UploadPlaylist;
