export interface OddsUpdate {
  fixtureId: number;
  team: string;
  opponent: string;
  /** Win probability for `team`, 0-100. Derived from whatever raw price field TxLINE returns. */
  winProbability: number;
  timestamp: number;
  matchMinute?: number;
}

export interface Moment {
  fixtureId: number;
  team: string;
  opponent: string;
  fromProbability: number;
  toProbability: number;
  deltaProbability: number;
  matchMinute?: number;
  timestamp: number;
  kind: "swing" | "flip";
  narrative: string;
}

/** A Moment that has been sealed on-chain as a devnet memo transaction. */
export interface MomentResult extends Moment {
  signature: string;
}
