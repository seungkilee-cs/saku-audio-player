import { readdirSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// CONFIGURATION
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to sparse AutoEq clone
const AUTOEQ_REPO_PATH = path.join(__dirname, "../../AutoEq");
const RESULTS_PATH = path.join(AUTOEQ_REPO_PATH, "results");
const OUTPUT_PATH = path.join(__dirname, "../public/autoeq-index.json");

const PARAMETRIC_FILE_PATTERN = /ParametricEQ\.txt$/i;
const DEBUG = process.env.DEBUG === "true";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function debug(...args) {
  if (DEBUG) {
    console.log("[DEBUG]", new Date().toISOString(), ...args);
  }
}

/**
 * Recursively find all files matching pattern
 * @param {string} dir - Directory to walk
 * @param {RegExp} pattern - Pattern to match files
 * @returns {Array<string>} Array of absolute file paths
 */
function findFilesRecursive(dir, pattern) {
  const results = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        results.push(...findFilesRecursive(fullPath, pattern));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        // File matches pattern
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not read directory ${dir}:`, error.message);
  }
  
  return results;
}

/**
 * Generate unique ID from path components
 * @param {Object} entry - Parsed entry object
 * @returns {string} Unique identifier
 */
function toId({ source, type, model, target }) {
  const slug = [source, type, model, target]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  return slug || `autoeq-${Date.now()}`; // Fallback to timestamp
}

/**
 * Parse file path into structured metadata
 * Expected: {repo}/results/{source}/{type}/{model}/Model Name ParametricEQ.txt
 * 
 * @param {string} filePath - Absolute file path
 * @returns {Object|null} Parsed metadata
 */
function parseFilePath(filePath) {
  // Get relative path from results directory
  const relativePath = path.relative(RESULTS_PATH, filePath);
  
  // Convert to forward slashes for consistency (Windows compatibility)
  const normalizedPath = relativePath.split(path.sep).join("/");
  
  const parts = normalizedPath.split("/");
  
  // Minimum: source/type/model/Model ParametricEQ.txt (4 parts)
  if (parts.length < 3) {
    debug(`Skipping invalid path (too short): ${normalizedPath}`);
    return null;
  }
  
  const fileName = parts[parts.length - 1];
  if (!PARAMETRIC_FILE_PATTERN.test(fileName)) {
    return null;
  }
  
  const source = parts[0]; // e.g., "oratory1990"
  const type = parts[1]; // e.g., "over-ear"
  
  // Model is everything between type and filename
  // For nested paths: source/type/subfolder/model/Model ParametricEQ.txt
  // For flat paths: source/type/Model ParametricEQ.txt
  const modelSegments = parts.slice(2, parts.length - 1);
  
  // If there are path segments before the filename, use them
  // Otherwise extract model name from filename
  let model;
  if (modelSegments.length > 0) {
    model = modelSegments.join("/");
  } else {
    // Extract model from filename by removing " ParametricEQ.txt"
    model = fileName.replace(/\s*ParametricEQ\.txt$/i, "").trim();
  }
  
  // Target is typically the last model segment or the model itself
  const target = modelSegments.length > 0
    ? modelSegments[modelSegments.length - 1]
    : model;
  
  return {
    source,
    type,
    target,
    model,
    path: `results/${normalizedPath}`, // Store relative path for GitHub URLs
  };
}

/**
 * Build index from file paths
 * @param {Array<string>} filePaths - Array of file paths
 * @returns {Object} Index object ready for JSON serialization
 */
function buildIndex(filePaths) {
  const startTime = Date.now();
  console.log(`\nBuilding index from ${filePaths.length} files...`);
  
  // Parse all file paths
  const records = filePaths
    .map(parseFilePath)
    .filter(Boolean) // Remove null values
    .map((entry) => ({
      id: toId(entry),
      name: entry.model.replace(/\//g, " / "), // Make nested paths readable
      source: entry.source,
      type: entry.type,
      target: entry.target,
      path: entry.path,
    }));
  
  debug(`Parsed ${records.length} valid entries (${filePaths.length - records.length} filtered)`);
  
  // Sort alphabetically by name
  records.sort((a, b) => a.name.localeCompare(b.name));
  
  // Extract unique metadata for filtering UI
  const sources = Array.from(new Set(records.map((item) => item.source))).sort();
  const types = Array.from(new Set(records.map((item) => item.type))).sort();
  const targets = Array.from(new Set(records.map((item) => item.target))).sort();
  
  console.log(`  Sources: ${sources.join(", ")}`);
  console.log(`  Types: ${types.join(", ")}`);
  console.log(`  Targets: ${targets.length} unique`);
  
  const elapsed = Date.now() - startTime;
  console.log(`✓ Index built in ${elapsed}ms`);
  
  return {
    version: new Date().toISOString(), // Timestamp for cache invalidation
    total: records.length,
    sources,
    types,
    targets,
    headphones: records,
  };
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  const dir = path.dirname(OUTPUT_PATH);
  if (!existsSync(dir)) {
    debug(`Creating output directory: ${dir}`);
    mkdirSync(dir, { recursive: true });
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const totalStart = Date.now();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         AutoEQ Index Generator (Local File System)        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  try {
    // Verify AutoEq repository exists
    if (!existsSync(AUTOEQ_REPO_PATH)) {
      throw new Error(
        `❌ AutoEq repository not found at: ${AUTOEQ_REPO_PATH}\n\n` +
        `Please run the sync script first:\n` +
        `  npm run autoeq:sync\n\n` +
        `Or manually clone with sparse checkout:\n` +
        `  git clone --filter=blob:none --sparse --no-checkout \\\n` +
        `    https://github.com/jaakkopasanen/AutoEq.git data/AutoEq\n` +
        `  cd data/AutoEq\n` +
        `  git sparse-checkout init --no-cone\n` +
        `  git sparse-checkout set "results/**/*ParametricEQ.txt"\n` +
        `  git checkout master`
      );
    }
    
    if (!existsSync(RESULTS_PATH)) {
      throw new Error(
        `❌ Results directory not found: ${RESULTS_PATH}\n\n` +
        `The sparse checkout may not be configured correctly.\n` +
        `Expected structure: data/AutoEq/results/`
      );
    }
    
    console.log(`Repository:  ${AUTOEQ_REPO_PATH}`);
    console.log(`Results:     ${RESULTS_PATH}`);
    console.log(`Output:      ${OUTPUT_PATH}\n`);
    
    // Step 1: Find all ParametricEQ.txt files
    console.log("📂 Scanning for *ParametricEQ.txt files...");
    const filePaths = findFilesRecursive(RESULTS_PATH, PARAMETRIC_FILE_PATTERN);
    console.log(`✓ Found ${filePaths.length} ParametricEQ files`);
    
    if (filePaths.length === 0) {
      throw new Error(
        `❌ No ParametricEQ.txt files found in ${RESULTS_PATH}\n\n` +
        `The sparse checkout may not have downloaded any files.\n` +
        `Verify your sparse-checkout pattern:\n` +
        `  cd data/AutoEq\n` +
        `  git sparse-checkout list`
      );
    }
    
    // Step 2: Build index
    const index = buildIndex(filePaths);
    
    // Step 3: Write to file
    console.log(`\n📝 Writing to ${OUTPUT_PATH}...`);
    ensureOutputDir();
    
    const jsonStart = Date.now();
    writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
    const jsonSize = (writeFileSync.length / 1024).toFixed(2);
    debug(`JSON written in ${Date.now() - jsonStart}ms`);
    
    // Success summary
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
    console.error(`${error.message}\n`);
    
    if (DEBUG) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    
    process.exitCode = 1;
  }
}

main();
