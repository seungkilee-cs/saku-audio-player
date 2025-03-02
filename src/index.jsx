import React from "react";
import ReactDOM from "react-dom";
import AudioPlayer from "./components/AudioPlayer";
import tracks from "./assets/meta/tracks";

tracks.forEach((track, index) => {
  console.log(`Track ${index + 1}:`, track);
});

ReactDOM.render(
  <React.StrictMode>
    <AudioPlayer tracks={tracks} />
  </React.StrictMode>,
  document.getElementById("root"),
);
