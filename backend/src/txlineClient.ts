/**
 * TxLINE odds ingestion: SSE stream and REST snapshot polling run CONCURRENTLY
 * (not stream-then-fallback), each self-healing, merged into one OddsUpdate
 * stream. Covers every fixture TxLINE's free tier returns, and re-scans the
 * fixture list periodically so newly added matches are picked up without a
 * restart. Real-time is prioritized two ways: the SSE stream is retried
 * forever (never permanently abandoned after one failed attempt), and REST
 * polling runs fixtures that are live or recently kicked off far more often
 * than ones that haven't started yet.
 *
 * Real payload shape (confirmed 2026-07-16 against a live World Cup fixture,
 * England vs Argentina, FixtureId 18241006, via /api/odds/snapshot/{fixtureId}):
 *
 *   {
 *     "FixtureId": 18241006,
 *     "MessageId": "1837915381:00003:000181-10021-stab",
 *     "Ts": 1784138196910,
 *     "Bookmaker": "TXLineStablePriceDemargined",
 *     "BookmakerId": 10021,
 *     "SuperOddsType": "1X2_PARTICIPANT_RESULT",
 *     "InRunning": false,
 *     "MarketParameters": null,
 *     "MarketPeriod": null,
 *     "PriceNames": ["part1", "draw", "part2"],
 *     "Prices": [2788, 3042, 3199],
 *     "Pct": ["35.868", "32.873", "31.260"]
 *   }
 *
 * `Prices` are DECIMAL ODDS * 1000 (2788 -> 2.788). `Pct` is TxLINE's own
 * precomputed, de-vigged implied-probability percentage for the same entry
 * (matches 100 / (Prices[i] / 1000) to 3dp in every sample checked). The
 * "...Demargined" bookmaker name means the vig has already been stripped
 * server-side -- raw implied probabilities already sum to ~100 without any
 * de-vig math on our end. We still recompute and re-normalize defensively
 * from Prices (rather than trusting Pct blindly) in case a future market/
 * bookmaker entry isn't pre-demargined.
 *
 * We only use the full-match match-winner market: SuperOddsType
 * "1X2_PARTICIPANT_RESULT" with MarketPeriod === null (as opposed to e.g.
 * "half=1", or ASIANHANDICAP_/OVERUNDER_ markets, which are ignored).
 *
 * The schema has no match-minute field, so OddsUpdate.matchMinute is left
 * undefined for real TxLINE data (only the synthetic test harness sets it).
 */
import { config } from "./config";
import { createTxlineApiClient, getSession } from "./txlineAuth";
import { OddsUpdate } from "./types";
import { MATCH_WINNER_TYPE, RawOdds, impliedProbabilities } from "./oddsMath";

const SSE_IDLE_TIMEOUT_MS = 30_000;
const SSE_RETRY_DELAY_MS = 20_000;

export const HOT_POLL_INTERVAL_MS = 3_000; // live or recently-kicked-off fixtures
export const COLD_POLL_INTERVAL_MS = 30_000; // not started yet (or long finished)
export const HOT_WINDOW_MS = 3 * 60 * 60 * 1000; // treat a fixture as "could still be live" for 3h after kickoff
const POLL_TICK_MS = 1_000; // how often the poll loop checks which fixtures are due

const FIXTURE_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // re-scan for newly added fixtures

export interface FixtureMeta {
  fixtureId: number;
  competition: string;
  participant1: string;
  participant2: string;
  startTimeMs?: number;
}

/**
 * TxLINE's own /fixtures/snapshot only lists what's currently upcoming or
 * recently live -- a fixture drops out of it once it's finished. This
 * registry accumulates every fixture ever seen for the process lifetime, so
 * a match that finishes and falls out of TxLINE's list is still available
 * to us afterward (for the past-matches view, and so a live watcher already
 * mid-match doesn't lose its fixture metadata).
 */
const fixtureRegistry = new Map<number, FixtureMeta>();

async function fetchFixtureMeta(): Promise<Map<number, FixtureMeta>> {
  const client = createTxlineApiClient();
  const resp = await client.get("/fixtures/snapshot");
  const map = new Map<number, FixtureMeta>();
  for (const f of resp.data as any[]) {
    map.set(f.FixtureId, {
      fixtureId: f.FixtureId,
      competition: f.Competition,
      participant1: f.Participant1,
      participant2: f.Participant2,
      startTimeMs: typeof f.StartTime === "number" ? f.StartTime : undefined,
    });
  }
  return map;
}

