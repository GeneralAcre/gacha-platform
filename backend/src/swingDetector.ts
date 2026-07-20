import { Moment, OddsUpdate } from "./types";

const SWING_WINDOW_MS = 5 * 60 * 1000;
const SWING_THRESHOLD_POINTS = 20;
const DEBOUNCE_MS = 3 * 60 * 1000;

interface FixtureHistory {
  points: OddsUpdate[]; // sorted ascending by timestamp, pruned to SWING_WINDOW_MS
  lastPoint?: OddsUpdate; // most recent point seen, kept even after it falls out of the window
  lastMomentAt?: number;
}

function formatMinute(matchMinute?: number): string {
  return matchMinute !== undefined ? `${matchMinute}'` : "";
}

function buildNarrative(team: string, fromP: number, toP: number, matchMinute?: number): string {
  const arrow = toP > fromP ? "jumped" : "dropped";
  const prefix = matchMinute !== undefined ? `${formatMinute(matchMinute)} — ` : "";
  return `${prefix}${team}'s win probability ${arrow} from ${Math.round(fromP)}% → ${Math.round(toP)}%`;
}

export class SwingDetector {
  private history = new Map<number, FixtureHistory>();

  /** The most recent OddsUpdate seen for `fixtureId`, if any -- lets a caller outside the
   * normal ingest loop (e.g. matchEventMoments.ts, reacting to an admin-reported card/goal)
   * compare against the same live baseline the algorithmic detector already has, without
   * needing its own separate tracking. */
  getLastPoint(fixtureId: number): OddsUpdate | undefined {
    return this.history.get(fixtureId)?.lastPoint;
  }

  /** Feed one OddsUpdate through the detector. Returns a Moment if this update triggers one, else null. */
  ingest(update: OddsUpdate): Moment | null {
    let fixture = this.history.get(update.fixtureId);
    if (!fixture) {
      fixture = { points: [] };
      this.history.set(update.fixtureId, fixture);
    }

    const previousPoint = fixture.lastPoint;

    fixture.points.push(update);
    fixture.points = fixture.points.filter((p) => update.timestamp - p.timestamp <= SWING_WINDOW_MS);
    fixture.lastPoint = update;

    const debounced =
      fixture.lastMomentAt !== undefined && update.timestamp - fixture.lastMomentAt < DEBOUNCE_MS;
    if (debounced) return null;

    // (b) favorite/underdog flip: crosses 50% relative to the immediately prior update.
    if (previousPoint && crossesFifty(previousPoint.winProbability, update.winProbability)) {
      return this.emit(fixture, update, previousPoint.winProbability, update.winProbability, "flip");
    }

    // (a) >=20 point swing within the trailing 5-minute window, measured from the
    // oldest point still in that window to the current point.
    const oldestInWindow = fixture.points[0];
    if (oldestInWindow && oldestInWindow !== update) {
      const delta = Math.abs(update.winProbability - oldestInWindow.winProbability);
      if (delta >= SWING_THRESHOLD_POINTS) {
        return this.emit(fixture, update, oldestInWindow.winProbability, update.winProbability, "swing");
      }
    }

    return null;
  }

  private emit(
    fixture: FixtureHistory,
    update: OddsUpdate,
    fromProbability: number,
    toProbability: number,
    kind: Moment["kind"]
  ): Moment {
    fixture.lastMomentAt = update.timestamp;
    return {
      fixtureId: update.fixtureId,
      competition: update.competition,
      team: update.team,
      opponent: update.opponent,
      fromProbability,
      toProbability,
      deltaProbability: toProbability - fromProbability,
      matchMinute: update.matchMinute,
      timestamp: update.timestamp,
      kind,
      narrative: buildNarrative(update.team, fromProbability, toProbability, update.matchMinute),
      matchStarted: update.matchStarted,
      // Default assumption: a real algorithmic detection off real odds. synthetic.ts runs
      // the demo sequence through its own throwaway SwingDetector and overrides this to
      // "synthetic" afterward, since ingest() itself has no way to know its input is fake.
      source: "swing",
    };
  }
}

export function crossesFifty(from: number, to: number): boolean {
  return (from < 50 && to >= 50) || (from >= 50 && to < 50);
}
