import React, { useState } from "react";
import generateTracks from "../assets/meta/tracks";

const FileUploader = ({ onTracksAdded }) => {
  const [files, setFiles] = useState([]);

  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);

    // Generate tracks from uploaded files
    const newTracks = await generateTracks(selectedFiles);
    onTracksAdded(newTracks); // Pass new tracks to parent component
  };

  return (
    <div className="file-uploader">
      <input
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileChange}
      />
    </div>
  );
};

export default FileUploader;
