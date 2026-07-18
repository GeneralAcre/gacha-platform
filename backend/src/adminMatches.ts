/**
 * Admin view of match data: merges fetchCollection()'s TxLINE-live + verified-historical
 * matches (see collection.ts) with the admin-curated overlay (matchMetadataStore.ts) and
 * a cover image (matchImages.ts). Score, status, and win probability are always taken
 * straight from fetchCollection() -- there is no admin field for any of them, on purpose
 * (see matchMetadataStore.ts's header). The only things an admin can set are stadium,
 * city, and a cover image, which get sealed on-chain as a devnet memo tx so the curated
 * metadata has the same auditable trail as Moments do.
 */
import { fetchCollection, CollectionEntry } from "./collection";
import {
  addEvent,
  getMetadata,
  removeEvent,
  setEventSealedSignature,
  setMetadata,
  setSealedSignature,
  MatchEvent,
  MatchMetadata,
} from "./matchMetadataStore";
import { ensureGeneratedMatchImage } from "./matchImages";
import { sendMemoTx } from "./sendMemoTx";

export type AdminMatchStatus = "scheduled" | "live" | "finished";

export interface AdminMatchView {
  id: string;
  source: CollectionEntry["kind"];
  round: string;
  teamA: string;
  teamB: string;
  dateMs: number;
  /** Always TxLINE/verified-result-sourced or admin-curated -- never hand-typed alongside real data. */
  status: AdminMatchStatus;
  score: { teamA: number; teamB: number } | null;
  /** Straight from TxLINE (via fetchCollection); null until TxLINE has published odds for this fixture. */
  winProbability: { teamA: number; teamB: number } | null;
  stadium: string | null;
  city: string | null;
  imageUrl: string;
  imageIsCustom: boolean;
  sealedSignature: string | null;
  sealedAt: number | null;
  updatedAt: number | null;
  /** Admin-reported goal/card timeline -- NOT a substitute for `score`, see matchMetadataStore.ts. */
  events: MatchEvent[];
  /** Tally of GOAL events by side, purely derived from `events` -- explicitly separate
   * from `score` so callers can't accidentally treat it as TxLINE/verified fact. Null
   * when there are no reported events yet. */
  reportedScore: { teamA: number; teamB: number } | null;
}

function statusOf(entry: CollectionEntry): AdminMatchStatus {
  if (entry.kind === "result") return "finished";
  if (entry.status === "upcoming") return "scheduled";
  if (entry.status === "past") return "finished";
  return "live";
}

function reportedScoreOf(events: MatchEvent[]): { teamA: number; teamB: number } | null {
  if (events.length === 0) return null;
  return events.reduce(
    (tally, e) => (e.type === "GOAL" ? { ...tally, [e.side]: tally[e.side] + 1 } : tally),
    { teamA: 0, teamB: 0 }
  );
}

async function toView(entry: CollectionEntry, meta: MatchMetadata | undefined): Promise<AdminMatchView> {
  const imageUrl =
    meta?.imageUrl ?? (await ensureGeneratedMatchImage(entry.id, { teamA: entry.team1, teamB: entry.team2, label: entry.round }));
  const events = meta?.events ?? [];

  return {
    id: entry.id,
    source: entry.kind,
    round: entry.round,
    teamA: entry.team1,
    teamB: entry.team2,
    dateMs: entry.dateMs,
    status: statusOf(entry),
    score: entry.kind === "result" && entry.score1 !== undefined && entry.score2 !== undefined
      ? { teamA: entry.score1, teamB: entry.score2 }
      : null,
    winProbability: entry.winProbability
      ? { teamA: entry.winProbability.participant1, teamB: entry.winProbability.participant2 }
      : null,
    stadium: meta?.stadium ?? entry.venue ?? null,
    city: meta?.city ?? entry.city ?? null,
    imageUrl,
    imageIsCustom: meta?.imageUrl !== undefined,
    sealedSignature: meta?.sealedSignature ?? null,
    sealedAt: meta?.sealedAt ?? null,
    updatedAt: meta?.updatedAt ?? null,
    events,
    reportedScore: reportedScoreOf(events),
  };
}

/** Throws if `id` isn't a match fetchCollection() currently knows about -- meant to be
 * called before any work that shouldn't happen for an unknown id (e.g. writing an
 * uploaded file to disk in POST /admin/matches/:id/image). */
export async function assertMatchExists(id: string): Promise<void> {
  const collection = await fetchCollection();
  if (!collection.some((e) => e.id === id)) throw new Error(`Unknown match id: ${id}`);
}

