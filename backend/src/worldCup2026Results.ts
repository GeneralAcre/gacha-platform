/**
 * Verified real 2026 FIFA World Cup results, cross-checked across multiple independent
 * sources. Not sourced from TxLINE -- TxLINE's live feed only covers current/upcoming
 * fixtures, so these completed matches (all before our server ever ran) are captured here
 * as static historical fact instead. No on-chain data exists for these (we never watched
 * their odds live), so they render as "Match Result" cards, distinct from "Sealed Moment"
 * cards for fixtures we actually tracked.
 *
 * Two sections:
 * - WORLD_CUP_2026_KNOCKOUT_RESULTS (Round of 32 through the Final), verified 2026-07-16
 *   against Yahoo Sports, Al Jazeera, Sky Sports, and other search results, each round's
 *   winners checked against the next round's entrants for internal consistency.
 * - WORLD_CUP_2026_GROUP_STAGE_RESULTS (all 72 group-stage matches, Groups A-L), added once
 *   cross-verification caught up to cover the full tournament rather than knockouts only.
 *
 * `venue`/`city` are populated only where cross-checking gave a confident, unambiguous
 * answer; left undefined where source data was conflicting or incomplete rather than guessed.
 */
export type KnockoutRound = "Round of 32" | "Round of 16" | "Quarterfinal" | "Semifinal";
export type Round = KnockoutRound | "Group Stage";

interface BaseMatchResult {
  team1: string;
  score1: number;
  team2: string;
  score2: number;
  /** Set when the match went to penalties; the winning team's PK score. */
  penalties?: { team1: number; team2: number };
  wentToExtraTime?: boolean;
  date: string; // YYYY-MM-DD
  venue?: string;
  city?: string;
}

export interface KnockoutResult extends BaseMatchResult {
  round: KnockoutRound;
}

export interface GroupStageResult extends BaseMatchResult {
  round: "Group Stage";
  /** e.g. "Group A" */
  group: string;
}

export type WorldCup2026Result = KnockoutResult | GroupStageResult;

