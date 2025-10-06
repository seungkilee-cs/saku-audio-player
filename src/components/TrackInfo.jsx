import React from "react";

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
}) => {
  const sampleDetails = [
    sampleRate ? `${sampleRate} Hz` : null,
    bitsPerSample ? `${bitsPerSample}-bit` : null,
    detailedBitSampleInfo || null,
  ]
    .filter(Boolean)
    .join(" · ") || "—";

  return (
    <section className="track-info">
      {image && (
        <figure className="track-info__frame">
          <img
            className="track-info__artwork"
            src={image}
            alt={`Artwork for ${title} by ${artist}`}
          />
          <figcaption className="track-info__artwork-caption">{album}</figcaption>
          <span className="pill-chip track-info__badge">Featured Bloom</span>
        </figure>
      )}
      <header className="track-info__heading">
        <span className="track-info__eyebrow">Now exhibiting</span>
        <h2 className="track-info__title">{title}</h2>
        <p className="track-info__artist">{artist}</p>
      </header>
      <div className="track-info__meta-grid">
        <div className="track-info__meta-card">
          <span className="track-info__meta-label">Runtime</span>
          <span className="track-info__meta-value">
            {Number.isFinite(length) && length > 0 ? formatTime(length) : "Unknown"}
          </span>
        </div>
        <div className="track-info__meta-card">
          <span className="track-info__meta-label">Format</span>
          <span className="track-info__meta-value">{fileExtension?.toUpperCase() || "—"}</span>
        </div>
        <div className="track-info__meta-card">
          <span className="track-info__meta-label">Codec</span>
          <span className="track-info__meta-value">{codec || "Unknown"}</span>
        </div>
        <div className="track-info__meta-card">
          <span className="track-info__meta-label">Bitrate</span>
          <span className="track-info__meta-value">
            {bitrate ? `${bitrate} kbps` : "Unknown"}
          </span>
        </div>
        <div className="track-info__meta-card">
          <span className="track-info__meta-label">Sample</span>
          <span className="track-info__meta-value">{sampleDetails}</span>
        </div>
        <div className="track-info__meta-card">
          <span className="track-info__meta-label">Container</span>
          <span className="track-info__meta-value">{container || "—"}</span>
        </div>
      </div>
    </section>
  );
};

export default TrackInfo;
