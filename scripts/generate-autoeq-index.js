import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_INPUT_DIR = path.resolve(__dirname, "../../data/AutoEq/results");
const OUTPUT_PATH = path.join(__dirname, "../public/autoeq-index.json");

const PARAMETRIC_FILE_PATTERN = /ParametricEQ\.txt$/i;
const SOURCE_LIMIT = Number.parseInt(process.env.AUTOEQ_MAX_SOURCES ?? "0", 10);
const TYPE_LIMIT = Number.parseInt(process.env.AUTOEQ_MAX_TYPES ?? "0", 10);
const MODEL_LIMIT = Number.parseInt(process.env.AUTOEQ_MAX_MODELS ?? "0", 10);
const DEBUG = process.env.DEBUG === "true";

function debug(...args) {
  if (DEBUG) {
    console.log("[DEBUG]", ...args);
  }
}

function toId({ source, type, model, target }) {
  const slug = [source, type, model, target]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `autoeq-${Date.now()}`;
}

function parseFilePath(rootDir, filePath) {
  if (!PARAMETRIC_FILE_PATTERN.test(filePath)) {
    return null;
  }

  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const parts = relativePath.split("/");
  if (parts.length < 3) {
    return null;
  }

  const [source, type, ...modelParts] = parts;
  const fileName = modelParts.pop();
  if (!PARAMETRIC_FILE_PATTERN.test(fileName)) {
    return null;
  }

  const model = modelParts.length > 0 ? modelParts.join("/") : fileName.replace(PARAMETRIC_FILE_PATTERN, "").trim();
  const target = modelParts.length > 0 ? modelParts[modelParts.length - 1] : model;

  return {
    source,
    type,
    model,
    target,
    path: `results/${relativePath}`,
  };
}

function walkDirectory(rootDir) {
  const entries = [];
  const sourceNames = filterDirs(readdirSync(rootDir), rootDir, SOURCE_LIMIT);

  for (const sourceName of sourceNames) {
    const sourceDir = path.join(rootDir, sourceName);
    const typeNames = filterDirs(readdirSync(sourceDir), sourceDir, TYPE_LIMIT);

    for (const typeName of typeNames) {
      const typeDir = path.join(sourceDir, typeName);
      let processed = 0;
      const stack = [typeDir];

      while (stack.length > 0) {
        const currentDir = stack.pop();
        const childNames = readdirSync(currentDir).sort();

        for (const childName of childNames) {
          const childPath = path.join(currentDir, childName);
          if (statSync(childPath).isDirectory()) {
            stack.push(childPath);
            continue;
          }

          const parsed = parseFilePath(rootDir, childPath);
          if (!parsed) {
            continue;
          }

          entries.push(parsed);
          processed += 1;

          if (MODEL_LIMIT > 0 && processed >= MODEL_LIMIT) {
            break;
          }
        }

        if (MODEL_LIMIT > 0 && processed >= MODEL_LIMIT) {
          break;
        }
      }
    }
  }

  return entries;
}

function filterDirs(items, baseDir, limit) {
  const directories = items
    .map((item) => ({ name: item, path: path.join(baseDir, item) }))
    .filter(({ path: absolute }) => {
      try {
        return statSync(absolute).isDirectory();
      } catch {
        return false;
      }
    })
    .map(({ name }) => name)
    .sort();

  if (limit > 0) {
    return directories.slice(0, limit);
  }
  return directories;
}

function collectParametricFilesLocal(rootDir) {
  const resolved = path.resolve(rootDir);
  debug(`Reading AutoEQ results from ${resolved}`);
  return walkDirectory(resolved);
}

function buildIndex(entries) {
  const startTime = Date.now();
  debug(`Building index from ${entries.length} entries...`);
  
  const records = entries.map((entry) => ({
    id: toId(entry),
    name: entry.model.replace(/\//g, " / "),
    source: entry.source,
    type: entry.type,
    target: entry.target,
    path: entry.path,
  }));
  
  debug(`Parsed ${records.length} valid entries`);
  
  records.sort((a, b) => a.name.localeCompare(b.name));
  
  const sources = Array.from(new Set(records.map((item) => item.source))).sort();
  const types = Array.from(new Set(records.map((item) => item.type))).sort();
  const targets = Array.from(new Set(records.map((item) => item.target))).sort();
  
  debug(`Sources: ${sources.join(", ")}`);
  debug(`Types: ${types.join(", ")}`);
  debug(`Targets: ${targets.join(", ")}`);
  
  const elapsed = Date.now() - startTime;
  debug(`Index built in ${elapsed}ms`);
  
  return {
    version: new Date().toISOString(),
    total: records.length,
    sources,
    types,
    targets,
    headphones: records,
  };
}

function ensureOutputDir() {
  const dir = path.dirname(OUTPUT_PATH);
  if (!existsSync(dir)) {
    debug(`Creating output directory: ${dir}`);
    mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const totalStart = Date.now();
  
  try {
    const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT_DIR;
    if (!existsSync(inputDir)) {
      throw new Error(`Input directory not found: ${inputDir}`);
    }

    console.log(`Generating AutoEQ index from ${inputDir} ...`);
    const entries = collectParametricFilesLocal(inputDir);
    console.log(`Discovered ${entries.length} ParametricEQ entries, building index...`);
    
    const index = buildIndex(entries);
    
    ensureOutputDir();
    
    const jsonStart = Date.now();
    writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
    debug(`JSON written in ${Date.now() - jsonStart}ms`);
    
    const totalElapsed = Date.now() - totalStart;
    console.log(`✓ Saved index with ${index.total} presets to ${OUTPUT_PATH}`);
    console.log(`✓ Total execution time: ${totalElapsed}ms (${(totalElapsed / 1000).toFixed(2)}s)`);
    
  } catch (error) {
    console.error("Failed to generate AutoEQ index:", error);
    process.exitCode = 1;
  }
}

main();
