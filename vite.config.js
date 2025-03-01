import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    outDir: "dist",
  },
  base: "/saku-audio-player/",
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
});
