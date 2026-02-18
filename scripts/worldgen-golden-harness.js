/**
 * scripts/worldgen-golden-harness.js
 *
 * Node-friendly CLI harness to validate deterministic world generation by comparing tile-hash
 * outputs against a committed golden set. This script is the enforcement pickaxe for our
 * Three‑Wide law of determinism.
 *
 * Cross references:
 * - docs/world-generation/cave-gen-algorithm.md §12 (hash composition and worldgen API)
 * - docs/world-generation/cave-gen-algorithm.md §16 (Golden-hash plan)
 *
 * CI guidance:
 * - Add an npm script: "test:worldgen": "node scripts/worldgen-golden-harness.js --mode check"
 * - Wire to CI so that any mismatch fails the build.
 * - To refresh after intentional changes: run with --mode update and commit the updated goldens.
 *
 * Example (programmatic) usage:
 *   import { runHarness } from "./scripts/worldgen-golden-harness.js";
 *   const { ok, results } = await runHarness({ mode: "list", seeds: [1,2,3], w: 96, h: 64 });
 *   if (!ok) { /* handle */ }
 *
 * CLI usage:
 *   node scripts/worldgen-golden-harness.js [--seeds 1,2,3] [--w 96] [--h 64]
 *       [--biome biome.crystal_caverns] [--mode check|update|list|diff]
 */

import { generateLevel } from "../src/worldgen/generate-level.js";
import biomeCrystal from "../data/world/biome-crystal-caverns.json" assert { type: "json" };
import goldens from "../data/world/golden-hashes.json" assert { type: "json" };
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/** Default seed set we enforce for determinism checks. */
export const DEFAULT_SEEDS = [1, 2, 3, 1337, 9001];
/** Default map size used for hashing unless overridden by CLI. */
export const DEFAULT_SIZE = { w: 96, h: 64 };
/** Absolute path to the committed golden file. */
export const GOLDEN_PATH = path.resolve(new URL("../data/world/golden-hashes.json", import.meta.url).pathname);

/** Version for the golden file schema produced by this harness. */
const GOLDEN_VERSION = 1;
/** Default biome id for MVP. */
const DEFAULT_BIOME_ID = "biome.crystal_caverns";

/** TextEncoder instance for UTF-8 encoding. */
const TE = new TextEncoder();

/**
 * Compute 32-bit FNV-1a hash of a string or Uint8Array.
 * - Offset basis: 0x811c9dc5
 * - Prime: 0x01000193
 * Returns unsigned 32-bit integer.
 * @param {string|Uint8Array} strOrUint8
 * @returns {number}
 */
