const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "flac",
  "m4a",
  "aac",
  "ogg",
  "wma",
]);

function isSupportedAudioName(name = "") {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_AUDIO_EXTENSIONS.has(extension);
}

function normalizeFiles(filesLike) {
  if (!filesLike) {
    return [];
  }
  if (Array.isArray(filesLike)) {
    return filesLike;
  }
  return Array.from(filesLike);
}

function readAllEntries(directoryReader) {
  return new Promise((resolve, reject) => {
    const entries = [];

    const readBatch = () => {
      directoryReader.readEntries((batch) => {
        if (!batch.length) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    };

    readBatch();
  });
}

async function collectFromEntry(entry) {
  if (!entry) {
    return [];
  }

  if (entry.isFile) {
    if (!isSupportedAudioName(entry.name)) {
      return [];
    }

    return new Promise((resolve, reject) => {
      entry.file(
        (file) => {
          resolve(isSupportedAudioName(file.name) ? [file] : []);
        },
        (error) => {
          console.warn("Failed to read file entry", error);
          reject(error);
        },
      );
    }).catch(() => []);
  }

  if (entry.isDirectory) {
    try {
      const reader = entry.createReader();
      const subEntries = await readAllEntries(reader);
      const nestedFiles = await Promise.all(subEntries.map(collectFromEntry));
      return nestedFiles.flat();
    } catch (error) {
      console.warn("Failed to traverse directory entry", error);
      return [];
    }
  }

  return [];
}

export function filterSupportedAudioFiles(filesLike) {
  return normalizeFiles(filesLike).filter((file) => isSupportedAudioName(file.name));
}

export async function collectAudioFilesFromDataTransfer(dataTransfer) {
  if (!dataTransfer) {
    return [];
  }

  const items = Array.from(dataTransfer.items || []).filter((item) => item.kind === "file");
  const entries = items
    .map((item) => {
      if (typeof item.webkitGetAsEntry === "function") {
        return item.webkitGetAsEntry();
      }
      return null;
    })
    .filter(Boolean);

  if (entries.length === 0) {
    return filterSupportedAudioFiles(dataTransfer.files);
  }

  const fileGroups = await Promise.all(entries.map(collectFromEntry));
  const flattened = fileGroups.flat().filter(Boolean);

  if (flattened.length > 0) {
    return flattened;
  }

  return filterSupportedAudioFiles(dataTransfer.files);
}

export { SUPPORTED_AUDIO_EXTENSIONS };
