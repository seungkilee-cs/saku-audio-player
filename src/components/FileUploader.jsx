import React from "react";
import generateTracks from "../services/generateTracks";

const FileUploader = ({ onTracksAdded }) => {
  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files); // Convert FileList to array
    const newTracks = await generateTracks(selectedFiles); // Generate track objects
    onTracksAdded(newTracks); // Pass new tracks to parent component
  };

  return (
    <div className="file-uploader">
      <label htmlFor="file-upload" className="file-upload-label">
        Upload Audio Files
      </label>
      <input
        id="file-upload"
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileChange}
        className="file-upload-input"
      />
    </div>
  );
};

export default FileUploader;
