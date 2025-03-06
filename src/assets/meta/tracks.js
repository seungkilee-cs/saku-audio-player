import * as mm from "music-metadata";
import images from "../img";
import audio from "../audio";
import defaultImage from "../img/pale_blue.png"; // Import a default image

async function generateTracks() {
  const tracks = [];

  for (const [key, src] of Object.entries(audio)) {
    try {
      const metadata = await mm.parseBlob(
        await fetch(src).then((res) => res.blob()),
      );

      const track = {
        title: metadata.common.title || "Unknown Title",
        artist: metadata.common.artist || "Unknown Artist",
        bitrate: Math.round(metadata.format.bitrate / 1000) || 0,
        length: Math.round(metadata.format.duration) || 0,
        audioSrc: src,
        image:
          images[key.toLowerCase()] ||
          metadata.common.picture?.[0]?.data ||
          defaultImage,
        color: getContrastColor(),
      };

      tracks.push(track);
    } catch (error) {
      console.error(`Error parsing metadata for ${key}:`, error.message);
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

export default generateTracks();
