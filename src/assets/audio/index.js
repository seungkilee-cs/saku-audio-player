const audio = import.meta.glob("./*.{mp3,m4a,flac}", { eager: true });

const processedAudio = Object.entries(audio).reduce((acc, [path, module]) => {
  const key = path
    .replace("./", "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  acc[key] = module.default;
  return acc;
}, {});

export default processedAudio;
