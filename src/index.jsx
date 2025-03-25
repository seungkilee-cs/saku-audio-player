import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./components/Home";
import TestPlayer from "./components/TestPlayer";
import UploadPlaylist from "./components/UploadPlaylist";
import "./App.css";

function App() {
  return (
    <Router basename="/saku-audio-player">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/player" element={<TestPlayer />} />
        <Route path="/upload-playlist" element={<UploadPlaylist />} />
      </Routes>
    </Router>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
