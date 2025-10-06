import React, { useRef, useState } from "react";
import "../styles/Playlist.css";

const Playlist = ({ tracks, currentTrackIndex, onTrackSelect, onUpload, onReset }) => {
  const hasTracks = tracks.length > 0;
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const emitUpload = (files) => {
    if (files && files.length && typeof onUpload === "function") {
      onUpload(files);
    }
  };

  const handleFileInputChange = (event) => {
    emitUpload(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleBodyKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleAddClick();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    if (!bodyRef.current?.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    emitUpload(event.dataTransfer.files);
  };

  return (
    <aside className="playlist">
      <div className="playlist__card">
        <header className="playlist__header">
          <div className="playlist__header-info">
            <span className="playlist__eyebrow">Library</span>
            <h2 className="playlist__title">Tracks</h2>
          </div>
          <input
            ref={fileInputRef}
            className="playlist__file-input"
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileInputChange}
          />
        </header>

        <div
          ref={bodyRef}
          className={`playlist__body${isDragging ? " is-dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="region"
          aria-label="Playlist drop zone"
          tabIndex={0}
          onKeyDown={handleBodyKeyDown}
        >
          <div className="playlist__body-controls">
            <button type="button" className="playlist__browse" onClick={handleAddClick}>
              Add
            </button>
            {onReset ? (
              <button type="button" className="playlist__reset" onClick={onReset} disabled={!hasTracks}>
                Reset
              </button>
            ) : null}
          </div>
          {hasTracks ? (
            <div className="playlist__scroll" role="presentation">
              <ul className="playlist__list" role="list">
                {tracks.map((track, index) => {
                  const isActive = currentTrackIndex === index;
                  return (
                    <li
                      key={track.id || `${track.title}-${index}`}
                      className={`playlist__item${isActive ? " is-active" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onTrackSelect(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onTrackSelect(index);
                        }
                      }}
                    >
                      <div className="playlist__item-index">{String(index + 1).padStart(2, "0")}</div>
                      <div className="playlist__item-body">
                        <p className="playlist__item-title">{track.title}</p>
                        <p className="playlist__item-artist">{track.artist}</p>
                      </div>
                      <div className="playlist__item-length">
                        {Number.isFinite(track.length) && track.length > 0 ? formatLength(track.length) : "—"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="playlist__empty">
              <p>No tracks yet</p>
              <span className="playlist__empty-hint">Drop files or use the add button above.</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

const formatLength = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default Playlist;
