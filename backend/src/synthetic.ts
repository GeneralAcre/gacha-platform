/**
 * Synthetic OddsUpdate sequence for demoing the swing-detector -> memo-tx pipeline
 * without depending on a live TxLINE fixture. Shared by test/simulate.ts (CLI) and
 * server.ts's POST /moments/simulate (on-demand trigger for the frontend demo, used
 * whenever a player opens a pack and no real live swing is already queued).
 *
 * The team pairing is picked at random from the real WORLD_CUP_2026_KNOCKOUT_RESULTS
 * list each time, rather than a single hardcoded matchup -- previously this was always
 * Portugal vs Spain, so every demo-fallback pull looked identical regardless of how many
 * real WC2026 matches had actually been played. The swing script itself (the minute-by-
 * minute shape) is still fabricated -- these teams never actually had this odds movement
 * -- but the matchup drawn is a real past fixture, so repeated draws cover the actual
 * tournament instead of a single fixed pair.
 */
import { SwingDetector } from "./swingDetector";
import { sendMomentTx } from "./sendMomentTx";
import { MomentResult, OddsUpdate } from "./types";
import { WORLD_CUP_2026_KNOCKOUT_RESULTS } from "./worldCup2026Results";

// Reserved fixtureId range for synthetic demo pulls, well clear of any real TxLINE
// fixtureId (those run in the tens of millions, e.g. 18241006) so there's no collision.
const SYNTHETIC_FIXTURE_ID_BASE = 900_000;

function pickSyntheticMatch(): { fixtureId: number; team: string; opponent: string } {
  const index = Math.floor(Math.random() * WORLD_CUP_2026_KNOCKOUT_RESULTS.length);
  const result = WORLD_CUP_2026_KNOCKOUT_RESULTS[index];
  return { fixtureId: SYNTHETIC_FIXTURE_ID_BASE + index, team: result.team1, opponent: result.team2 };
}

export function syntheticSequence(): OddsUpdate[] {
  const { fixtureId, team, opponent } = pickSyntheticMatch();
  const baseTs = Date.now() - 10 * 60 * 1000;

  // Underdog concedes early, claws back with two late goals: underdog -> favorite flip,
  // then a big swing after a red card, all within the 5-minute detector window.
  const script: Array<{ minute: number; winProbability: number; offsetMs: number }> = [
    { minute: 10, winProbability: 45, offsetMs: 0 },
    { minute: 23, winProbability: 22, offsetMs: 60_000 },   // conceded -> drops, no flip/swing yet
    { minute: 25, winProbability: 12, offsetMs: 90_000 },   // still sliding
    { minute: 61, winProbability: 41, offsetMs: 4 * 60_000 + 30_000 }, // fights back: big swing vs 22%/12% anchor
    { minute: 63, winProbability: 58, offsetMs: 4 * 60_000 + 90_000 }, // crosses 50 -> flip
    { minute: 78, winProbability: 41, offsetMs: 9 * 60_000 },
  ];

  return script.map((s) => ({
    fixtureId,
    competition: "World Cup",
    team,
    opponent,
    winProbability: s.winProbability,
    matchMinute: s.minute,
    timestamp: baseTs + s.offsetMs,
    matchStarted: true,
  }));
}

/** Run the synthetic sequence through SwingDetector -> sendMomentTx, returning every Moment triggered along with its confirmed devnet signature. */
export async function runSyntheticMoments(): Promise<MomentResult[]> {
  const detector = new SwingDetector();
  const results: MomentResult[] = [];

  for (const update of syntheticSequence()) {
    const moment = detector.ingest(update);
    if (moment) {
      const signature = await sendMomentTx(moment);
      results.push({ ...moment, signature });
    }
  }

  return results;
}