export async function listAdminMatches(): Promise<AdminMatchView[]> {
  const collection = await fetchCollection();
  return Promise.all(collection.map((entry) => toView(entry, getMetadata(entry.id))));
}

export interface MatchMetadataPatch {
  stadium?: string;
  city?: string;
  imageUrl?: string;
}

/** Updates the curated overlay for `id`, then seals the new stadium/city/imageUrl on
 * devnet as a memo tx so it's independently verifiable, same pattern as sendMomentTx.
 * Throws if `id` isn't a match fetchCollection() currently knows about. */
export async function updateAdminMatch(id: string, patch: MatchMetadataPatch, updatedBy: string): Promise<AdminMatchView> {
  const collection = await fetchCollection();
  const entry = collection.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown match id: ${id}`);

  if (patch.stadium === undefined && patch.city === undefined && patch.imageUrl === undefined) {
    throw new Error("Nothing to update: provide at least one of stadium, city, imageUrl");
  }

  setMetadata(id, patch, updatedBy);

  const signature = await sendMemoTx({
    type: "match-metadata",
    id,
    teamA: entry.team1,
    teamB: entry.team2,
    round: entry.round,
    stadium: patch.stadium ?? null,
    city: patch.city ?? null,
    imageUrl: patch.imageUrl ?? null,
    updatedBy,
    ts: Date.now(),
  });
  setSealedSignature(id, signature);

  return toView(entry, getMetadata(id));
}

export interface MatchEventInput {
  type: MatchEvent["type"];
  minute: number;
  playerName: string;
  side: "teamA" | "teamB";
}

/** Reports a goal/card for a live fixture and seals it on-chain, same auditable-trail
 * pattern as updateAdminMatch. Restricted to `live` matches -- a `result` entry already
 * has a real, verified final score (worldCup2026Results.ts), so admin-reported events
 * would only ever contradict it, never usefully supplement it. */
export async function addMatchEvent(id: string, input: MatchEventInput, createdBy: string): Promise<AdminMatchView> {
  const collection = await fetchCollection();
  const entry = collection.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown match id: ${id}`);
  if (entry.kind !== "live") throw new Error("Events can only be reported for a live TxLINE-tracked match, not a verified historical result");
  if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 130) throw new Error("minute must be an integer between 0 and 130");
  if (!input.playerName.trim()) throw new Error("playerName is required");

  const event = addEvent(id, input, createdBy);
  const signature = await sendMemoTx({
    type: "match-event",
    id,
    teamA: entry.team1,
    teamB: entry.team2,
    eventId: event.id,
    eventType: event.type,
    minute: event.minute,
    playerName: event.playerName,
    side: event.side,
    createdBy,
    ts: event.createdAt,
  });
  setEventSealedSignature(id, event.id, signature);

  return toView(entry, getMetadata(id));
}

/** Removes an event from the admin's active list (does not and cannot erase the memo tx
 * already sealed for it -- see matchMetadataStore.ts's removeEvent). */
export async function removeMatchEvent(id: string, eventId: string): Promise<AdminMatchView> {
  const collection = await fetchCollection();
  const entry = collection.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown match id: ${id}`);

  const removed = removeEvent(id, eventId);
  if (!removed) throw new Error(`Unknown event id: ${eventId}`);

  return toView(entry, getMetadata(id));
}

/** Attaches imageUrl (and stadium/city overrides where an admin has curated them) onto
 * public CollectionEntry results -- additive fields only, so existing consumers of
 * fetchCollection()'s shape are unaffected. Backs GET /collection. */
export async function enrichCollectionEntries(entries: CollectionEntry[]): Promise<CollectionEntry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const meta = getMetadata(entry.id);
      const imageUrl =
        meta?.imageUrl ?? (await ensureGeneratedMatchImage(entry.id, { teamA: entry.team1, teamB: entry.team2, label: entry.round }));
      const events = meta?.events ?? [];
      return {
        ...entry,
        venue: meta?.stadium ?? entry.venue,
        city: meta?.city ?? entry.city,
        imageUrl,
        events,
        reportedScore: reportedScoreOf(events),
      };
    })
  );
}

/** Same idea as enrichCollectionEntries but for a single live fixture, keyed the same way
 * a "live-<fixtureId>" CollectionEntry would be. Backs Moment image lookup in server.ts. */
export async function matchImageForFixture(fixtureId: number, teamA: string, teamB: string): Promise<string> {
  const id = `live-${fixtureId}`;
  const meta = getMetadata(id);
  return meta?.imageUrl ?? ensureGeneratedMatchImage(id, { teamA, teamB, label: "World Cup" });
}
