/**
 * Unified World Cup 2026 collection: verified historical knockout results
 * (worldCup2026Results.ts, no on-chain data -- we never watched these live)
 * merged with whatever TxLINE currently tracks live (fixtures.ts, real-time
 * odds, eligible for real Sealed Moments). Backs GET /collection.
 */
import { fetchFixtureSummaries } from "./fixtures";
import { WORLD_CUP_2026_KNOCKOUT_RESULTS, KnockoutRound } from "./worldCup2026Results";
import type { MatchEvent } from "./matchMetadataStore";

export type CollectionEntryKind = "result" | "live";

export interface CollectionEntry {
  id: string;
  kind: CollectionEntryKind;
  round: string;
  team1: string;
  team2: string;
  dateMs: number;
  // "result" entries: a completed, verified historical match (no on-chain data)
  score1?: number;
  score2?: number;
  penalties?: { team1: number; team2: number };
  wentToExtraTime?: boolean;
  venue?: string;
  city?: string;
  // "live" entries: a fixture TxLINE is currently tracking (real-time odds, eligible for Sealed Moments)
  fixtureId?: number;
  status?: "upcoming" | "live" | "past";
  winProbability?: { participant1: number; participant2: number };
  // Populated by server.ts (see adminMatches.ts's enrichCollectionEntries) from the
  // admin-curated overlay + generated placeholder -- never set by fetchCollection itself.
  imageUrl?: string;
  // Admin-reported goal/card timeline for a "live" entry, and the tally derived from it.
  // Deliberately separate from score1/score2 (which only ever exist on a verified
  // "result" entry) -- never presented as TxLINE-sourced fact, see matchMetadataStore.ts.
  events?: MatchEvent[];
  reportedScore?: { teamA: number; teamB: number } | null;
}

/** Known final-stretch fixtures, purely for a readable round label -- the odds/status data itself always comes live from TxLINE, never fabricated. */
function labelLiveRound(team1: string, team2: string): string {
  const pair = new Set([team1, team2]);
  if (pair.has("France") && pair.has("England")) return "Third Place";
  if (pair.has("Spain") && pair.has("Argentina")) return "Final";
  return "World Cup";
}

function dateStringToMs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}

const ROUND_ORDER: Record<KnockoutRound | "Third Place" | "Final" | "World Cup", number> = {
  "Round of 32": 0,
  "Round of 16": 1,
  Quarterfinal: 2,
  Semifinal: 3,
  "Third Place": 4,
  Final: 5,
  "World Cup": 6,
};

export async function fetchCollection(): Promise<CollectionEntry[]> {
  const resultEntries: CollectionEntry[] = WORLD_CUP_2026_KNOCKOUT_RESULTS.map((r, i) => ({
    id: `result-${i}`,
    kind: "result",
    round: r.round,
    team1: r.team1,
    team2: r.team2,
    dateMs: dateStringToMs(r.date),
    score1: r.score1,
    score2: r.score2,
    penalties: r.penalties,
    wentToExtraTime: r.wentToExtraTime,
    venue: r.venue,
    city: r.city,
  }));

  const liveFixtures = await fetchFixtureSummaries();
  const liveEntries: CollectionEntry[] = liveFixtures
    .filter((f) => f.competition === "World Cup")
    .map((f) => ({
      id: `live-${f.fixtureId}`,
      kind: "live",
      round: labelLiveRound(f.participant1, f.participant2),
      team1: f.participant1,
      team2: f.participant2,
      dateMs: f.startTimeMs,
      fixtureId: f.fixtureId,
      status: f.status,
      winProbability: f.winProbability,
    }));

  return [...resultEntries, ...liveEntries].sort((a, b) => {
    const roundDiff = (ROUND_ORDER[a.round as keyof typeof ROUND_ORDER] ?? 99) - (ROUND_ORDER[b.round as keyof typeof ROUND_ORDER] ?? 99);
    return roundDiff !== 0 ? roundDiff : a.dateMs - b.dateMs;
  });
}
