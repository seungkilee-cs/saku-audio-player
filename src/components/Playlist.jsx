import React, { useRef, useState, useImperativeHandle, forwardRef } from "react";
import "../styles/Playlist.css";

const Playlist = forwardRef(({ tracks, currentTrackIndex, onTrackSelect, onUpload, onReset }, ref) => {
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

  // Expose handleAddClick to parent via ref
  useImperativeHandle(ref, () => ({
    triggerAdd: handleAddClick
  }));

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
        <input
          ref={fileInputRef}
          className="playlist__file-input"
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileInputChange}
        />

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
                        <div className="playlist__item-info">
                          <p className="playlist__item-title">
                            <span className="playlist__item-title-text">{track.title}</span>
                          </p>
                          <p className="playlist__item-artist">{track.artist}</p>
                        </div>
                        <div className="playlist__item-length">
                          {Number.isFinite(track.length) && track.length > 0 ? formatLength(track.length) : "—"}
                        </div>
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
});

const formatLength = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

Playlist.displayName = 'Playlist';

export default Playlist;
