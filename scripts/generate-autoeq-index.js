import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_INPUT_DIR = path.resolve(__dirname, "../data/AutoEq/results");
const OUTPUT_PATH = path.join(__dirname, "../public/autoeq-index.json");

const PARAMETRIC_FILE_PATTERN = /ParametricEQ\.txt$/i;
const SOURCE_LIMIT = Number.parseInt(process.env.AUTOEQ_MAX_SOURCES ?? "0", 10);
const TYPE_LIMIT = Number.parseInt(process.env.AUTOEQ_MAX_TYPES ?? "0", 10);
const MODEL_LIMIT = Number.parseInt(process.env.AUTOEQ_MAX_MODELS ?? "0", 10);
const DEBUG = process.env.DEBUG === "true";

function debug(...args) {
  if (DEBUG) {
    console.log("[DEBUG]", new Date().toISOString(), ...args);
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
  console.log(`\nBuilding index from ${entries.length} files...`);
  
  const records = entries.map((entry) => ({
    id: toId(entry),
    name: entry.model.replace(/\//g, " / "),
    source: entry.source,
    type: entry.type,
    target: entry.target,
    path: entry.path,
  }));
  
  debug(`Parsed ${records.length} valid entries (${entries.length - records.length} filtered)`);
  
  records.sort((a, b) => a.name.localeCompare(b.name));
  
  const sources = Array.from(new Set(records.map((item) => item.source))).sort();
  const types = Array.from(new Set(records.map((item) => item.type))).sort();
  const targets = Array.from(new Set(records.map((item) => item.target))).sort();
  
  console.log(`  Sources: ${sources.join(", ")}`);
  console.log(`  Types: ${types.join(", ")}`);
  console.log(`  Targets: ${targets.length} unique`);
  
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
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         AutoEQ Index Generator (Local File System)        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  try {
    const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT_DIR;
    
    if (!existsSync(inputDir)) {
      throw new Error(
        `Input directory not found: ${inputDir}\n\n` +
        `Please ensure the AutoEq repository is cloned:\n` +
        `  npm run autoeq:sync\n\n` +
        `Or manually:\n` +
        `  git clone --filter=blob:none --sparse --no-checkout \\\n` +
        `    https://github.com/jaakkopasanen/AutoEq.git data/AutoEq\n` +
        `  cd data/AutoEq\n` +
        `  git sparse-checkout init --no-cone\n` +
        `  git sparse-checkout set "results/**/*ParametricEQ.txt"\n` +
        `  git checkout master`
      );
    }

    console.log(`Input path:  ${inputDir}`);
    console.log(`Output path: ${OUTPUT_PATH}`);
    
    // Show limits if any are configured
    if (SOURCE_LIMIT > 0 || TYPE_LIMIT > 0 || MODEL_LIMIT > 0) {
      console.log("\nLimits configured:");
      if (SOURCE_LIMIT > 0) console.log(`  Max sources: ${SOURCE_LIMIT}`);
      if (TYPE_LIMIT > 0) console.log(`  Max types:   ${TYPE_LIMIT}`);
      if (MODEL_LIMIT > 0) console.log(`  Max models:  ${MODEL_LIMIT}`);
    }
    
    console.log("\n📂 Scanning for *ParametricEQ.txt files...");
    const entries = collectParametricFilesLocal(inputDir);
    console.log(`✓ Found ${entries.length} ParametricEQ files`);
    
    if (entries.length === 0) {
      throw new Error(
        `No ParametricEQ.txt files found in ${inputDir}\n\n` +
        `Verify sparse-checkout configuration:\n` +
        `  cd data/AutoEq\n` +
        `  git sparse-checkout list`
      );
    }
    
    const index = buildIndex(entries);
    
    console.log(`\n📝 Writing to ${OUTPUT_PATH}...`);
    ensureOutputDir();
    
    const jsonStart = Date.now();
    writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
    debug(`JSON written in ${Date.now() - jsonStart}ms`);
    
    const totalElapsed = Date.now() - totalStart;
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                    ✓ SUCCESS                               ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`Presets:         ${index.total}`);
    console.log(`Sources:         ${index.sources.length} (${index.sources.join(", ")})`);
    console.log(`Types:           ${index.types.length} (${index.types.join(", ")})`);
    console.log(`Output:          ${OUTPUT_PATH}`);
    console.log(`Timestamp:       ${index.version}`);
    console.log(`Execution time:  ${totalElapsed}ms (${(totalElapsed / 1000).toFixed(2)}s)\n`);
    
  } catch (error) {
    console.error("\n╔════════════════════════════════════════════════════════════╗");
    console.error("║                    ✗ FAILED                                ║");
    console.error("╚════════════════════════════════════════════════════════════╝");
    console.error(`Error: ${error.message}\n`);
    
    if (DEBUG) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    
    process.exitCode = 1;
  }
}

main();
