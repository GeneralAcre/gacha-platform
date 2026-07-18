/**
 * Synthetic OddsUpdate sequence for demoing the swing-detector -> memo-tx pipeline
 * without depending on a live TxLINE fixture. Shared by test/simulate.ts (CLI) and
 * server.ts's POST /moments/simulate (on-demand trigger for the frontend demo).
 */
import { SwingDetector } from "./swingDetector";
import { sendMomentTx } from "./sendMomentTx";
import { MomentResult, OddsUpdate } from "./types";

export function syntheticSequence(): OddsUpdate[] {
  const fixtureId = 999001;
  const team = "Portugal";
  const opponent = "Spain";
  const baseTs = Date.now() - 10 * 60 * 1000;

  // Portugal concede early, claw back with two late goals: underdog -> favorite flip,
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
