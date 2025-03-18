import React from "react";
import "../styles/Playlist.css";

const Playlist = ({ tracks, currentTrackIndex, onTrackSelect }) => {
  return (
    <div className="playlist">
      <h2>Playlist</h2>
      <ul>
        {tracks.map((track, index) => (
          <li
            key={index}
            className={currentTrackIndex === index ? "active" : ""}
            onClick={() => onTrackSelect(index)}
          >
            <span className="track-number">{index + 1}.</span>
            {track.title} - {track.artist}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Playlist;