/** Merges the latest TxLINE fixture list into the persistent registry (never removes entries) and returns it. */
export async function refreshFixtureRegistry(): Promise<Map<number, FixtureMeta>> {
  const fresh = await fetchFixtureMeta();
  for (const [id, meta] of fresh) fixtureRegistry.set(id, meta);
  return fixtureRegistry;
}

async function runFixtureRefreshLoop(): Promise<never> {
  for (;;) {
    await sleep(FIXTURE_REFRESH_INTERVAL_MS);
    try {
      await refreshFixtureRegistry();
    } catch (err: any) {
      console.warn("[txlineClient] Fixture list refresh failed:", err.response?.status ?? err.message);
    }
  }
}

/** Turn one raw Odds record into 0-2 OddsUpdate (one per non-draw participant), or [] if it's not the market we care about. */
function normalizeOddsEntry(raw: RawOdds, fixtureMeta: Map<number, FixtureMeta>): OddsUpdate[] {
  if (raw.SuperOddsType !== MATCH_WINNER_TYPE || raw.MarketPeriod !== null) return [];

  const meta = fixtureMeta.get(raw.FixtureId);
  if (!meta) return [];

  const normalized = impliedProbabilities(raw.Prices);

  const updates: OddsUpdate[] = [];
  raw.PriceNames.forEach((name, i) => {
    if (name === "draw") return;
    const isPart1 = name === "part1";
    updates.push({
      fixtureId: raw.FixtureId,
      competition: meta.competition,
      team: isPart1 ? meta.participant1 : meta.participant2,
      opponent: isPart1 ? meta.participant2 : meta.participant1,
      winProbability: normalized[i],
      timestamp: raw.Ts,
      matchStarted: meta.startTimeMs !== undefined && raw.Ts >= meta.startTimeMs,
    });
  });
  return updates;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SseMessage {
  id?: string;
  event?: string;
  data: string;
}

function parseSseBlock(block: string): SseMessage | null {
  const dataLines: string[] = [];
  let id: string | undefined;
  let event: string | undefined;
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    else if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("id:")) id = line.slice(3).trim();
  }
  if (dataLines.length === 0) return null;
  return { id, event, data: dataLines.join("\n") };
}

