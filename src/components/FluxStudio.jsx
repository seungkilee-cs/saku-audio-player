import React, { useState } from "react";
import AudioPlayer from "./AudioPlayer";
import PetalField from "./PetalField";
import Playlist from "./Playlist";
import PeqPanel from "./PeqPanel";
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
    resetToDefault,
    visualSettings,
  } = usePlayback();

  const [isPlaylistOpen, setIsPlaylistOpen] = useState(true);
  const [uploadState, setUploadState] = useState("idle");
  const [uploadMessage, setUploadMessage] = useState("Drop audio files here or use the add button.");

  const displaySource = sourceLabels[activeSource] ?? sourceLabels.default;

  const togglePlaylist = () => {
    setIsPlaylistOpen((prev) => !prev);
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
        setUploadMessage(`Loaded ${parsedTracks.length} track${parsedTracks.length > 1 ? "s" : ""}. Ready to play.`);
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
      <main className={`flux-studio__layout${isPlaylistOpen ? "" : " flux-studio__layout--sidebar-hidden"}`}>
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
                      className="flux-studio__toggle-playlist"
                      onClick={togglePlaylist}
                      aria-expanded={isPlaylistOpen}
                    >
                      <span className="flux-studio__toggle-label">Playlist</span>
                      <span aria-hidden="true" className="flux-studio__toggle-icon">
                        {isPlaylistOpen ? "▾" : "▸"}
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
              <PeqPanel />
            </>
          )}
        </section>

        {isPlaylistOpen ? (
          <aside className="flux-studio__sidebar">
            <Playlist
              tracks={tracks}
              currentTrackIndex={currentTrackIndex}
              onTrackSelect={playTrackAt}
              onUpload={handleFilesSelected}
              onReset={resetToDefault}
            />
            <p className={`flux-studio__upload-status flux-studio__upload-status--${uploadState}`}>{uploadMessage}</p>
          </aside>
        ) : null}
      </main>
    </div>
  );
}

export default FluxStudio;
