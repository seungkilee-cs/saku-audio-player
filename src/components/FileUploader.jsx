import React, { useRef, useState } from "react";
import "../styles/UploadPlaylist.css";

const FileUploader = ({ onFilesSelected, disabled = false }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList) => {
    if (disabled || !onFilesSelected) {
      return;
    }
    onFilesSelected(fileList);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (event) => {
    handleFiles(event.target.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`file-uploader ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileChange}
        disabled={disabled}
        aria-label="Upload audio files"
      />
      <p className="file-uploader-instructions">
        Drag and drop your audio files here, or click to browse.
      </p>
    </div>
  );
};

export default FileUploader;
