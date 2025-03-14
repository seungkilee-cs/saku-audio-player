import React from "react";

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
            {track.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Playlist;