export function fnv1a32(strOrUint8) {
  let data = strOrUint8 instanceof Uint8Array ? strOrUint8 : TE.encode(String(strOrUint8));
  let hash = 0x811c9dc5 >>> 0;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    // 32-bit overflow is deliberate
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Convert unsigned 32-bit int to 8-character lowercase hex string.
 * @param {number} u32
 * @returns {string}
 */
function toHex8(u32) {
  return (u32 >>> 0).toString(16).padStart(8, "0");
}

/**
 * Resolve a biome by id. MVP maps only "biome.crystal_caverns".
 * Future: dynamic load by id.
 * @param {string} biomeId
 * @returns {{ id: string, [k: string]: any }}
 */
function resolveBiome(biomeId) {
  if (biomeId === DEFAULT_BIOME_ID) {
    return biomeCrystal;
  }
  throw new Error(`Unsupported biomeId "${biomeId}". MVP maps only "${DEFAULT_BIOME_ID}".`);
}

/**
 * Validate biome JSON for minimal structural expectations, not full schema.
 * Throws on obvious shape errors. Warns on unusual corridor method.
 * References docs §11 hints (keys: id, name, tiles.rock.hardness, corridors.method).
 * @param {any} obj
 */
export function validateBiomeShape(obj) {
  if (!obj || typeof obj !== "object") {
    throw new Error("Biome JSON must be an object.");
  }
  if (typeof obj.id !== "string" || !obj.id) {
    throw new Error("Biome must have a non-empty string 'id'.");
  }
  if (typeof obj.name !== "string" || !obj.name) {
    throw new Error(`Biome '${obj.id}' must have a non-empty string 'name'.`);
  }
  if (!obj.tiles || typeof obj.tiles !== "object") {
    throw new Error(`Biome '${obj.id}' must include a 'tiles' object.`);
  }
  if (!obj.tiles.rock || typeof obj.tiles.rock !== "object") {
    throw new Error(`Biome '${obj.id}' must include 'tiles.rock' object.`);
  }
  const rh = obj.tiles.rock.hardness;
  if (typeof rh !== "number" || !Number.isFinite(rh)) {
    throw new Error(`Biome '${obj.id}' must define numeric 'tiles.rock.hardness'.`);
  }
  if (obj.corridors) {
    const m = obj.corridors.method;
    const allowed = new Set(["astar", "manhattan"]);
    if (typeof m !== "string" || !m) {
      console.warn(`Warning: biome '${obj.id}' has no 'corridors.method' string; proceeding.`);
    } else if (!allowed.has(m)) {
      console.warn(`Warning: biome '${obj.id}' corridors.method='${m}' is unusual (expected 'astar' or 'manhattan'); proceeding.`);
    }
  }
}

/**
 * Validate room-templates JSON for minimal structure. Throws on shape errors.
 * Ensures presence of 'version', 'templates' array, and per template:
 * id, name, rotate, grid, doors. Grid must be rectangular and contain only '#', '.', 'D', 'O', ' '.
 * @returns {Promise<void>}
 */
export async function validateRoomTemplatesShape() {
  let roomTemplates;
  try {
    // Dynamic import with assertion; Node >= 18 supports this.
    const mod = await import("../data/world/room-templates.json", { assert: { type: "json" } });
    roomTemplates = mod.default ?? mod;
  } catch (e) {
    throw new Error(`Failed to import room-templates.json: ${e && e.message ? e.message : String(e)}`);
  }
  if (!roomTemplates || typeof roomTemplates !== "object") {
    throw new Error("room-templates.json must be a JSON object.");
  }
  if (!("version" in roomTemplates)) {
    throw new Error("room-templates.json missing 'version'.");
  }
  if (!Array.isArray(roomTemplates.templates)) {
    throw new Error("room-templates.json must include a 'templates' array.");
  }
  const allowedChars = new Set(["#", ".", "D", "O", " "]);
  for (const [i, t] of roomTemplates.templates.entries()) {
    if (!t || typeof t !== "object") {
      throw new Error(`Template at index ${i} must be an object.`);
    }
    if (typeof t.id !== "string" || !t.id) {
      throw new Error(`Template at index ${i} missing string 'id'.`);
    }
    if (typeof t.name !== "string" || !t.name) {
      throw new Error(`Template '${t.id}' missing string 'name'.`);
    }
    if (!("rotate" in t)) {
      throw new Error(`Template '${t.id}' missing 'rotate' property.`);
    }
    if (!Array.isArray(t.grid) || t.grid.length === 0) {
      throw new Error(`Template '${t.id}' must define non-empty 'grid' array of strings.`);
    }
    const width = t.grid[0].length;
    if (width === 0) {
      throw new Error(`Template '${t.id}' grid rows must be non-empty.`);
    }
    for (const [rowIndex, row] of t.grid.entries()) {
      if (typeof row !== "string") {
        throw new Error(`Template '${t.id}' grid row ${rowIndex} must be a string.`);
      }
      if (row.length !== width) {
        throw new Error(`Template '${t.id}' grid must be rectangular (row ${rowIndex} length ${row.length} != ${width}).`);
      }
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (!allowedChars.has(ch)) {
          throw new Error(`Template '${t.id}' grid contains invalid char '${ch}' at row ${rowIndex}, col ${c}. Allowed: # . D O space`);
        }
      }
    }
    if (!Array.isArray(t.doors)) {
      throw new Error(`Template '${t.id}' must include 'doors' array.`);
    }
  }
}

/**
 * Coerce a tile record to [tileTypeStr, hardnessNum, flagsUnsigned].
 * This is defensive against minor shape drift; it will fallback to defaults if needed.
 * @param {any} tile
 * @param {{ defaultType: string, defaultHardness: number, defaultFlags: number }} defaults
 * @returns {[string, number, number]}
 */
function coerceTileParts(tile, defaults) {
  let tileType =
    (tile && (tile.tileType ?? tile.type ?? tile.t)) != null
      ? String(tile.tileType ?? tile.type ?? tile.t)
      : defaults.defaultType;
  let hardnessRaw =
    (tile && (tile.hardness ?? tile.h)) != null
      ? (tile.hardness ?? tile.h)
      : defaults.defaultHardness;
  let hardness = Number.isFinite(hardnessRaw) ? Number(hardnessRaw) : defaults.defaultHardness;
  let flagsRaw =
    (tile && (tile.flags ?? tile.f)) != null
      ? (tile.flags ?? tile.f)
      : defaults.defaultFlags;
  let flags = (flagsRaw >>> 0);
  return [tileType, hardness, flags];
}

