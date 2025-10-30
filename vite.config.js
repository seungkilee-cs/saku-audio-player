import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ command }) => ({
  plugins: [react(), svgr()],
  build: {
    outDir: "dist",
  },
  base: command === "serve" ? "/" : "/saku-audio-player/",
  optimizeDeps: {
    include: [
      "music-metadata",
    ],
    exclude: [
      "music-metadata/lib/parsers",
    ],
  },
  esbuild: {
    loader: "jsx",
    include: [
      // Add this for business-as-usual behavior for .jsx and .tsx files
      "src/**/*.js",
      "src/**/*.jsx",
      "node_modules/**/*.js",
      "node_modules/**/*.jsx",
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
  },
}));
