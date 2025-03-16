import React from "react";
import { formatTime } from "../../util/timeUtils";

const TrackInfo = ({
  title,
  artist,
  album,
  image,
  bitrate,
  length,
  formatTime,
}) => (
  <div className="track-info">
    {image && (
      <img
        className="artwork"
        src={image}
        alt={`track artwork for ${title} by ${artist}`}
      />
    )}
    <h2 className="title">{title}</h2>
    <h3 className="artist">{artist}</h3>
    <h5 className="album">{album}</h5>
    <div className="track-info-extra">
      <span className="bitrate">Bitrate: {bitrate} kbps</span>
      <span className="length">Length: {formatTime(length)}</span>
    </div>
  </div>
);

export default TrackInfo;