/**
 * Compute a stable FNV-1a hash across a tiles array in y-major (row-major) raster order.
 * Concatenates "tileType|hardness|flagsUnsigned" for each cell and mixes into one 32-bit hash.
 * If the tiles array is sparse or a cell is missing fields, falls back to defaults:
 *  - tileType: "rock"
 *  - hardness: biome.tiles.rock.hardness
 *  - flags: 0
 *
 * Returns an 8-character lowercase hex string.
 *
 * @param {Array<any>} tiles
 * @param {number} width
 * @param {number} height
 * @param {{ defaultType?: string, defaultHardness?: number, defaultFlags?: number }} [opts]
 * @returns {string}
 */
export function hashTiles(tiles, width, height, opts = {}) {
  if (!Array.isArray(tiles)) {
    throw new Error("hashTiles: tiles must be an array.");
  }
  const defaults = {
    defaultType: opts.defaultType ?? "rock",
    defaultHardness: typeof opts.defaultHardness === "number" ? opts.defaultHardness : 1,
    defaultFlags: typeof opts.defaultFlags === "number" ? opts.defaultFlags : 0
  };

  let h = 0x811c9dc5 >>> 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const t = tiles[idx];
      const [type, hard, flags] = coerceTileParts(t, defaults);
      const s = `${type}|${hard}|${flags >>> 0}`;
      const bytes = TE.encode(s);
      for (let i = 0; i < bytes.length; i++) {
        h ^= bytes[i];
        h = Math.imul(h, 0x01000193) >>> 0;
      }
    }
  }
  return toHex8(h);
}

/**
 * Parse CLI args.
 * Supported flags:
 *  --seeds 1,2,3
 *  --w 96
 *  --h 64
 *  --biome biome.crystal_caverns
 *  --mode check|update|list|diff
 * @param {string[]} argv
 * @returns {{ seeds: number[], w: number, h: number, biomeId: string, mode: "check"|"update"|"list"|"diff" }}
 */
function parseArgs(argv) {
  const out = {
    seeds: DEFAULT_SEEDS.slice(),
    w: DEFAULT_SIZE.w,
    h: DEFAULT_SIZE.h,
    biomeId: DEFAULT_BIOME_ID,
    mode: "check"
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seeds" && i + 1 < argv.length) {
      i++;
      const parts = String(argv[i]).split(/[, ]+/).filter(Boolean);
      const s = parts.map((p) => Number(p)).filter((n) => Number.isFinite(n));
      if (s.length === 0) throw new Error("Invalid --seeds value. Use comma-separated integers.");
      out.seeds = s;
    } else if (a === "--w" && i + 1 < argv.length) {
      i++;
      const n = Number(argv[i]);
      if (!Number.isInteger(n) || n <= 0) throw new Error("Invalid --w width.");
      out.w = n;
    } else if (a === "--h" && i + 1 < argv.length) {
      i++;
      const n = Number(argv[i]);
      if (!Number.isInteger(n) || n <= 0) throw new Error("Invalid --h height.");
      out.h = n;
    } else if (a === "--biome" && i + 1 < argv.length) {
      i++;
      out.biomeId = String(argv[i]);
    } else if (a === "--mode" && i + 1 < argv.length) {
      i++;
      const m = String(argv[i]);
      if (!["check", "update", "list", "diff"].includes(m)) {
        throw new Error("Invalid --mode. Use check|update|list|diff.");
      }
      out.mode = /** @type {"check"|"update"|"list"|"diff"} */ (m);
    } else if (a === "--help" || a === "-h") {
      printUsageAndExit(0);
    } else if (a.startsWith("--")) {
      throw new Error(`Unknown flag: ${a}`);
    }
  }
  return out;
}

/**
 * Print usage and exit with the given code.
 * @param {number} code
 */
function printUsageAndExit(code) {
  const usage = [
    "Usage: node scripts/worldgen-golden-harness.js [--seeds 1,2,3] [--w 96] [--h 64] [--biome biome.crystal_caverns] [--mode check|update|list|diff]",
    "",
    "Modes:",
    "  check  (default) Compare computed hashes to committed goldens; exit 1 on any mismatch.",
    "  update Recompute and write data/world/golden-hashes.json (seeds sorted asc).",
    "  list   Print computed hashes as JSON to stdout; does not touch files.",
    "  diff   Like check, but prints per-seed expected vs actual lines for mismatches; exits 1 on diffs."
  ].join("\n");
  console.log(usage);
  process.exit(code);
}

