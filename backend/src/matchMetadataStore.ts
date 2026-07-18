/**
 * Admin-curated overlay for match data TxLINE doesn't provide (stadium, city, cover
 * image) — never score, status, or probabilities, which always come live from TxLINE
 * (see adminMatches.ts). Keyed by the same `id` the frontend already uses to identify a
 * CollectionEntry ("result-<n>" for a static historical result, "live-<fixtureId>" for a
 * TxLINE-tracked fixture), so this overlay joins cleanly onto fetchCollection()'s output.
 *
 * Persisted to a local JSON file rather than a real database — consistent with the rest
 * of this hackathon-scope backend (devnet-keypair.json, .txline-session.json are the
 * same pattern). Fine for a single-process admin tool; would need a real DB behind
 * concurrent writers.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export type MatchEventType = "GOAL" | "YELLOW_CARD" | "RED_CARD";

/** Admin-reported match event (goal/card). This is deliberately NOT the same thing as
 * `score` on AdminMatchView/CollectionEntry -- TxLINE never gives a live goal-by-goal
 * feed, so events are a separately-labeled, admin-attested timeline (see
 * adminMatches.ts's `reportedScore`), not a replacement for the TxLINE-sourced score. */
export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  playerName: string;
  side: "teamA" | "teamB";
  /** Server-assigned insertion order, not admin-supplied -- deterministic sequencing for
   * two events in the same minute without relying on an admin to pick a unique integer. */
  sortOrder: number;
  createdAt: number;
  createdBy: string;
  sealedSignature: string | null;
  sealedAt: number | null;
}

export interface MatchMetadata {
  stadium?: string;
  city?: string;
  /** Admin-supplied cover image URL. Undefined means "use the generated placeholder" (see matchImages.ts). */
  imageUrl?: string;
  /** Devnet memo-tx signature this metadata was last sealed under, once sealed. */
  sealedSignature?: string;
  sealedAt?: number;
  updatedAt: number;
  updatedBy: string;
  events?: MatchEvent[];
}

const DATA_DIR = path.resolve(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "match-metadata.json");

let cache: Record<string, MatchMetadata> | null = null;

function load(): Record<string, MatchMetadata> {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch (err: any) {
    if (err.code !== "ENOENT") console.warn("[matchMetadataStore] Failed to read store, starting empty:", err.message);
    cache = {};
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

export function getAllMetadata(): Record<string, MatchMetadata> {
  return { ...load() };
}

export function getMetadata(id: string): MatchMetadata | undefined {
  return load()[id];
}

export function setMetadata(
  id: string,
  patch: Pick<MatchMetadata, "stadium" | "city" | "imageUrl">,
  updatedBy: string
): MatchMetadata {
  const store = load();
  const next: MatchMetadata = {
    ...store[id],
    ...patch,
    updatedAt: Date.now(),
    updatedBy,
  };
  store[id] = next;
  persist();
  return next;
}

export function setSealedSignature(id: string, signature: string): MatchMetadata {
  const store = load();
  const existing = store[id] ?? { updatedAt: Date.now(), updatedBy: "system" };
  const next: MatchMetadata = { ...existing, sealedSignature: signature, sealedAt: Date.now() };
  store[id] = next;
  persist();
  return next;
}

export function getEvents(id: string): MatchEvent[] {
  return load()[id]?.events ?? [];
}

/** Appends a new event (unsealed) and returns it so the caller can seal it on-chain and
 * patch in the signature via setEventSealedSignature. */
export function addEvent(
  id: string,
  input: Pick<MatchEvent, "type" | "minute" | "playerName" | "side">,
  createdBy: string
): MatchEvent {
  const store = load();
  const existing = store[id] ?? { updatedAt: Date.now(), updatedBy: createdBy };
  const events = existing.events ?? [];
  const event: MatchEvent = {
    id: crypto.randomUUID(),
    ...input,
    sortOrder: events.length,
    createdAt: Date.now(),
    createdBy,
    sealedSignature: null,
    sealedAt: null,
  };
  store[id] = { ...existing, events: [...events, event] };
  persist();
  return event;
}

export function setEventSealedSignature(id: string, eventId: string, signature: string): void {
  const store = load();
  const existing = store[id];
  if (!existing?.events) return;
  store[id] = {
    ...existing,
    events: existing.events.map((e) => (e.id === eventId ? { ...e, sealedSignature: signature, sealedAt: Date.now() } : e)),
  };
  persist();
}

/** Removes an event from the admin's active list. Note this does NOT and cannot erase
 * the on-chain memo tx already sealed for it (immutable, same as any other devnet tx) --
 * this only stops it from being reported going forward. */
export function removeEvent(id: string, eventId: string): boolean {
  const store = load();
  const existing = store[id];
  if (!existing?.events) return false;
  const before = existing.events.length;
  store[id] = { ...existing, events: existing.events.filter((e) => e.id !== eventId) };
  persist();
  return store[id].events!.length < before;
}
