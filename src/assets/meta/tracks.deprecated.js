import * as mm from "music-metadata";
import images from "../img";
import audio from "../audio";
// import defaultImage from "../img/pale_blue.png";

export async function loadBundledTracks() {
  const entries = Object.entries(audio);
  const trackPromises = entries.map(async ([key, src]) =>
    parseSource({
      key,
      src,
      blobResolver: () => fetch(src).then((response) => response.blob()),
      fallbackImage: images[key.toLowerCase()] || defaultImage,
      sourceType: "bundled",
    }),
  );

  const tracks = await Promise.all(trackPromises);
  return tracks.filter(Boolean);
}

export async function parseAudioFiles(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) {
    return [];
  }

  // Filter for audio files
  const audioFiles = files.filter(file => {
    const extension = getFileExtension(file.name).toLowerCase();
    return ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'].includes(extension);
  });

  if (audioFiles.length === 0) {
    console.warn('No supported audio files found in selection');
    return [];
  }

  const trackPromises = audioFiles.map((file) =>
    parseSource({
      key: file.name,
      src: URL.createObjectURL(file),
      blobResolver: () => file,
      fallbackImage: null,
      sourceType: "uploaded",
    }),
  );

  const tracks = await Promise.all(trackPromises);
  const validTracks = tracks.filter(Boolean);
  
  console.log(`Successfully processed ${validTracks.length} out of ${audioFiles.length} audio files`);
  return validTracks;
}

async function parseSource({ key, src, blobResolver, fallbackImage, sourceType }) {
  try {
    const blob = await blobResolver();
    let metadata;
    
    try {
      // Check if mm is available and has parseBlob method
      if (mm && typeof mm.parseBlob === 'function') {
        metadata = await mm.parseBlob(blob);
      } else {
        throw new Error('music-metadata not available');
      }
    } catch (metadataError) {
      console.warn(`Metadata parsing failed for ${key}, using fallback:`, metadataError.message);
      
      // Try to get basic file info
      const fileExtension = getFileExtension(key).toLowerCase();
      const fileName = key.replace(/\.[^/.]+$/, ""); // Remove file extension
      
      // Create fallback metadata with basic file info
      metadata = {
        common: {
          title: fileName,
          artist: "Unknown Artist",
          album: "Unknown Album",
          picture: null
        },
        format: {
          duration: null, // Will be detected by audio element
          bitrate: null,
          sampleRate: null,
          container: fileExtension.toUpperCase(),
          codec: fileExtension === 'mp3' ? 'MP3' : 'Unknown'
        }
      };
    }

    const imageData = metadata.common.picture?.[0];
    const image = imageData
      ? `data:${imageData.format};base64,${arrayBufferToBase64(imageData.data)}`
      : fallbackImage;

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
      id: generateTrackId(key),
      title: metadata.common.title || key,
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
      sourceType,
      objectUrl: sourceType === "uploaded" ? src : undefined,
    };
  } catch (error) {
    console.error(`Error parsing metadata for ${key}:`, error.message);
    return null;
  }
}

function getFileExtension(filename) {
  return filename.split('.').pop() || 'unknown';
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

function generateTrackId(seed) {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${seed
    .toString()
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
}
