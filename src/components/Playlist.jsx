import React, { useState } from "react";
import "../styles/Playlist.css";

const Playlist = ({ tracks, currentTrackIndex, onTrackSelect }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="playlist">
      <h2 onClick={toggleCollapse} className="playlist-header">
        {isCollapsed ? "▶" : "▼"} Playlist
      </h2>
      {!isCollapsed && (
        <ul className="playlist-tracks">
          {tracks.map((track, index) => (
            <li
              key={index}
              onClick={() => onTrackSelect(index)}
              className={`playlist-track ${
                index === currentTrackIndex ? "active" : ""
              }`}
            >
              <div className="track-info">
                <span className="track-title">{track.title}</span>
                <span className="track-artist">{track.artist}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Playlist;
