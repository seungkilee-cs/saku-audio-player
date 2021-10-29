import React from 'react';
import ReactDOM from 'react-dom';
import AudioPlayer from './components/AudioPlayer';
import tracks from './assets/meta/tracks';

const rootElement = document.getElementById("root");
ReactDOM.render(
  <React.StrictMode>
    <AudioPlayer tracks={tracks} />
  </React.StrictMode>,
  rootElement
);