/**
 * Compute hashes for a set of seeds under the given options.
 * Ensures sequential generation to avoid accidental reseeding of substreams.
 * @param {{ seeds: number[], w: number, h: number, biomeId: string }} opts
 * @returns {Promise<Record<string, string>>} Hash map of seed->hex hash (8 lowercase hex digits)
 */
async function computeHashes(opts) {
  const { seeds, w, h, biomeId } = opts;
  const biome = resolveBiome(biomeId);
  validateBiomeShape(biome);
  await validateRoomTemplatesShape();

  // Establish defaults from biome for stable fallback.
  const defaultHardness = Number(biome?.tiles?.rock?.hardness);
  if (!Number.isFinite(defaultHardness)) {
    throw new Error(`Biome '${biomeId}' missing numeric tiles.rock.hardness required for hashing defaults.`);
  }

  /** @type {Record<string, string>} */
  const hashes = {};
  for (const seed of seeds) {
    let level;
    try {
      // generateLevel may be sync or async; await handles both.
      level = await generateLevel({ seed, w, h, biomeId });
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      throw new Error(`generateLevel failed for seed ${seed} (w=${w}, h=${h}, biomeId=${biomeId}): ${msg}`);
    }
    // Minimal shape check
    if (!level || typeof level !== "object" || !Array.isArray(level.tiles)) {
      throw new Error(`generateLevel returned invalid shape for seed ${seed}; expected { width, height, tiles[] }.`);
    }
    const lw = Number(level.width ?? w);
    const lh = Number(level.height ?? h);
    if (lw !== w || lh !== h) {
      // Some generators may return explicit sizes; trust returned values for hashing if mismatched, but warn.
      console.warn(`Warning: generateLevel returned width/height (${lw}x${lh}) differing from requested (${w}x${h}); hashing returned size.`);
    }
    const usedW = lw || w;
    const usedH = lh || h;

    const hash = hashTiles(level.tiles, usedW, usedH, {
      defaultType: "rock",
      defaultHardness: defaultHardness,
      defaultFlags: 0
    });
    hashes[String(seed)] = hash;
  }
  return hashes;
}

/**
 * Compare actual hashes against expected (goldens).
 * @param {Record<string, string>} actual map seed->hash
 * @param {{ version?: number, biomeId?: string, size?: { w: number, h: number }, seeds?: number[], hashes?: Record<string, string> }} expectedGolden
 * @param {{ biomeId: string, w: number, h: number, seeds: number[] }} context
 * @returns {{ diffs: Array<{ seed: number, expected?: string, actual?: string }>, metaMismatch: string[] }}
 */
function diffHashes(actual, expectedGolden, context) {
  const diffs = [];
  const metaMismatch = [];
  if (!expectedGolden || typeof expectedGolden !== "object") {
    metaMismatch.push("Golden file missing or invalid JSON object.");
    // Consider all seeds mismatched.
  } else {
    if (expectedGolden.version !== GOLDEN_VERSION) {
      metaMismatch.push(`Golden version ${expectedGolden.version} != harness version ${GOLDEN_VERSION}.`);
    }
    if (expectedGolden.biomeId && expectedGolden.biomeId !== context.biomeId) {
      metaMismatch.push(`Golden biomeId '${expectedGolden.biomeId}' != requested '${context.biomeId}'.`);
    }
    if (expectedGolden.size && (expectedGolden.size.w !== context.w || expectedGolden.size.h !== context.h)) {
      metaMismatch.push(`Golden size ${expectedGolden.size.w}x${expectedGolden.size.h} != requested ${context.w}x${context.h}.`);
    }
    if (Array.isArray(expectedGolden.seeds)) {
      const exp = expectedGolden.seeds.slice().sort((a, b) => a - b).map(Number);
      const got = context.seeds.slice().sort((a, b) => a - b).map(Number);
      const same =
        exp.length === got.length && exp.every((v, i) => v === got[i]);
      if (!same) {
        metaMismatch.push(`Golden seeds ${JSON.stringify(exp)} != requested ${JSON.stringify(got)}.`);
      }
    }
  }

  const expectedHashes = (expectedGolden && expectedGolden.hashes) ? expectedGolden.hashes : {};
  for (const seedStr of Object.keys(actual).sort((a, b) => Number(a) - Number(b))) {
    const seed = Number(seedStr);
    const exp = expectedHashes ? expectedHashes[seedStr] : undefined;
    const got = actual[seedStr];
    if (!exp || typeof exp !== "string") {
      diffs.push({ seed, expected: undefined, actual: got });
    } else if (exp !== got) {
      diffs.push({ seed, expected: exp, actual: got });
    }
  }
  // Also detect seeds present in expected but not computed
  for (const seedStr of Object.keys(expectedHashes || {})) {
    if (!(seedStr in actual)) {
      diffs.push({ seed: Number(seedStr), expected: expectedHashes[seedStr], actual: undefined });
    }
  }

  return { diffs, metaMismatch };
}