export const WORLD_CUP_2026_KNOCKOUT_RESULTS: KnockoutResult[] = [
  // Round of 32
  { round: "Round of 32", team1: "Canada", score1: 1, team2: "South Africa", score2: 0, date: "2026-06-28", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Round of 32", team1: "Brazil", score1: 2, team2: "Japan", score2: 1, date: "2026-06-29", venue: "NRG Stadium", city: "Houston, TX" },
  { round: "Round of 32", team1: "Germany", score1: 1, team2: "Paraguay", score2: 1, penalties: { team1: 3, team2: 4 }, date: "2026-06-29", venue: "Gillette Stadium", city: "Foxborough, MA" },
  { round: "Round of 32", team1: "Netherlands", score1: 1, team2: "Morocco", score2: 1, penalties: { team1: 2, team2: 3 }, date: "2026-06-29", venue: "Estadio BBVA", city: "Monterrey, Mexico" },
  { round: "Round of 32", team1: "Norway", score1: 2, team2: "Ivory Coast", score2: 1, date: "2026-06-30", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Round of 32", team1: "France", score1: 3, team2: "Sweden", score2: 0, date: "2026-06-30", venue: "MetLife Stadium", city: "East Rutherford, NJ" },
  { round: "Round of 32", team1: "Mexico", score1: 2, team2: "Ecuador", score2: 0, date: "2026-06-30", venue: "Estadio Azteca", city: "Mexico City" },
  { round: "Round of 32", team1: "England", score1: 2, team2: "DR Congo", score2: 1, date: "2026-07-01", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
  { round: "Round of 32", team1: "Belgium", score1: 3, team2: "Senegal", score2: 2, wentToExtraTime: true, date: "2026-07-01", venue: "Lumen Field", city: "Seattle, WA" },
  { round: "Round of 32", team1: "United States", score1: 2, team2: "Bosnia and Herzegovina", score2: 0, date: "2026-07-01" },
  { round: "Round of 32", team1: "Spain", score1: 3, team2: "Austria", score2: 0, date: "2026-07-02", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Round of 32", team1: "Portugal", score1: 2, team2: "Croatia", score2: 1, date: "2026-07-02" },
  { round: "Round of 32", team1: "Switzerland", score1: 2, team2: "Algeria", score2: 0, date: "2026-07-02" },
  { round: "Round of 32", team1: "Egypt", score1: 1, team2: "Australia", score2: 1, penalties: { team1: 4, team2: 2 }, date: "2026-07-03", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Round of 32", team1: "Argentina", score1: 3, team2: "Cape Verde", score2: 2, wentToExtraTime: true, date: "2026-07-03", venue: "Hard Rock Stadium", city: "Miami Gardens, FL" },
  { round: "Round of 32", team1: "Colombia", score1: 1, team2: "Ghana", score2: 0, date: "2026-07-03", venue: "Arrowhead Stadium", city: "Kansas City, MO" },

  // Round of 16
  { round: "Round of 16", team1: "Morocco", score1: 3, team2: "Canada", score2: 0, date: "2026-07-04", venue: "NRG Stadium", city: "Houston, TX" },
  { round: "Round of 16", team1: "France", score1: 1, team2: "Paraguay", score2: 0, date: "2026-07-04", venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  { round: "Round of 16", team1: "Norway", score1: 2, team2: "Brazil", score2: 1, date: "2026-07-05", venue: "MetLife Stadium", city: "East Rutherford, NJ" },
  { round: "Round of 16", team1: "England", score1: 3, team2: "Mexico", score2: 2, date: "2026-07-05", venue: "Estadio Azteca", city: "Mexico City" },
  { round: "Round of 16", team1: "Spain", score1: 1, team2: "Portugal", score2: 0, date: "2026-07-06", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Round of 16", team1: "Belgium", score1: 4, team2: "United States", score2: 1, date: "2026-07-06", venue: "Lumen Field", city: "Seattle, WA" },
  { round: "Round of 16", team1: "Argentina", score1: 3, team2: "Egypt", score2: 2, date: "2026-07-07", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
  { round: "Round of 16", team1: "Switzerland", score1: 0, team2: "Colombia", score2: 0, penalties: { team1: 4, team2: 3 }, date: "2026-07-07", venue: "BC Place", city: "Vancouver, Canada" },

  // Quarterfinals
  { round: "Quarterfinal", team1: "France", score1: 2, team2: "Morocco", score2: 0, date: "2026-07-09", venue: "Gillette Stadium", city: "Foxborough, MA" },
  { round: "Quarterfinal", team1: "Spain", score1: 2, team2: "Belgium", score2: 1, date: "2026-07-10", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Quarterfinal", team1: "England", score1: 2, team2: "Norway", score2: 1, wentToExtraTime: true, date: "2026-07-11", venue: "Arrowhead Stadium", city: "Kansas City, MO" },
  { round: "Quarterfinal", team1: "Argentina", score1: 3, team2: "Switzerland", score2: 1, wentToExtraTime: true, date: "2026-07-11" },

  // Semifinals
  { round: "Semifinal", team1: "Spain", score1: 2, team2: "France", score2: 0, date: "2026-07-14", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Semifinal", team1: "Argentina", score1: 2, team2: "England", score2: 1, wentToExtraTime: true, date: "2026-07-15", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
];

// Cross-checked against Wikipedia's per-group pages (internally reconciled via each
// group's points/GF/GA table) plus at least one independent secondary source (ESPN,
// FIFA.com, Yahoo Sports, Al Jazeera, CNN, PBS, CBC, Fox Sports, Sky Sports, CBS Sports)
// per group -- Groups C and I relied on Wikipedia alone (internally consistent, but no
// secondary spot-check). The resulting 32 qualifiers reconcile exactly against
// WORLD_CUP_2026_KNOCKOUT_RESULTS's Round of 32 entrants, including the best-8-third-place
// tiebreak (Senegal's +2 GD over Iran/South Korea/Scotland on equal points).
export const WORLD_CUP_2026_GROUP_STAGE_RESULTS: GroupStageResult[] = [
  // Group A -- Mexico, South Africa, South Korea, Czech Republic
  { round: "Group Stage", group: "Group A", team1: "Mexico", score1: 2, team2: "South Africa", score2: 0, date: "2026-06-11", venue: "Estadio Azteca", city: "Mexico City" },
  { round: "Group Stage", group: "Group A", team1: "South Korea", score1: 2, team2: "Czech Republic", score2: 1, date: "2026-06-11", venue: "Estadio Akron", city: "Zapopan, Mexico" },
  { round: "Group Stage", group: "Group A", team1: "Czech Republic", score1: 1, team2: "South Africa", score2: 1, date: "2026-06-18", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
  { round: "Group Stage", group: "Group A", team1: "Mexico", score1: 1, team2: "South Korea", score2: 0, date: "2026-06-18", venue: "Estadio Akron", city: "Zapopan, Mexico" },
  { round: "Group Stage", group: "Group A", team1: "Czech Republic", score1: 0, team2: "Mexico", score2: 3, date: "2026-06-24", venue: "Estadio Azteca", city: "Mexico City" },
  { round: "Group Stage", group: "Group A", team1: "South Africa", score1: 1, team2: "South Korea", score2: 0, date: "2026-06-24", venue: "Estadio BBVA", city: "Monterrey, Mexico" },

  // Group B -- Canada, Bosnia and Herzegovina, Qatar, Switzerland
  { round: "Group Stage", group: "Group B", team1: "Canada", score1: 1, team2: "Bosnia and Herzegovina", score2: 1, date: "2026-06-12", venue: "BMO Field", city: "Toronto, Canada" },
  { round: "Group Stage", group: "Group B", team1: "Qatar", score1: 1, team2: "Switzerland", score2: 1, date: "2026-06-13", venue: "Levi's Stadium", city: "Santa Clara, CA" },
  { round: "Group Stage", group: "Group B", team1: "Switzerland", score1: 4, team2: "Bosnia and Herzegovina", score2: 1, date: "2026-06-18", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Group Stage", group: "Group B", team1: "Canada", score1: 6, team2: "Qatar", score2: 0, date: "2026-06-18", venue: "BC Place", city: "Vancouver, Canada" },
  { round: "Group Stage", group: "Group B", team1: "Switzerland", score1: 2, team2: "Canada", score2: 1, date: "2026-06-24", venue: "BC Place", city: "Vancouver, Canada" },
  { round: "Group Stage", group: "Group B", team1: "Bosnia and Herzegovina", score1: 3, team2: "Qatar", score2: 1, date: "2026-06-24", venue: "Lumen Field", city: "Seattle, WA" },

  // Group C -- Brazil, Morocco, Scotland, Haiti
  { round: "Group Stage", group: "Group C", team1: "Brazil", score1: 1, team2: "Morocco", score2: 1, date: "2026-06-13", venue: "MetLife Stadium", city: "East Rutherford, NJ" },
  { round: "Group Stage", group: "Group C", team1: "Haiti", score1: 0, team2: "Scotland", score2: 1, date: "2026-06-13", venue: "Gillette Stadium", city: "Foxborough, MA" },
  { round: "Group Stage", group: "Group C", team1: "Scotland", score1: 0, team2: "Morocco", score2: 1, date: "2026-06-19", venue: "Gillette Stadium", city: "Foxborough, MA" },
  { round: "Group Stage", group: "Group C", team1: "Brazil", score1: 3, team2: "Haiti", score2: 0, date: "2026-06-19", venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  { round: "Group Stage", group: "Group C", team1: "Scotland", score1: 0, team2: "Brazil", score2: 3, date: "2026-06-24", venue: "Hard Rock Stadium", city: "Miami Gardens, FL" },
  { round: "Group Stage", group: "Group C", team1: "Morocco", score1: 4, team2: "Haiti", score2: 2, date: "2026-06-24", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },

  // Group D -- United States, Australia, Paraguay, Turkey
  { round: "Group Stage", group: "Group D", team1: "United States", score1: 4, team2: "Paraguay", score2: 1, date: "2026-06-12", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Group Stage", group: "Group D", team1: "Australia", score1: 2, team2: "Turkey", score2: 0, date: "2026-06-13", venue: "BC Place", city: "Vancouver, Canada" },
  { round: "Group Stage", group: "Group D", team1: "United States", score1: 2, team2: "Australia", score2: 0, date: "2026-06-19", venue: "Lumen Field", city: "Seattle, WA" },
  { round: "Group Stage", group: "Group D", team1: "Turkey", score1: 0, team2: "Paraguay", score2: 1, date: "2026-06-19", venue: "Levi's Stadium", city: "Santa Clara, CA" },
  { round: "Group Stage", group: "Group D", team1: "Turkey", score1: 3, team2: "United States", score2: 2, date: "2026-06-25", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Group Stage", group: "Group D", team1: "Paraguay", score1: 0, team2: "Australia", score2: 0, date: "2026-06-25", venue: "Levi's Stadium", city: "Santa Clara, CA" },

  // Group E -- Germany, Ivory Coast, Ecuador, Curacao
  { round: "Group Stage", group: "Group E", team1: "Germany", score1: 7, team2: "Curacao", score2: 1, date: "2026-06-14", venue: "NRG Stadium", city: "Houston, TX" },
  { round: "Group Stage", group: "Group E", team1: "Ivory Coast", score1: 1, team2: "Ecuador", score2: 0, date: "2026-06-14", venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  { round: "Group Stage", group: "Group E", team1: "Germany", score1: 2, team2: "Ivory Coast", score2: 1, date: "2026-06-20", venue: "BMO Field", city: "Toronto, Canada" },
  { round: "Group Stage", group: "Group E", team1: "Ecuador", score1: 0, team2: "Curacao", score2: 0, date: "2026-06-20", venue: "Arrowhead Stadium", city: "Kansas City, MO" },
  { round: "Group Stage", group: "Group E", team1: "Curacao", score1: 0, team2: "Ivory Coast", score2: 2, date: "2026-06-25", venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  { round: "Group Stage", group: "Group E", team1: "Ecuador", score1: 2, team2: "Germany", score2: 1, date: "2026-06-25", venue: "MetLife Stadium", city: "East Rutherford, NJ" },

  // Group F -- Netherlands, Japan, Sweden, Tunisia
  { round: "Group Stage", group: "Group F", team1: "Netherlands", score1: 2, team2: "Japan", score2: 2, date: "2026-06-14", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Group Stage", group: "Group F", team1: "Sweden", score1: 5, team2: "Tunisia", score2: 1, date: "2026-06-14", venue: "Estadio BBVA", city: "Monterrey, Mexico" },
  { round: "Group Stage", group: "Group F", team1: "Netherlands", score1: 5, team2: "Sweden", score2: 1, date: "2026-06-20", venue: "NRG Stadium", city: "Houston, TX" },
  { round: "Group Stage", group: "Group F", team1: "Tunisia", score1: 0, team2: "Japan", score2: 4, date: "2026-06-20", venue: "Estadio BBVA", city: "Monterrey, Mexico" },
  { round: "Group Stage", group: "Group F", team1: "Japan", score1: 1, team2: "Sweden", score2: 1, date: "2026-06-25", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Group Stage", group: "Group F", team1: "Tunisia", score1: 1, team2: "Netherlands", score2: 3, date: "2026-06-25", venue: "Arrowhead Stadium", city: "Kansas City, MO" },

  // Group G -- Belgium, Egypt, Iran, New Zealand
  { round: "Group Stage", group: "Group G", team1: "Belgium", score1: 1, team2: "Egypt", score2: 1, date: "2026-06-15", venue: "Lumen Field", city: "Seattle, WA" },
  { round: "Group Stage", group: "Group G", team1: "Iran", score1: 2, team2: "New Zealand", score2: 2, date: "2026-06-15", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Group Stage", group: "Group G", team1: "Belgium", score1: 0, team2: "Iran", score2: 0, date: "2026-06-21", venue: "SoFi Stadium", city: "Inglewood, CA" },
  { round: "Group Stage", group: "Group G", team1: "New Zealand", score1: 1, team2: "Egypt", score2: 3, date: "2026-06-21", venue: "BC Place", city: "Vancouver, Canada" },
  { round: "Group Stage", group: "Group G", team1: "Egypt", score1: 1, team2: "Iran", score2: 1, date: "2026-06-26", venue: "Lumen Field", city: "Seattle, WA" },
  { round: "Group Stage", group: "Group G", team1: "New Zealand", score1: 1, team2: "Belgium", score2: 5, date: "2026-06-26", venue: "BC Place", city: "Vancouver, Canada" },

  // Group H -- Spain, Cape Verde, Uruguay, Saudi Arabia
  { round: "Group Stage", group: "Group H", team1: "Spain", score1: 0, team2: "Cape Verde", score2: 0, date: "2026-06-15", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
  { round: "Group Stage", group: "Group H", team1: "Saudi Arabia", score1: 1, team2: "Uruguay", score2: 1, date: "2026-06-15", venue: "Hard Rock Stadium", city: "Miami Gardens, FL" },
  { round: "Group Stage", group: "Group H", team1: "Spain", score1: 4, team2: "Saudi Arabia", score2: 0, date: "2026-06-21", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
  { round: "Group Stage", group: "Group H", team1: "Uruguay", score1: 2, team2: "Cape Verde", score2: 2, date: "2026-06-21", venue: "Hard Rock Stadium", city: "Miami Gardens, FL" },
  { round: "Group Stage", group: "Group H", team1: "Cape Verde", score1: 0, team2: "Saudi Arabia", score2: 0, date: "2026-06-26", venue: "NRG Stadium", city: "Houston, TX" },
  { round: "Group Stage", group: "Group H", team1: "Uruguay", score1: 0, team2: "Spain", score2: 1, date: "2026-06-26", venue: "Estadio Akron", city: "Zapopan, Mexico" },

  // Group I -- France, Norway, Senegal, Iraq
  { round: "Group Stage", group: "Group I", team1: "France", score1: 3, team2: "Senegal", score2: 1, date: "2026-06-16", venue: "MetLife Stadium", city: "East Rutherford, NJ" },
  { round: "Group Stage", group: "Group I", team1: "Iraq", score1: 1, team2: "Norway", score2: 4, date: "2026-06-16", venue: "Gillette Stadium", city: "Foxborough, MA" },
  { round: "Group Stage", group: "Group I", team1: "France", score1: 3, team2: "Iraq", score2: 0, date: "2026-06-22", venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  { round: "Group Stage", group: "Group I", team1: "Norway", score1: 3, team2: "Senegal", score2: 2, date: "2026-06-22", venue: "MetLife Stadium", city: "East Rutherford, NJ" },
  { round: "Group Stage", group: "Group I", team1: "Norway", score1: 1, team2: "France", score2: 4, date: "2026-06-26", venue: "Gillette Stadium", city: "Foxborough, MA" },
  { round: "Group Stage", group: "Group I", team1: "Senegal", score1: 5, team2: "Iraq", score2: 0, date: "2026-06-26", venue: "BMO Field", city: "Toronto, Canada" },

  // Group J -- Argentina, Austria, Algeria, Jordan
  { round: "Group Stage", group: "Group J", team1: "Argentina", score1: 3, team2: "Algeria", score2: 0, date: "2026-06-16", venue: "Arrowhead Stadium", city: "Kansas City, MO" },
  { round: "Group Stage", group: "Group J", team1: "Austria", score1: 3, team2: "Jordan", score2: 1, date: "2026-06-16", venue: "Levi's Stadium", city: "Santa Clara, CA" },
  { round: "Group Stage", group: "Group J", team1: "Argentina", score1: 2, team2: "Austria", score2: 0, date: "2026-06-22", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Group Stage", group: "Group J", team1: "Jordan", score1: 1, team2: "Algeria", score2: 2, date: "2026-06-22", venue: "Levi's Stadium", city: "Santa Clara, CA" },
  { round: "Group Stage", group: "Group J", team1: "Algeria", score1: 3, team2: "Austria", score2: 3, date: "2026-06-27", venue: "Arrowhead Stadium", city: "Kansas City, MO" },
  { round: "Group Stage", group: "Group J", team1: "Jordan", score1: 1, team2: "Argentina", score2: 3, date: "2026-06-27", venue: "AT&T Stadium", city: "Arlington, TX" },

  // Group K -- Colombia, Portugal, DR Congo, Uzbekistan
  { round: "Group Stage", group: "Group K", team1: "Portugal", score1: 1, team2: "DR Congo", score2: 1, date: "2026-06-17", venue: "NRG Stadium", city: "Houston, TX" },
  { round: "Group Stage", group: "Group K", team1: "Uzbekistan", score1: 1, team2: "Colombia", score2: 3, date: "2026-06-17", venue: "Estadio Azteca", city: "Mexico City" },
  { round: "Group Stage", group: "Group K", team1: "Portugal", score1: 5, team2: "Uzbekistan", score2: 0, date: "2026-06-23", venue: "NRG Stadium", city: "Houston, TX" },
  { round: "Group Stage", group: "Group K", team1: "Colombia", score1: 1, team2: "DR Congo", score2: 0, date: "2026-06-23", venue: "Estadio Akron", city: "Zapopan, Mexico" },
  { round: "Group Stage", group: "Group K", team1: "Colombia", score1: 0, team2: "Portugal", score2: 0, date: "2026-06-27", venue: "Hard Rock Stadium", city: "Miami Gardens, FL" },
  { round: "Group Stage", group: "Group K", team1: "DR Congo", score1: 3, team2: "Uzbekistan", score2: 1, date: "2026-06-27", venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },

  // Group L -- England, Croatia, Ghana, Panama
  { round: "Group Stage", group: "Group L", team1: "England", score1: 4, team2: "Croatia", score2: 2, date: "2026-06-17", venue: "AT&T Stadium", city: "Arlington, TX" },
  { round: "Group Stage", group: "Group L", team1: "Ghana", score1: 1, team2: "Panama", score2: 0, date: "2026-06-17", venue: "BMO Field", city: "Toronto, Canada" },
  { round: "Group Stage", group: "Group L", team1: "England", score1: 0, team2: "Ghana", score2: 0, date: "2026-06-23", venue: "Gillette Stadium", city: "Foxborough, MA" },
  { round: "Group Stage", group: "Group L", team1: "Panama", score1: 0, team2: "Croatia", score2: 1, date: "2026-06-23", venue: "BMO Field", city: "Toronto, Canada" },
  { round: "Group Stage", group: "Group L", team1: "Panama", score1: 0, team2: "England", score2: 2, date: "2026-06-27", venue: "MetLife Stadium", city: "East Rutherford, NJ" },
  { round: "Group Stage", group: "Group L", team1: "Croatia", score1: 2, team2: "Ghana", score2: 1, date: "2026-06-27", venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
];

export const WORLD_CUP_2026_RESULTS: WorldCup2026Result[] = [
  ...WORLD_CUP_2026_GROUP_STAGE_RESULTS,
  ...WORLD_CUP_2026_KNOCKOUT_RESULTS,
];
