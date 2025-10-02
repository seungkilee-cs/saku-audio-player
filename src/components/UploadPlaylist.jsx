import React, { useMemo, useState } from "react";
import "../styles/UploadPlaylist.css";
import { useNavigate } from "react-router-dom";
import FileUploader from "./FileUploader";
import { parseAudioFiles } from "../assets/meta/tracks";
import { usePlayback } from "../context/PlaybackContext";

const UploadPlaylist = () => {
  const navigate = useNavigate();
  const { replaceTracks, resetToDefault, activeSource } = usePlayback();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const statusClassName = useMemo(() => {
    if (status === "error") {
      return "upload-status error";
    }
    if (status === "loading") {
      return "upload-status loading";
    }
    if (status === "success") {
      return "upload-status";
    }
    return "upload-status";
  }, [status]);

  const handleFilesSelected = async (fileList) => {
    if (!fileList || fileList.length === 0) {
      setStatus("error");
      setMessage("No files selected. Please choose at least one audio file.");
      return;
    }

    setStatus("loading");
    setMessage(`Processing ${fileList.length} file${fileList.length > 1 ? "s" : ""}...`);

    try {
      const parsedTracks = await parseAudioFiles(fileList);

      if (!parsedTracks.length) {
        setStatus("error");
        setMessage("No playable audio could be detected. Try different files.");
        return;
      }

      const success = await replaceTracks(parsedTracks, { startIndex: 0 });
      if (success) {
        setStatus("success");
        setMessage(
          `Loaded ${parsedTracks.length} track${parsedTracks.length > 1 ? "s" : ""}. Redirecting...`,
        );
        setTimeout(() => navigate("/player"), 600);
      } else {
        setStatus("error");
        setMessage("We couldn't queue the uploaded tracks. Please try again.");
      }
    } catch (err) {
      console.error("Failed to parse uploaded files", err);
      setStatus("error");
      setMessage("Something went wrong while reading the audio files.");
    }
  };

  const handleResetToDefault = () => {
    resetToDefault();
    setStatus("idle");
    setMessage("Switched back to the demo playlist.");
  };

  return (
    <div className="upload-playlist-wrapper">
      <div className="upload-playlist-container">
        <div className="upload-playlist-content">
          <div>
            <h2>Upload Playlist</h2>
            <p>
              Select audio files from your device to build a playlist instantly. We'll parse the
              metadata and send you to the player.
            </p>
          </div>
          <FileUploader onFilesSelected={handleFilesSelected} disabled={status === "loading"} />
          {message && <div className={statusClassName}>{message}</div>}
          <div className="upload-actions">
            <button onClick={() => navigate("/player")} className="btn-home">
              Open Player
            </button>
            <button onClick={handleResetToDefault} className="btn-home" disabled={status === "loading"}>
              Reset to Demo Tracks
            </button>
          </div>
          <p className="upload-meta">
            Current source: <strong>{activeSource === "uploaded" ? "Your uploads" : "Demo playlist"}</strong>
          </p>
        </div>
      </div>
      <div className="home-btn">
        <button onClick={() => navigate("/")} className="btn-home">
          Go Home
        </button>
      </div>
    </div>
  );
};

export default UploadPlaylist;
