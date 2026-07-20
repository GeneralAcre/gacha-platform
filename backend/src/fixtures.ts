/**
 * Fixture browser: every match ever seen in TxLINE's tier (past, live, and
 * upcoming), with the latest full-match win-probability snapshot for each
 * where available. Backs GET /fixtures.
 *
 * Reads from txlineClient's persistent fixture registry rather than a fresh
 * /fixtures/snapshot call each time -- TxLINE's own snapshot drops a fixture
 * once it finishes, so relying on it directly would make finished matches
 * vanish from the "past" list the moment TxLINE stops listing them.
 */
import { createTxlineApiClient } from "./txlineAuth";
import { refreshFixtureRegistry, HOT_WINDOW_MS } from "./txlineClient";
import { RawOdds, findMatchWinnerEntry, impliedProbabilities } from "./oddsMath";

export interface FixtureSummary {
  fixtureId: number;
  competition: string;
  participant1: string;
  participant2: string;
  startTimeMs: number;
  status: "upcoming" | "live" | "past";
  /** Latest known full-match win probabilities (0-100), if TxLINE has published any odds for this fixture yet. */
  winProbability?: { participant1: number; participant2: number };
}

async function fetchLatestWinProbability(
  client: ReturnType<typeof createTxlineApiClient>,
  fixtureId: number
): Promise<{ participant1: number; participant2: number } | undefined> {
  try {
    const resp = await client.get(`/odds/snapshot/${fixtureId}`);
    const entry = findMatchWinnerEntry(resp.data as RawOdds[]);
    if (!entry) return undefined;

    const normalized = impliedProbabilities(entry.Prices);
    const part1Index = entry.PriceNames.indexOf("part1");
    const part2Index = entry.PriceNames.indexOf("part2");
    if (part1Index === -1 || part2Index === -1) return undefined;

    return { participant1: normalized[part1Index], participant2: normalized[part2Index] };
  } catch {
    return undefined; // no odds published for this fixture yet -- not an error condition
  }
}

/** Standalone one-off version of fetchLatestWinProbability for callers outside the
 * fetchFixtureSummaries loop (matchEventMoments.ts, reacting to a single admin-reported
 * event) that don't already have a TxLINE client handy. */
export async function fetchCurrentWinProbability(
  fixtureId: number
): Promise<{ participant1: number; participant2: number } | undefined> {
  return fetchLatestWinProbability(createTxlineApiClient(), fixtureId);
}

function classifyStatus(startTimeMs: number | undefined, now: number): FixtureSummary["status"] {
  if (startTimeMs === undefined || startTimeMs > now) return "upcoming";
  return now - startTimeMs < HOT_WINDOW_MS ? "live" : "past";
}

export async function fetchFixtureSummaries(): Promise<FixtureSummary[]> {
  const fixtureMeta = await refreshFixtureRegistry();
  const client = createTxlineApiClient();
  const now = Date.now();

  const summaries = await Promise.all(
    [...fixtureMeta.values()].map(async (meta): Promise<FixtureSummary> => ({
      fixtureId: meta.fixtureId,
      competition: meta.competition,
      participant1: meta.participant1,
      participant2: meta.participant2,
      startTimeMs: meta.startTimeMs ?? 0,
      status: classifyStatus(meta.startTimeMs, now),
      winProbability: await fetchLatestWinProbability(client, meta.fixtureId),
    }))
  );

  return summaries.sort((a, b) => a.startTimeMs - b.startTimeMs);
}
