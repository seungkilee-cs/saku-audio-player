import { convertAutoEqToNative, parseAutoEqText } from "../peqIO";
import { normalizePreset } from "../peqPresets";

function buildMetadata({ name, source, target, type, path, importedAt }) {
  return {
    name: name ?? null,
    source: source ?? null,
    target: target ?? null,
    type: type ?? null,
    path: path ?? null,
    importedAt: importedAt ?? new Date().toISOString(),
  };
}

export function parseAutoEqPresetFromText(text, metadata = {}) {
  if (!text || typeof text !== "string") {
    throw new Error("Expected AutoEQ preset text");
  }

  const autoEqData = parseAutoEqText(text);
  const presetName = metadata.name ?? autoEqData.name;
  const nativePreset = convertAutoEqToNative({
    ...autoEqData,
    name: presetName,
  });

  const normalized = normalizePreset({
    ...nativePreset,
    name: presetName,
    source: metadata.source ?? nativePreset.source ?? "autoeq",
    target: metadata.target ?? null,
    deviceType: metadata.type ?? null,
    autoEqPath: metadata.path ?? null,
  });

  return {
    preset: normalized,
    metadata: buildMetadata({
      name: presetName,
      source: metadata.source ?? null,
      target: metadata.target ?? null,
      type: metadata.type ?? null,
      path: metadata.path ?? null,
      importedAt: metadata.importedAt,
    }),
  };
}

export function applyPresetMetadata(preset, metadata = {}) {
  return normalizePreset({
    ...preset,
    source: metadata.source ?? preset.source ?? "autoeq",
    target: metadata.target ?? preset.target ?? null,
    deviceType: metadata.type ?? preset.deviceType ?? null,
    autoEqPath: metadata.path ?? preset.autoEqPath ?? null,
    importDate: metadata.importedAt ?? preset.importDate ?? new Date().toISOString(),
  });
}