/**
 * Write the golden file at GOLDEN_PATH in a strict, stable order.
 * @param {{ biomeId: string, w: number, h: number, seeds: number[], hashes: Record<string, string> }} data
 */
function writeGoldenFile(data) {
  const seedsSorted = data.seeds.slice().sort((a, b) => a - b).map(Number);
  const hashesOrdered = {};
  for (const s of seedsSorted) {
    hashesOrdered[String(s)] = data.hashes[String(s)];
  }
  const out = {
    version: GOLDEN_VERSION,
    biomeId: data.biomeId,
    size: { w: data.w, h: data.h },
    seeds: seedsSorted,
    hashes: hashesOrdered
  };
  const json = JSON.stringify(out, null, 2) + "\n";
  fs.writeFileSync(GOLDEN_PATH, json, "utf8");
}

/**
 * Run the harness with the provided options.
 * @param {{ mode?: "check"|"update"|"list"|"diff", seeds?: number[], w?: number, h?: number, biomeId?: string }} options
 * @returns {Promise<{ ok: boolean, results: { seeds: number[], hashes: Record<string, string>, biomeId: string, w: number, h: number } }>}
 */
export async function runHarness(options = {}) {
  const seeds = Array.isArray(options.seeds) && options.seeds.length ? options.seeds.slice() : DEFAULT_SEEDS.slice();
  const w = Number.isInteger(options.w) && options.w > 0 ? Number(options.w) : DEFAULT_SIZE.w;
  const h = Number.isInteger(options.h) && options.h > 0 ? Number(options.h) : DEFAULT_SIZE.h;
  const biomeId = typeof options.biomeId === "string" && options.biomeId ? options.biomeId : DEFAULT_BIOME_ID;
  const mode = options.mode ?? "check";

  const hashes = await computeHashes({ seeds, w, h, biomeId });
  const results = { seeds, hashes, biomeId, w, h };

  if (mode === "list") {
    const out = {
      version: GOLDEN_VERSION,
      biomeId,
      size: { w, h },
      seeds: seeds.slice().sort((a, b) => a - b),
      hashes: Object.fromEntries(Object.keys(hashes).sort((a, b) => Number(a) - Number(b)).map((k) => [k, hashes[k]]))
    };
    console.log(JSON.stringify(out, null, 2));
    return { ok: true, results };
  }

  if (mode === "update") {
    writeGoldenFile({ biomeId, w, h, seeds, hashes });
    console.log(`Golden hashes updated at ${GOLDEN_PATH}`);
    return { ok: true, results };
  }

  // check or diff
  const { diffs, metaMismatch } = diffHashes(hashes, goldens, { biomeId, w, h, seeds });
  if (metaMismatch.length) {
    for (const m of metaMismatch) console.warn(`Meta mismatch: ${m}`);
  }
  if (diffs.length === 0 && metaMismatch.length === 0) {
    console.log(`All ${seeds.length} seed hashes match committed goldens.`);
    return { ok: true, results };
  }

  if (mode === "diff") {
    if (metaMismatch.length) {
      console.log("Differences in metadata detected.");
    }
    console.log("Seed hash differences:");
    for (const d of diffs.sort((a, b) => a.seed - b.seed)) {
      const exp = d.expected != null ? d.expected : "(missing)";
      const got = d.actual != null ? d.actual : "(missing)";
      console.log(`  seed ${d.seed}: expected ${exp} != actual ${got}`);
    }
  } else if (mode === "check") {
    // Summarize without per-seed lines
    const missing = diffs.filter((d) => d.expected == null || d.actual == null).length;
    const changed = diffs.length - missing;
    console.error(`Hash mismatches detected: ${changed} changed, ${missing} missing/extra. Run with --mode diff for details.`);
  }
  return { ok: false, results };
}

/**
 * CLI entrypoint.
 */
async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e && e.message ? e.message : String(e));
    printUsageAndExit(2);
    return;
  }

  try {
    const { ok } = await runHarness(parsed);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.error(msg);
    process.exit(1);
  }
}

// Execute if run directly, not when imported.
const isDirect = (() => {
  const urlPath = new URL(import.meta.url).pathname;
  const cliPath = path.resolve(process.argv[1] || "");
  return path.resolve(urlPath) === cliPath;
})();

if (isDirect) {
  // Top-level await usage is allowed in ESM (Node ≥ 18).
  await main();
}