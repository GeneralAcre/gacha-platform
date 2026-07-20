/**
 * Synthetic OddsUpdate sequence for demoing the swing-detector -> memo-tx pipeline
 * without depending on a live TxLINE fixture. Shared by test/simulate.ts (CLI) and
 * server.ts's POST /moments/simulate (on-demand trigger for the frontend demo, used
 * whenever a player opens a pack and no real live swing is already queued).
 *
 * Each triggered Moment is keyed to its own independently-random real WORLD_CUP_2026_RESULTS
 * matchup -- earlier this was one match's whole minute-by-minute script (so a single seal
 * always dumped 2-3 cards for the *same* pairing, e.g. always "Germany vs Paraguay" three
 * times in Trending Draws), then before that it was always hardcoded Portugal vs Spain. The
 * per-event probability shapes below are still fabricated -- these teams never actually had
 * this odds movement -- but each moment now points at a distinct real past fixture, so one
 * seal covers a spread of the actual tournament instead of repeating a single pair.
 */
import { SwingDetector } from "./swingDetector";
import { sendMomentTx } from "./sendMomentTx";
import { MomentResult, OddsUpdate } from "./types";
import { WORLD_CUP_2026_RESULTS } from "./worldCup2026Results";

// Reserved fixtureId range for synthetic demo pulls, well clear of any real TxLINE
// fixtureId (those run in the tens of millions, e.g. 18241006) so there's no collision.
const SYNTHETIC_FIXTURE_ID_BASE = 900_000;

/** One scripted probability arc, fed to a single (synthetic) fixture -- independent of
 * every other event, so each can be pinned to its own randomly-drawn real matchup. */
interface SyntheticEvent {
  points: Array<{ minute: number; winProbability: number; offsetMs: number }>;
}

const EVENT_SCRIPTS: SyntheticEvent[] = [
  // Concedes early and keeps sliding -- a >=20pt swing within the trailing window.
  {
    points: [
      { minute: 10, winProbability: 45, offsetMs: 0 },
      { minute: 23, winProbability: 22, offsetMs: 60_000 },
    ],
  },
  // Fights back from behind to become the favorite -- crosses 50% -> flip.
  {
    points: [
      { minute: 55, winProbability: 41, offsetMs: 0 },
      { minute: 63, winProbability: 58, offsetMs: 90_000 },
    ],
  },
  // Late red card costs the favorite the lead -- crosses back below 50% -> flip.
  {
    points: [
      { minute: 70, winProbability: 58, offsetMs: 0 },
      { minute: 78, winProbability: 41, offsetMs: 90_000 },
    ],
  },
];

/** Picks `count` distinct real matchups at random (never the same fixture twice in one
 * seal), pairing each with a fixtureId derived from its position in the source list so
 * repeated draws of the same matchup stay stable/collision-free across calls. */
function pickSyntheticMatches(count: number): Array<{ fixtureId: number; team: string; opponent: string }> {
  const pool = WORLD_CUP_2026_RESULTS;
  const indices = new Set<number>();
  while (indices.size < Math.min(count, pool.length)) {
    indices.add(Math.floor(Math.random() * pool.length));
  }
  return Array.from(indices).map((index) => {
    const result = pool[index];
    return { fixtureId: SYNTHETIC_FIXTURE_ID_BASE + index, team: result.team1, opponent: result.team2 };
  });
}

export function syntheticSequence(): OddsUpdate[] {
  const baseTs = Date.now() - 10 * 60 * 1000;
  const matches = pickSyntheticMatches(EVENT_SCRIPTS.length);

  return EVENT_SCRIPTS.flatMap((event, i) => {
    const { fixtureId, team, opponent } = matches[i];
    return event.points.map((p) => ({
      fixtureId,
      competition: "World Cup",
      team,
      opponent,
      winProbability: p.winProbability,
      matchMinute: p.minute,
      timestamp: baseTs + p.offsetMs,
      matchStarted: true,
    }));
  });
}

/** Run the synthetic sequence through SwingDetector -> sendMomentTx, returning every Moment triggered along with its confirmed devnet signature.
 * Detection (ingest) is pure/synchronous and must stay sequential so each update sees the
 * fixture's running history in order, but the resulting memo txs are independent of each
 * other -- sending and confirming them in parallel rather than one-at-a-time is what
 * actually cuts wall-clock time here, since each one otherwise blocks on its own devnet
 * round trip. Promise.all preserves the input order in its result array regardless of
 * which tx confirms first, so the reveal order the frontend sees is unaffected. */
export async function runSyntheticMoments(): Promise<MomentResult[]> {
  const detector = new SwingDetector();
  const moments = syntheticSequence()
    .map((update) => detector.ingest(update))
    .filter((moment): moment is NonNullable<typeof moment> => moment !== null);

  const signatures = await Promise.all(moments.map((moment) => sendMomentTx(moment)));
  return moments.map((moment, i) => ({ ...moment, signature: signatures[i] }));
}
