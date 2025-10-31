import React, {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { collectAudioFilesFromDataTransfer, filterSupportedAudioFiles } from "../utils/filePickers";
import "../styles/Playlist.css";
import { handlePlaylistItemKeyDown } from "./playlistKeydown";

const INTERNAL_DRAG_TYPE = "application/x-saku-track-index";
const DROP_POSITIONS = {
  BEFORE: "before",
  AFTER: "after",
};

const Playlist = forwardRef(
  (
    {
      tracks,
      currentTrackIndex,
      onTrackSelect,
      onUpload,
      onReset,
      onRemoveTrack,
      onMoveTrack,
      onInsertTracks,
    },
    ref,
  ) => {
  const hasTracks = tracks.length > 0;
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropTarget, setDropTarget] = useState({ index: null, position: null });

  const emitUpload = (filesLike) => {
    const audioFiles = filterSupportedAudioFiles(filesLike);
    if (audioFiles.length > 0 && typeof onUpload === "function") {
      onUpload(audioFiles);
    }
  };

  const handleFileInputChange = (event) => {
    emitUpload(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFolderInputChange = (event) => {
    emitUpload(event.target.files);
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const handleAddClick = (event) => {
    const shouldSelectFolder =
      event?.nativeEvent?.altKey ||
      event?.nativeEvent?.shiftKey ||
      event?.nativeEvent?.metaKey;

    if (shouldSelectFolder) {
      folderInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  // Expose handleAddClick to parent via ref
  useImperativeHandle(ref, () => ({
    triggerAdd: handleAddClick
  }));

  const handleBodyKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleAddClick(event);
    }
  };

  const resetDragState = useCallback(() => {
    setIsDragging(false);
    setDraggedIndex(null);
    setDropTarget({ index: null, position: null });
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (!bodyRef.current?.contains(event.relatedTarget)) {
      resetDragState();
    }
  }, [resetDragState]);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      const dataTransfer = event.dataTransfer;

      if (dataTransfer.types.includes(INTERNAL_DRAG_TYPE)) {
        const fromIndex = Number.parseInt(dataTransfer.getData(INTERNAL_DRAG_TYPE), 10);
        if (Number.isInteger(fromIndex) && dropTarget.index !== null && onMoveTrack) {
          const targetIndex = dropTarget.position === DROP_POSITIONS.AFTER ? dropTarget.index + 1 : dropTarget.index;
          const adjustedTarget = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
          onMoveTrack({ fromIndex, toIndex: adjustedTarget });
        }
        resetDragState();
        return;
      }

      collectAudioFilesFromDataTransfer(dataTransfer).then((files) => {
        if (files.length) {
          if (dropTarget.index !== null && typeof onInsertTracks === "function") {
            const insertIndex = dropTarget.position === DROP_POSITIONS.AFTER ? dropTarget.index + 1 : dropTarget.index;
            onInsertTracks(files, insertIndex);
          } else {
            emitUpload(files);
          }
        }
        resetDragState();
      });
    },
    [dropTarget, onMoveTrack, onInsertTracks, emitUpload, resetDragState],
  );

  const handleDragStart = useCallback((event, index) => {
    if (!Number.isInteger(index)) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(INTERNAL_DRAG_TYPE, String(index));
    setDraggedIndex(index);
  }, []);

  const handleDragEnterItem = useCallback((event, index) => {
    event.preventDefault();
    const boundingRect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - boundingRect.top;
    const position = offsetY > boundingRect.height / 2 ? DROP_POSITIONS.AFTER : DROP_POSITIONS.BEFORE;
    setDropTarget({ index, position });
  }, []);

  const getDropIndicatorClass = useCallback(
    (index) => {
      if (dropTarget.index !== index) {
        return "";
      }
      return dropTarget.position === DROP_POSITIONS.AFTER
        ? " playlist__drop-indicator--after"
        : " playlist__drop-indicator--before";
    },
    [dropTarget],
  );

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
        <input
          ref={folderInputRef}
          className="playlist__file-input"
          type="file"
          accept="audio/*"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderInputChange}
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
            <button type="button" className="playlist__browse" onClick={handleAddClick} title="Click to select files. Hold Alt/Shift to pick a folder.">
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
                  const itemClasses = [
                    "playlist__item",
                    isActive ? "is-active" : "",
                    draggedIndex === index ? "playlist__item--dragging" : "",
                    getDropIndicatorClass(index),
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <li
                      key={track.id || `${track.title}-${index}`}
                      className={itemClasses}
                      role="button"
                      tabIndex={0}
                      data-testid={`playlist-item-${index}`}
                      draggable={typeof onMoveTrack === "function"}
                      onDragStart={(event) => handleDragStart(event, index)}
                      onDragEnter={(event) => handleDragEnterItem(event, index)}
                      onDragOver={(event) => handleDragEnterItem(event, index)}
                      onDragEnd={resetDragState}
                      aria-grabbed={typeof onMoveTrack === "function" ? draggedIndex === index : undefined}
                      onClick={() => onTrackSelect(index)}
                      onKeyDown={(event) =>
                        handlePlaylistItemKeyDown({
                          event,
                          index,
                          onSelect: onTrackSelect,
                          onRemove: onRemoveTrack,
                        })
                      }
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
                        {typeof onRemoveTrack === "function" ? (
                          <button
                            type="button"
                            className="playlist__remove-button"
                            aria-label={`Remove ${track.title || "track"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveTrack(index);
                            }}
                          >
                            ×
                          </button>
                        ) : null}
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

Playlist.displayName = "Playlist";

export default Playlist;
