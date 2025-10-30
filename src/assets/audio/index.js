// Import audio files as URLs using Vite's glob import (query + import)
const audioFiles = import.meta.glob('./*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

// Process the imported audio files into a clean object
const processedAudio = Object.entries(audioFiles).reduce((acc, [path, url]) => {
  // Extract filename without extension and remove special characters
  const key = path
    .replace('./', '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  acc[key] = url;
  return acc;
}, {});

export default processedAudio;

