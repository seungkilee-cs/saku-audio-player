import React, { useState } from "react";
import "../styles/Playlist.css";

const Playlist = ({ tracks, currentTrackIndex, onTrackSelect }) => {
  return (
    <div className="playlist">
      <h2>Playlist</h2>
      <ul>
        {tracks.map((track, index) => (
          <li
            key={index}
            className={index === currentTrackIndex ? "active" : ""}
            onClick={() => onTrackSelect(index)}
          >
            {track.title} - {track.artist}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Playlist;
