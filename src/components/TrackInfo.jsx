import React from "react";

const TrackInfo = ({ title, artist, albumCover }) => {
  return (
    <div className="track-info">
      {albumCover && (
        <img src={albumCover} alt="Album Cover" className="album-cover" />
      )}
      <div className="track-details">
        <h2 className="track-title">{title}</h2>
        <p className="track-artist">{artist}</p>
      </div>
    </div>
  );
};

export default TrackInfo;
