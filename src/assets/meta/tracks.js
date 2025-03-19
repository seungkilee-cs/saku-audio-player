import * as mm from "music-metadata";
import images from "../img";
import audio from "../audio";
import defaultImage from "../img/pale_blue.png";
// import path from "path";

async function generateTracks() {
  const tracks = [];

  for (const [key, src] of Object.entries(audio)) {
    try {
      const metadata = await mm.parseBlob(
        await fetch(src).then((res) => res.blob()),
      );

      // Safely handle image extraction
      const imageData = metadata.common.picture?.[0];
      const image = imageData
        ? `data:${imageData.format};base64,${imageData.data.toString("base64")}`
        : images[key.toLowerCase()] || defaultImage;

      const bitsPerSample =
        metadata.format.bitsPerSample || "Unknown Bit Depth";
      const sampleRate = metadata.format.sampleRate
        ? `${metadata.format.sampleRate / 1000} kHz`
        : "Unknown Sample Rate";

      // Combine details for display
      const detailedBitSampleInfo = `${sampleRate}`;

      // const fileExtension = path.extname(filePath).substring(1).toLowerCase(); // Removes the dot and converts to uppercase

      const track = {
        title: metadata.common.title || "Unknown Title",
        artist: metadata.common.artist || "Unknown Artist",
        album: metadata.common.album || "Unknown Album",
        bitrate: Math.round(metadata.format.bitrate / 1000) || 0,
        length: Math.round(metadata.format.duration) || 0,
        audioSrc: src,
        image: image,
        color: getContrastColor(),
        container: metadata.format.container || "Unknown Container",
        code: metadata.format.codec || "Unknown Audio Codec",
        // fileExtension: fileExtension || "Unknown File Format",
        bitsPerSample: bitsPerSample,
        sampleRate:
          `${metadata.format.sampleRate / 1000} kHz` || "Unknown Sample Rate",
        detailedBitSampleInfo: detailedBitSampleInfo,
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
