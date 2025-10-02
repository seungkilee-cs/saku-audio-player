import * as mm from "music-metadata";
import images from "../img";
import audio from "../audio";
import defaultImage from "../img/pale_blue.png";

async function generateTracks() {
  const entries = Object.entries(audio);

  const trackPromises = entries.map(async ([key, src]) => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const metadata = await mm.parseBlob(blob);

      const imageData = metadata.common.picture?.[0];
      const image = imageData
        ? `data:${imageData.format};base64,${arrayBufferToBase64(imageData.data)}`
        : images[key.toLowerCase()] || defaultImage;

      const bitrateKbps = metadata.format.bitrate
        ? Math.round(metadata.format.bitrate / 1000)
        : undefined;
      const durationSeconds = metadata.format.duration
        ? Math.round(metadata.format.duration)
        : undefined;
      const sampleRateValue = metadata.format.sampleRate;
      const sampleRateDisplay = sampleRateValue
        ? `${stripTrailingZero((sampleRateValue / 1000).toFixed(1))} kHz`
        : "Unknown Sample Rate";
      const bitsPerSample = metadata.format.bitsPerSample
        ? `${metadata.format.bitsPerSample}-bit`
        : undefined;

      const detailedBitSampleInfo = [sampleRateDisplay, bitsPerSample]
        .filter(Boolean)
        .join(" • ");

      const fileExtension = src.split(".").pop()?.toLowerCase() ?? "";

      return {
        title: metadata.common.title || "Unknown Title",
        artist: metadata.common.artist || "Unknown Artist",
        album: metadata.common.album || "Unknown Album",
        bitrate: bitrateKbps ?? 0,
        length: durationSeconds ?? 0,
        audioSrc: src,
        image,
        color: getContrastColor(),
        container: metadata.format.container || "Unknown Container",
        codec: metadata.format.codec || "Unknown Audio Codec",
        bitsPerSample: bitsPerSample || "Unknown Bit Depth",
        sampleRate: sampleRateDisplay,
        detailedBitSampleInfo: detailedBitSampleInfo || sampleRateDisplay,
        fileExtension,
      };
    } catch (error) {
      console.error(`Error parsing metadata for ${key}:`, error.message);
      return null;
    }
  });

  const tracks = await Promise.all(trackPromises);
  return tracks.filter(Boolean);
}

function arrayBufferToBase64(buffer) {
  if (!buffer) {
    return "";
  }

  const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

function stripTrailingZero(value) {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

function getContrastColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.random() * 30;
  const lightness = 30 + Math.random() * 40;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default generateTracks();
