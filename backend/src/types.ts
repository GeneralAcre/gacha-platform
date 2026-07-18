export interface OddsUpdate {
  fixtureId: number;
  /** TxLINE's own competition label for this fixture, e.g. "World Cup" — never fabricated,
   * always whatever the fixture snapshot reports. */
  competition: string;
  team: string;
  opponent: string;
  /** Win probability for `team`, 0-100. Derived from whatever raw price field TxLINE returns. */
  winProbability: number;
  timestamp: number;
  matchMinute?: number;
  /** Whether the fixture had actually kicked off at `timestamp` -- odds move pre-match too
   * (team news, lineups), and we only know a swing came from something like a card once the
   * match is actually underway. */
  matchStarted: boolean;
}

export interface Moment {
  fixtureId: number;
  competition: string;
  team: string;
  opponent: string;
  fromProbability: number;
  toProbability: number;
  deltaProbability: number;
  matchMinute?: number;
  timestamp: number;
  kind: "swing" | "flip";
  narrative: string;
  matchStarted: boolean;
}

/** A Moment that has been sealed on-chain as a devnet memo transaction. */
export interface MomentResult extends Moment {
  signature: string;
  // Populated in server.ts's recordMoments via adminMatches.matchImageForFixture --
  // admin-curated if set, else a generated placeholder keyed by this fixture's id.
  imageUrl?: string;
}