async function* readSseMessages(response: Response, onMessage: () => void): AsyncGenerator<SseMessage> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let sepIndex: number;
      while ((sepIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const rawBlock = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex).replace(/^(\r?\n)+/, "");
        const message = parseSseBlock(rawBlock);
        if (message) {
          onMessage();
          yield message;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** One SSE connection attempt. Aborts itself (connect phase included) after SSE_IDLE_TIMEOUT_MS with no message. */
async function* streamOddsOnce(
  fixtureMeta: Map<number, FixtureMeta>,
  seenMessageIds: Set<string>
): AsyncGenerator<OddsUpdate> {
  const session = await getSession();
  const controller = new AbortController();
  let idleTimer: NodeJS.Timeout;

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      console.log(`[txlineClient] SSE idle timeout fired after ${SSE_IDLE_TIMEOUT_MS / 1000}s, aborting connection...`);
      controller.abort();
    }, SSE_IDLE_TIMEOUT_MS);
  };

  // Covers the connect phase too, not just post-connect idling -- fetch() has no
  // built-in timeout, so a stalled TLS handshake or a server that never replies
  // would otherwise hang this generator forever instead of retrying.
  resetIdleTimer();

  const response = await fetch(`${config.txlineApiBaseUrl}/odds/stream`, {
    headers: {
      Authorization: `Bearer ${session.jwt}`,
      "X-Api-Token": session.apiToken,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal: controller.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE connect failed: HTTP ${response.status}`);
  }

  resetIdleTimer();
  try {
    for await (const message of readSseMessages(response, resetIdleTimer)) {
      let raw: RawOdds;
      try {
        raw = JSON.parse(message.data);
      } catch {
        continue;
      }
      if (seenMessageIds.has(raw.MessageId)) continue;
      seenMessageIds.add(raw.MessageId);
      yield* normalizeOddsEntry(raw, fixtureMeta);
    }
  } finally {
    clearTimeout(idleTimer!);
  }
}

/** SSE is the true real-time channel -- keep retrying it forever (with backoff) rather than giving up after one idle timeout, so a match going live later is still caught instantly. */
async function* retryingSseStream(
  fixtureMeta: Map<number, FixtureMeta>,
  seenMessageIds: Set<string>
): AsyncGenerator<OddsUpdate> {
  for (;;) {
    try {
      yield* streamOddsOnce(fixtureMeta, seenMessageIds);
      console.log(`[txlineClient] SSE idle (no fixture pushing updates); reconnecting in ${SSE_RETRY_DELAY_MS / 1000}s...`);
    } catch (err: any) {
      console.warn("[txlineClient] SSE connection error, will retry:", err.response?.status ?? err.message);
    }
    await sleep(SSE_RETRY_DELAY_MS);
  }
}

/**
 * REST polling as a continuous, priority-aware baseline (not just a fallback):
 * fixtures that are live or within HOT_WINDOW_MS of kickoff are polled at
 * HOT_POLL_INTERVAL_MS; everything else (not started yet) at the much slower
 * COLD_POLL_INTERVAL_MS. A fixture gets promoted to "hot" the moment its
 * kickoff time passes or TxLINE marks an odds entry InRunning=true.
 */
async function* adaptivePollOdds(
  fixtureMeta: Map<number, FixtureMeta>,
  seenMessageIds: Set<string>
): AsyncGenerator<OddsUpdate> {
  const client = createTxlineApiClient();
  const lastPolledAt = new Map<number, number>();
  const knownHot = new Set<number>();

  for (;;) {
    const now = Date.now();

    for (const [fixtureId, meta] of fixtureMeta) {
      const pastKickoff = meta.startTimeMs !== undefined && meta.startTimeMs <= now;
      const withinHotWindow = meta.startTimeMs !== undefined && now - meta.startTimeMs < HOT_WINDOW_MS;
      const isHot = knownHot.has(fixtureId) || (pastKickoff && withinHotWindow);
      const interval = isHot ? HOT_POLL_INTERVAL_MS : COLD_POLL_INTERVAL_MS;

      const last = lastPolledAt.get(fixtureId) ?? 0;
      if (now - last < interval) continue;
      lastPolledAt.set(fixtureId, now);

      try {
        const resp = await client.get(`/odds/snapshot/${fixtureId}`);
        for (const raw of resp.data as RawOdds[]) {
          if (raw.InRunning) knownHot.add(fixtureId);
          if (seenMessageIds.has(raw.MessageId)) continue;
          seenMessageIds.add(raw.MessageId);
          yield* normalizeOddsEntry(raw, fixtureMeta);
        }
      } catch (err: any) {
        console.warn(`[txlineClient] Snapshot poll failed for fixture ${fixtureId}:`, err.response?.status ?? err.message);
      }
    }

    await sleep(POLL_TICK_MS);
  }
}

/** Runs multiple async generators concurrently, yielding from whichever produces a value first. A source erroring or ending doesn't stop the others. */
async function* mergeStreams<T>(...sources: AsyncGenerator<T>[]): AsyncGenerator<T> {
  const queue: T[] = [];
  let wake: (() => void) | null = null;
  let remaining = sources.length;

  const pumps = sources.map(async (source) => {
    try {
      for await (const item of source) {
        queue.push(item);
        if (wake) {
          wake();
          wake = null;
        }
      }
    } catch (err) {
      console.warn("[txlineClient] A merged odds source ended unexpectedly:", err);
    } finally {
      remaining--;
      if (wake) {
        wake();
        wake = null;
      }
    }
  });

  try {
    while (remaining > 0 || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
      }
    }
  } finally {
    await Promise.allSettled(pumps);
  }
}

/**
 * Primary entry point: SSE and adaptive REST polling run concurrently and
 * indefinitely, covering every fixture TxLINE's tier returns (re-scanned
 * periodically for newly added ones), de-duplicated by MessageId. This never
 * intentionally terminates -- callers that want a bounded run (e.g. the CLI
 * demo) should apply their own wall-clock limit while iterating.
 */
export async function* streamOrPollOdds(): AsyncGenerator<OddsUpdate> {
  const fixtureMeta = await refreshFixtureRegistry();
  const seenMessageIds = new Set<string>();

  runFixtureRefreshLoop().catch(() => {}); // detached; keeps mutating the same persistent registry

  yield* mergeStreams(retryingSseStream(fixtureMeta, seenMessageIds), adaptivePollOdds(fixtureMeta, seenMessageIds));
}
