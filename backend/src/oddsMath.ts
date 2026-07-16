/** Shared TxLINE odds shape + de-vig math, used by both live ingestion (txlineClient.ts) and the fixture browser (fixtures.ts). See txlineClient.ts's file header for the full payload-shape writeup. */

export const MATCH_WINNER_TYPE = "1X2_PARTICIPANT_RESULT";

export interface RawOdds {
  FixtureId: number;
  MessageId: string;
  Ts: number;
  Bookmaker: string;
  SuperOddsType: string;
  MarketPeriod: string | null;
  InRunning?: boolean;
  PriceNames: string[];
  Prices: number[];
}

/** decimal odds = Prices[i] / 1000; implied% = 100 / decimalOdds = 100000 / Prices[i], re-normalized to sum to 100. */
export function impliedProbabilities(prices: number[]): number[] {
  const rawImplied = prices.map((p) => 100000 / p);
  const sum = rawImplied.reduce((a, b) => a + b, 0);
  return rawImplied.map((p) => (p / sum) * 100);
}

/** The full-match (not half-time/handicap/totals) win-market entry from a raw Odds snapshot array, if present. */
export function findMatchWinnerEntry(entries: RawOdds[]): RawOdds | undefined {
  return entries.find((o) => o.SuperOddsType === MATCH_WINNER_TYPE && o.MarketPeriod === null);
}
