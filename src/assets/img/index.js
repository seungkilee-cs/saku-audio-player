const images = import.meta.glob("./*.{png,jpg,jpeg,svg,webp}", { eager: true });

const processedImages = Object.entries(images).reduce((acc, [path, module]) => {
  const key = path.replace("./", "").replace(/\.[^/.]+$/, "");
  acc[key] = module.default;
  return acc;
}, {});

export default processedImages;
