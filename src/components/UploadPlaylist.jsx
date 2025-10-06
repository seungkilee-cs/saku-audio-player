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
      return "upload-status upload-status--error";
    }
    if (status === "loading") {
      return "upload-status upload-status--loading";
    }
    if (status === "success") {
      return "upload-status upload-status--success";
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
    <div className="upload-playlist upload-playlist--flux">
      <div className="upload-playlist__backdrop" aria-hidden="true">
        <span className="upload-playlist__orb upload-playlist__orb--one" />
        <span className="upload-playlist__orb upload-playlist__orb--two" />
        <span className="upload-playlist__orb upload-playlist__orb--three" />
      </div>

      <header className="upload-playlist__masthead">
        <div className="upload-playlist__masthead-copy">
          <span className="pill-chip">Flux Submission Studio</span>
          <h1 className="upload-playlist__title">Plant a new bloom.</h1>
          <p className="upload-playlist__subtitle">
            Drag stems, craft metadata, and dispatch them into the listening gallery. Saku Flux wraps
            each waveform in kinetic gradients automatically.
          </p>
        </div>
        <div className="upload-playlist__controls">
          <button
            type="button"
            className="upload-playlist__btn kinetic-pad"
            onClick={() => navigate("/player")}
          >
            <span>Open Player</span>
          </button>
          <button
            type="button"
            className="upload-playlist__btn"
            onClick={handleResetToDefault}
            disabled={status === "loading"}
          >
            Reset to Demo Tracks
          </button>
          <button
            type="button"
            className="upload-playlist__btn upload-playlist__btn--ghost"
            onClick={() => navigate("/")}
          >
            Return to Lobby
          </button>
        </div>
      </header>

      <div className="upload-playlist__grid">
        <section className="upload-panel upload-panel--intake glass-card glass-card--noisy">
          <header className="upload-panel__header">
            <h2 className="upload-panel__title">Gallery intake</h2>
            <span className="upload-panel__badge">Step 01</span>
          </header>
          <p className="upload-panel__copy">
            Drop audio stems or browse your device. We trace metadata, craft cover petals, and stage them
            for the listening room.
          </p>
          <FileUploader onFilesSelected={handleFilesSelected} disabled={status === "loading"} />
          <p className="upload-panel__hint">Supported: WAV, MP3, FLAC, AIFF.</p>
        </section>

        <section className="upload-panel upload-panel--status glass-card glass-card--noisy">
          <header className="upload-panel__header">
            <h2 className="upload-panel__title">Submission status</h2>
            <span className="upload-panel__badge">Step 02</span>
          </header>
          <p className="upload-panel__copy">
            Watch the bloom materialize as we analyze your files. When complete, the gallery seamlessly
            switches to your installation.
          </p>
          {message && <div className={statusClassName}>{message}</div>}
          <ul className="upload-timeline" role="list">
            <li className={`upload-timeline__item ${status !== "idle" ? "upload-timeline__item--active" : ""}`}>
              <span className="upload-timeline__dot" />Queued for analysis
            </li>
            <li className={`upload-timeline__item ${status === "loading" ? "upload-timeline__item--active" : ""}`}>
              <span className="upload-timeline__dot" />Parsing metadata &amp; artwork
            </li>
            <li className={`upload-timeline__item ${status === "success" ? "upload-timeline__item--active" : ""}`}>
              <span className="upload-timeline__dot" />Gallery synchronized
            </li>
          </ul>
          <p className="upload-meta">
            Current source: <strong>{activeSource === "uploaded" ? "Your uploads" : "Demo playlist"}</strong>
          </p>
        </section>
      </div>
    </div>
  );
};

export default UploadPlaylist;
