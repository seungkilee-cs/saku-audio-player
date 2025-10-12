import React from "react";
import { createRoot } from "react-dom/client";
import { PlaybackProvider } from "./context/PlaybackContext";
import FluxStudio from "./components/FluxStudio";
import "./styles/theme.css";
import "./styles/theme-light.css";
import "./App.css";

function App() {
  return (
    <PlaybackProvider>
      <FluxStudio />
    </PlaybackProvider>
  );
}

export default App;

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
