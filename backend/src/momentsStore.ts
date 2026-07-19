/**
 * Persisted store for sealed Moments (backs GET /moments/recent). Previously this was a
 * plain in-memory array in server.ts, so every process restart (a Railway redeploy, a
 * crash-restart) silently forgot every Moment sealed from a match that had already
 * finished -- the pack-draw queue would then only ever contain whatever match happened
 * to be live *since the last restart*. Persisted to a local JSON file, same pattern as
 * matchMetadataStore.ts.
 */
import * as fs from "fs";
import * as path from "path";
import { MomentResult } from "./types";

const DATA_DIR = path.resolve(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "recent-moments.json");

// Comfortably holds many matches' worth of swings (a match typically produces a
// handful of >=20pt swings), not just the single most recently-live one.
const MAX_STORED = 500;

let cache: MomentResult[] | null = null; // newest first

function load(): MomentResult[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch (err: any) {
    if (err.code !== "ENOENT") console.warn("[momentsStore] Failed to read store, starting empty:", err.message);
    cache = [];
  }
  return cache!;
}

function persist(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // Write-then-rename so a crash mid-write can't leave a truncated/corrupt file behind.
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(cache, null, 2));
  fs.renameSync(tmpPath, STORE_PATH);
}

export function getRecentMoments(limit: number): MomentResult[] {
  return load().slice(0, limit);
}

/** Prepends new Moments (newest first) and persists. Input order is oldest-to-newest. */
export function appendMoments(results: MomentResult[]): void {
  if (results.length === 0) return;
  const store = load();
  for (let i = results.length - 1; i >= 0; i--) store.unshift(results[i]);
  store.length = Math.min(store.length, MAX_STORED);
  persist();
}
