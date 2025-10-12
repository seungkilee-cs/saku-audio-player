import React, { useState, useCallback } from 'react';
import { usePlayback } from '../../context/PlaybackContext';
import Header from './Header';
import Sidebar from './Sidebar';
import AudioPlayer from '../AudioPlayer';
import PeqPanel from '../PeqPanel';
import Playlist from '../Playlist';
import { parseAudioFiles } from '../../assets/meta/tracks';
import '../../styles/AppLayout.css';

const AppLayout = () => {
  const {
    tracks,
    currentTrackIndex,
    playTrackAt,
    playNext,
    playPrevious,
    replaceTracks,
    appendTracks,
    resetToDefault,
    activeSource,
  } = usePlayback();

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const sourceLabels = {
    uploaded: 'Custom Uploads',
    bundled: 'Demo Gallery',
    default: 'Unknown Source',
  };

  const displaySource = sourceLabels[activeSource] ?? sourceLabels.default;

  const handleFilesSelected = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    try {
      const parsedTracks = await parseAudioFiles(fileList);
      if (!parsedTracks.length) return;

      const shouldAppend = tracks.length > 0;
      const apply = shouldAppend ? appendTracks : replaceTracks;
      await apply(parsedTracks, { startIndex: shouldAppend ? tracks.length : 0 });
    } catch (error) {
      console.error('Failed to parse uploaded files', error);
    }
  }, [tracks.length, appendTracks, replaceTracks]);

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarOpen(prev => !prev);
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setRightSidebarOpen(prev => !prev);
  }, []);

  return (
    <div className="app-layout">
      <Header 
        onTogglePlaylist={toggleLeftSidebar}
        onToggleEq={toggleRightSidebar}
        playlistOpen={leftSidebarOpen}
        eqOpen={rightSidebarOpen}
      />
      
      <main className={`app-main ${!leftSidebarOpen ? 'left-collapsed' : ''} ${!rightSidebarOpen ? 'right-collapsed' : ''}`}>
        {/* Left Sidebar: Playlist */}
        <Sidebar 
          position="left" 
          isOpen={leftSidebarOpen}
          onToggle={toggleLeftSidebar}
          title="Playlist"
        >
          <Playlist
            tracks={tracks}
            currentTrackIndex={currentTrackIndex}
            onTrackSelect={playTrackAt}
            onUpload={handleFilesSelected}
            onReset={resetToDefault}
          />
        </Sidebar>

        {/* Center: Audio Player */}
        <div className="app-center">
          <AudioPlayer
            tracks={tracks}
            currentTrackIndex={currentTrackIndex}
            onTrackChange={playTrackAt}
            onNext={playNext}
            onPrevious={playPrevious}
            sourceLabel={`Source · ${displaySource}`}
            showAmbientGlow={true}
            showWaveform={true}
            onFilesDropped={handleFilesSelected}
            onToggleEqModal={toggleRightSidebar}
            onTogglePlaylistModal={toggleLeftSidebar}
          />
        </div>

        {/* Right Sidebar: Parametric EQ */}
        <Sidebar 
          position="right" 
          isOpen={rightSidebarOpen}
          onToggle={toggleRightSidebar}
          title="Parametric EQ"
        >
          <PeqPanel />
        </Sidebar>
      </main>
    </div>
  );
};

export default AppLayout;
