import React, { useState } from "react";
import FileUploader from "./FileUploader";
import TrackInfo from "./TrackInfo";
import Controls from "./Controls";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";

const AudioPlayer = () => {
  const [audioSrc, setAudioSrc] = useState(null);

  const handleFileUpload = (fileUrl) => {
    setAudioSrc(fileUrl);
  };

  return (
    <div className="audio-player">
      <FileUploader onFileUpload={handleFileUpload} />
      {audioSrc && (
        // Render your audio player components here
        <audio src={audioSrc} controls />
      )}
      <TrackInfo />
      <ProgressBar />
      <Controls />
      <VolumeControl />
    </div>
  );
};

export default AudioPlayer;
