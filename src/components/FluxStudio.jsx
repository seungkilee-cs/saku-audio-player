import React, { useState } from "react";
import AudioPlayer from "./AudioPlayer";
import PetalField from "./PetalField";
import Playlist from "./Playlist";
import PeqPanel from "./PeqPanel";
import Modal from "./Modal";
import "../styles/FluxStudio.css";
import { usePlayback } from "../context/PlaybackContext";
import { parseAudioFiles } from "../assets/meta/tracks";

const sourceLabels = {
  uploaded: "Custom Uploads",
  bundled: "Demo Gallery",
  default: "Unknown Source",
};

const FluxStudio = () => {
  const {
    tracks,
    currentTrackIndex,
    playTrackAt,
    playNext,
    playPrevious,
    loading,
    error,
    activeSource,
    replaceTracks,
    appendTracks,
    clearPlaylist,
    visualSettings,
  } = usePlayback();


  const [uploadState, setUploadState] = useState("idle");
  const [uploadMessage, setUploadMessage] = useState("Drop files or click add");
  const [isPeqModalOpen, setIsPeqModalOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const displaySource = sourceLabels[activeSource] ?? sourceLabels.default;

  const togglePlaylist = () => {
    setIsPlaylistModalOpen(true);
  };

  const handleFilesSelected = async (fileList) => {
    if (!fileList || fileList.length === 0) {
      setUploadState("error");
      setUploadMessage("No files selected. Please choose at least one audio file.");
      return;
    }

    setUploadState("loading");
    setUploadMessage(`Processing ${fileList.length} file${fileList.length > 1 ? "s" : ""}...`);
    try {
      const parsedTracks = await parseAudioFiles(fileList);

      if (!parsedTracks.length) {
        setUploadState("error");
        setUploadMessage("No playable audio could be detected. Try different files.");
        return;
      }

      const shouldAppend = tracks.length > 0;
      const apply = shouldAppend ? appendTracks : replaceTracks;
      const success = await apply(parsedTracks, { startIndex: shouldAppend ? tracks.length : 0 });
      if (success) {
        setUploadState("success");
        const totalTracks = tracks.length + parsedTracks.length;
        setUploadMessage(`Added ${parsedTracks.length} track${parsedTracks.length > 1 ? "s" : ""}. ${totalTracks} total.`);
      } else {
        setUploadState("error");
        setUploadMessage("We couldn't queue the uploaded tracks. Please try again.");
      }
    } catch (uploadError) {
      console.error("Failed to parse uploaded files", uploadError);
      setUploadState("error");
      setUploadMessage("Something went wrong while reading the audio files.");
    }
  };

  return (
    <div className="flux-studio">
      <main className="flux-studio__layout">
        <section className="flux-studio__primary">
          {loading ? (
            <div className="flux-studio__placeholder">Loading tracks…</div>
          ) : error ? (
            <div className="flux-studio__placeholder flux-studio__placeholder--error">{error}</div>
          ) : (
            <>
              <AudioPlayer
                tracks={tracks}
                currentTrackIndex={currentTrackIndex}
                onTrackChange={playTrackAt}
                onNext={playNext}
                onPrevious={playPrevious}
                sourceLabel={`Source · ${displaySource}`}
                showAmbientGlow={visualSettings.showAmbientGlow || visualSettings.showPetals}
                showWaveform={visualSettings.showWaveform}
                onFilesDropped={handleFilesSelected}
                renderOverlay={({ progress, isPlaying, currentTrack }) =>
                  visualSettings.showPetals ? (
                    <PetalField
                      isPlaying={isPlaying}
                      progress={progress}
                      intensity={0.6 + progress * 0.4}
                      petalCount={currentTrack ? 18 : 12}
                      tintColor={currentTrack?.color}
                    />
                  ) : null
                }
                extraActions={
                  <div className="flux-studio__extra-actions">
                    <button
                      type="button"
                      className="flux-studio__toggle-peq"
                      onClick={() => setIsPeqModalOpen(true)}
                      title="Open Parametric EQ"
                    >
                      <span className="flux-studio__toggle-label">EQ</span>
                      <span aria-hidden="true" className="flux-studio__toggle-icon">
                        🎛️
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      className="flux-studio__toggle-playlist"
                      onClick={togglePlaylist}
                      title="Open Playlist"
                    >
                      <span className="flux-studio__toggle-label">Playlist</span>
                      <span aria-hidden="true" className="flux-studio__toggle-icon">
                        📋
                      </span>
                    </button>
                    {/* <div className="flux-studio__visual-toggle" role="group" aria-label="Visual settings">
                      <label>
                        <input
                          type="checkbox"
                          checked={visualSettings.showWaveform}
                          onChange={() => toggleVisualSetting("showWaveform")}
                        />
                        Waveform
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={visualSettings.showAmbientGlow}
                          onChange={() => toggleVisualSetting("showAmbientGlow")}
                        />
                        Ambient
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={visualSettings.showPetals}
                          onChange={() => toggleVisualSetting("showPetals")}
                        />
                        Petals
                      </label>
                    </div> */}
                  </div>
                }
              />
            </>
          )}
        </section>


      </main>

      {/* EQ and Playlist Modals */}
      <Modal
        isOpen={isPeqModalOpen}
        onClose={() => setIsPeqModalOpen(false)}
        title="Parametric EQ"
        size="large"
        theme="dark"
      >
        <PeqPanel />
      </Modal>

      <Modal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        title="Playlist"
        size="medium"
        theme="light"
      >
        <Playlist
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackSelect={playTrackAt}
          onUpload={handleFilesSelected}
          onReset={clearPlaylist}
        />
        <p className={`flux-studio__upload-status flux-studio__upload-status--${uploadState}`}>{uploadMessage}</p>
      </Modal>
    </div>
  );
}

export default FluxStudio;
