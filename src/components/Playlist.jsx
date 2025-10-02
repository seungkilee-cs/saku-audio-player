import React from "react";
import "../styles/Playlist.css";

const Playlist = ({ tracks, currentTrackIndex, onTrackSelect }) => {
  return (
    <div className="playlist">
      <h2>Playlist</h2>
      <ul className="playlist-body">
        {tracks.map((track, index) => (
          <li
            key={track.id || `${track.title}-${index}`}
            className={currentTrackIndex === index ? "active" : ""}
            onClick={() => onTrackSelect(index)}
          >
            <span className="track-number">{index + 1}.</span>
            <span className="track-title">{track.title}</span>
            <span className="track-artist">{track.artist}</span>
            {Number.isFinite(track.length) && track.length > 0 ? (
              <span className="track-length">{formatLength(track.length)}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

const formatLength = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default Playlist;
