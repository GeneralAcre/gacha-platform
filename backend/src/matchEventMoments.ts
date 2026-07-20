/**
 * Seals a real Moment card off an admin-reported live match event (goal/yellow/red card --
 * see matchMetadataStore.ts's MatchEvent). TxLINE's odds feed has no event data of its own
 * (no goals, no cards -- see txlineClient.ts's header), so there's no way to algorithmically
 * know *why* a live fixture's win probability moved. This is the human-attested counterpart
 * to swingDetector.ts's purely-algorithmic threshold: an admin watching the real broadcast
 * confirms a card/goal happened, and this immediately compares that fixture's current
 * TxLINE odds against the last odds point liveDetector already had for it, sealing a Moment
 * tagged with the real event -- distinct from every other Moment's generic swing/flip guess.
 */
import { liveDetector } from "./liveDetector";
import { crossesFifty } from "./swingDetector";
import { fetchCurrentWinProbability } from "./fixtures";
import { refreshFixtureRegistry } from "./txlineClient";
import { sendMomentTx } from "./sendMomentTx";
import { matchImageForFixture } from "./matchImages";
import { appendMoments } from "./momentsStore";
import { Moment, MomentResult } from "./types";

const EVENT_LABEL: Record<NonNullable<Moment["triggerEvent"]>, string> = {
  GOAL: "Goal",
  YELLOW_CARD: "Yellow card",
  RED_CARD: "Red card",
};

/** Seals and records a Moment for `fixtureId` off a just-reported real event, or returns
 * null (no-op, not an error) if there isn't yet a prior odds point for this fixture to
 * compare against, or TxLINE has no current odds for it. Never throws -- callers report
 * the underlying event either way; this is strictly additive on top of that. */
export async function sealEventTriggeredMoment(
  fixtureId: number,
  eventType: NonNullable<Moment["triggerEvent"]>,
  minute: number,
  playerName: string
): Promise<MomentResult | null> {
  const lastPoint = liveDetector.getLastPoint(fixtureId);
  if (!lastPoint) return null; // no live baseline yet -- nothing to compare against

  const current = await fetchCurrentWinProbability(fixtureId);
  if (!current) return null;

  // lastPoint.team is whichever of TxLINE's participant1/participant2 this history point
  // happens to be anchored to (see txlineClient.ts's normalizeOddsEntry) -- match it back
  // against the fixture registry's participant1 name to read the right side of `current`.
  const registry = await refreshFixtureRegistry();
  const meta = registry.get(fixtureId);
  if (!meta) return null;
  const to = lastPoint.team === meta.participant1 ? current.participant1 : current.participant2;

  const fromProbability = lastPoint.winProbability;
  const kind = crossesFifty(fromProbability, to) ? "flip" : "swing";

  const moment: Moment = {
    fixtureId,
    competition: meta.competition,
    team: lastPoint.team,
    opponent: lastPoint.opponent,
    fromProbability,
    toProbability: to,
    deltaProbability: to - fromProbability,
    matchMinute: minute,
    timestamp: Date.now(),
    kind,
    narrative: `${minute}' -- ${EVENT_LABEL[eventType]}${playerName ? ` (${playerName})` : ""}: ${lastPoint.team}'s win probability moved from ${Math.round(fromProbability)}% to ${Math.round(to)}%`,
    matchStarted: true,
    triggerEvent: eventType,
    source: "event",
  };

  const signature = await sendMomentTx(moment);
  const imageUrl = await matchImageForFixture(fixtureId, lastPoint.team, lastPoint.opponent).catch(() => undefined);
  const result: MomentResult = imageUrl ? { ...moment, signature, imageUrl } : { ...moment, signature };

  appendMoments([result]);
  return result;
}
