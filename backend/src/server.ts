/**
 * Minimal Moments API for the frontend to poll. Hackathon demo server: no auth,
 * no persistence beyond process memory.
 */
import express from "express";
import cors from "cors";
import { runSyntheticMoments } from "./synthetic";
import { SwingDetector } from "./swingDetector";
import { sendMomentTx } from "./sendMomentTx";
import { MomentResult } from "./types";
import { fetchFixtureSummaries, FixtureSummary } from "./fixtures";
import { fetchCollection, CollectionEntry } from "./collection";

const PORT = Number(process.env.PORT) || 8787;
const MAX_RECENT = 50;
const RECONNECT_DELAY_MS = 5000;

const recentMoments: MomentResult[] = []; // newest first

function recordMoments(results: MomentResult[]): void {
  for (const result of results) {
    recentMoments.unshift(result);
  }
  recentMoments.length = Math.min(recentMoments.length, MAX_RECENT);
}

const HEARTBEAT_LOG_INTERVAL_MS = 30_000;

/**
 * Background loop: watches every fixture TxLINE's tier returns via
 * streamOrPollOdds() (SSE and adaptive REST polling running concurrently,
 * each self-healing -- see txlineClient.ts) and seals every detected Moment
 * on-chain automatically, independent of the on-demand /moments/simulate
 * trigger. One SwingDetector persists for the process lifetime so its
 * per-fixture rolling windows survive reconnects.
 *
 * streamOrPollOdds() is designed to run forever on its own, but this outer
 * loop is a safety net in case it ever throws (e.g. an unrecoverable auth
 * failure) instead of quietly retrying internally.
 */
async function watchLiveOdds(): Promise<void> {
  const { streamOrPollOdds } = await import("./txlineClient");
  const detector = new SwingDetector();

  for (;;) {
    try {
      console.log("[server] Connecting to live TxLINE odds (SSE + adaptive polling, every fixture in the tier)...");
      let updateCount = 0;
      let lastHeartbeatAt = 0;

      for await (const update of streamOrPollOdds()) {
        updateCount++;
        const now = Date.now();
        if (now - lastHeartbeatAt > HEARTBEAT_LOG_INTERVAL_MS) {
          lastHeartbeatAt = now;
          console.log(
            `[server] Live odds flowing (${updateCount} updates so far): ${update.team} ${update.winProbability.toFixed(1)}% (fixture ${update.fixtureId})`
          );
        }

        const moment = detector.ingest(update);
        if (!moment) continue;
        try {
          const signature = await sendMomentTx(moment);
          recordMoments([{ ...moment, signature }]);
          console.log(`[server] Live Moment sealed: ${moment.narrative} (${signature})`);
        } catch (err: any) {
          console.error("[server] Failed to seal live Moment:", err.response?.data ?? err.message ?? err);
        }
      }
      console.warn(`[server] Live odds watcher ended unexpectedly; reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
    } catch (err: any) {
      console.error("[server] Live odds watcher error:", err.response?.data ?? err.message ?? err);
    }
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "moments-backend" });
});

app.get("/moments/recent", (req, res) => {
  const n = Number(req.query.n) || 20;
  res.json(recentMoments.slice(0, n));
});

app.post("/moments/simulate", async (_req, res) => {
  try {
    console.log("[server] /moments/simulate triggered");
    const results = await runSyntheticMoments();
    recordMoments(results);
    res.json(results);
  } catch (err: any) {
    console.error("[server] /moments/simulate failed:", err.response?.data ?? err.message ?? err);
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// Short TTL cache: fetchFixtureSummaries makes one TxLINE call per fixture, no need to
// re-hit that on every frontend poll.
const FIXTURES_CACHE_TTL_MS = 10_000;
let fixturesCache: { fetchedAt: number; data: FixtureSummary[] } | null = null;

app.get("/fixtures", async (_req, res) => {
  try {
    if (!fixturesCache || Date.now() - fixturesCache.fetchedAt > FIXTURES_CACHE_TTL_MS) {
      fixturesCache = { fetchedAt: Date.now(), data: await fetchFixtureSummaries() };
    }
    res.json(fixturesCache.data);
  } catch (err: any) {
    console.error("[server] /fixtures failed:", err.response?.data ?? err.message ?? err);
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

let collectionCache: { fetchedAt: number; data: CollectionEntry[] } | null = null;

app.get("/collection", async (_req, res) => {
  try {
    if (!collectionCache || Date.now() - collectionCache.fetchedAt > FIXTURES_CACHE_TTL_MS) {
      collectionCache = { fetchedAt: Date.now(), data: await fetchCollection() };
    }
    res.json(collectionCache.data);
  } catch (err: any) {
    console.error("[server] /collection failed:", err.response?.data ?? err.message ?? err);
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Moments API listening on http://localhost:${PORT}`);

  if (process.env.DISABLE_LIVE_WATCHER === "true") {
    console.log("[server] Live TxLINE watcher disabled (DISABLE_LIVE_WATCHER=true).");
  } else {
    watchLiveOdds().catch((err) => console.error("[server] Live odds watcher crashed:", err));
  }
});
