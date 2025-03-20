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
  container,
  fileExtension,
  codec,
  bitsPerSample,
  sampleRate,
  detailedBitSampleInfo,
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
      <span className="format">{fileExtension} | </span>
      <span className="bitrate"> {bitrate} kbps </span>
      <span className="detailedBitSampleInfo"> | {detailedBitSampleInfo}</span>
    </div>
  </div>
);

export default TrackInfo;
