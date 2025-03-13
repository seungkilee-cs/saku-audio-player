import * as mm from "music-metadata";
import defaultImage from "../assets/img/pale_blue.png";

async function generateTracks(files = []) {
  const tracks = [];

  for (const file of files) {
    try {
      const metadata = await mm.parseBlob(file);
      const imageData = metadata.common.picture?.[0];
      const image = imageData
        ? `data:${imageData.format};base64,${btoa(
            String.fromCharCode(...new Uint8Array(imageData.data)),
          )}`
        : defaultImage;

      const track = {
        title: metadata.common.title || file.name || "Unknown Title",
        artist: metadata.common.artist || "Unknown Artist",
        album: metadata.common.album || "Unknown Album",
        bitrate: Math.round(metadata.format.bitrate / 1000) || 0,
        length: Math.round(metadata.format.duration) || 0,
        audioSrc: URL.createObjectURL(file), // Create object URL for playback
        image: image,
        color: getContrastColor(),
      };

      tracks.push(track);
    } catch (error) {
      console.error(`Error parsing metadata for ${file.name}:`, error.message);
    }
  }

  return tracks;
}

function getContrastColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.random() * 30; // 70-100%
  const lightness = 30 + Math.random() * 40; // 30-70%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default generateTracks;
