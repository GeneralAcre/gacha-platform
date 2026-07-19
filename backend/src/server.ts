/**
 * Moments API for the frontend to poll, plus an admin API for curating match metadata
 * (see adminMatches.ts). Sealed Moments (momentsStore.ts) and the TxLINE fixture registry
 * (txlineClient.ts) are now file-persisted, same as admin-curated match metadata
 * (matchMetadataStore.ts); admin routes require a real server-checked token (adminAuth.ts).
 */
import express from "express";
import cors from "cors";
import * as path from "path";
import { runSyntheticMoments } from "./synthetic";
import { SwingDetector } from "./swingDetector";
import { sendMomentTx } from "./sendMomentTx";
import { MomentResult } from "./types";
import { appendMoments, getRecentMoments } from "./momentsStore";
import { fetchFixtureSummaries, FixtureSummary } from "./fixtures";
import { fetchCollection, CollectionEntry } from "./collection";
import { addMatchEvent, assertMatchExists, enrichCollectionEntries, listAdminMatches, matchImageForFixture, removeMatchEvent, updateAdminMatch } from "./adminMatches";
import type { MatchEventType } from "./matchMetadataStore";
import { saveUploadedMatchImage } from "./matchImages";
import { login, logout, requireAdmin } from "./adminAuth";

const PORT = Number(process.env.PORT) || 8787;
const RECONNECT_DELAY_MS = 5000;

/** Attaches each Moment's match image and persists it (newest-first, see momentsStore.ts).
 * Returns the enriched results in the same order they were passed in. */
async function recordMoments(results: MomentResult[]): Promise<MomentResult[]> {
  const enriched: MomentResult[] = [];
  for (const result of results) {
    const imageUrl = await matchImageForFixture(result.fixtureId, result.team, result.opponent).catch(() => undefined);
    enriched.push(imageUrl ? { ...result, imageUrl } : result);
  }
  appendMoments(enriched);
  return enriched;
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
          await recordMoments([{ ...moment, signature }]);
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
// Default 100kb is too small for an admin image upload sent as a base64 JSON body
// (POST /admin/matches/:id/image) -- everything else on this API is tiny by comparison.
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "moments-backend" });
});

app.get("/moments/recent", (req, res) => {
  const n = Number(req.query.n) || 20;
  res.json(getRecentMoments(n));
});

app.post("/moments/simulate", async (_req, res) => {
  try {
    console.log("[server] /moments/simulate triggered");
    const results = await runSyntheticMoments();
    const enriched = await recordMoments(results);
    res.json(enriched);
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
      collectionCache = { fetchedAt: Date.now(), data: await enrichCollectionEntries(await fetchCollection()) };
    }
    res.json(collectionCache.data);
  } catch (err: any) {
    console.error("[server] /collection failed:", err.response?.data ?? err.message ?? err);
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// Generated + admin-curated match cover images (see matchImages.ts / matchMetadataStore.ts).
app.use("/media", express.static(path.resolve(__dirname, "..", "media")));

// -- Admin: match metadata curation (stadium/city/cover image) -------------------------
// Score, status, and win probability are never accepted here -- see adminMatches.ts.

app.post("/admin/login", (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  try {
    const token = login(password);
    if (!token) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    res.json({ token });
  } catch (err: any) {
    res.status(503).json({ error: err.message });
  }
});

app.post("/admin/logout", requireAdmin, (req, res) => {
  const token = (req.header("authorization") ?? "").slice("Bearer ".length);
  logout(token);
  res.status(204).end();
});

app.get("/admin/matches", requireAdmin, async (_req, res) => {
  try {
    res.json(await listAdminMatches());
  } catch (err: any) {
    console.error("[server] /admin/matches failed:", err.response?.data ?? err.message ?? err);
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

const EDITABLE_FIELDS = ["stadium", "city", "imageUrl"] as const;
const READ_ONLY_FIELDS = ["score", "status", "probabilities", "winProbability"];

app.put("/admin/matches/:id", requireAdmin, async (req, res) => {
  const rejected = READ_ONLY_FIELDS.filter((f) => req.body?.[f] !== undefined);
  if (rejected.length > 0) {
    res.status(400).json({
      error: `${rejected.join(", ")} come from TxLINE and can't be edited here. Only ${EDITABLE_FIELDS.join(", ")} are admin-curated.`,
    });
    return;
  }

  const patch: { stadium?: string; city?: string; imageUrl?: string } = {};
  for (const field of EDITABLE_FIELDS) {
    if (typeof req.body?.[field] === "string") patch[field] = req.body[field];
  }

  try {
    const updated = await updateAdminMatch(req.params.id, patch, "admin");
    collectionCache = null; // force the public /collection response to pick up the change
    res.json(updated);
  } catch (err: any) {
    console.error("[server] PUT /admin/matches failed:", err.response?.data ?? err.message ?? err);
    res.status(err.message?.startsWith("Unknown match id") ? 404 : 500).json({ error: err.message ?? String(err) });
  }
});

/** Stores an actual uploaded card image (not just a link to an externally-hosted one),
 * then runs it through the normal updateAdminMatch flow so the upload gets sealed
 * on-chain exactly like a pasted imageUrl does. Body: { imageData: "data:<mime>;base64,..." }. */
app.post("/admin/matches/:id/image", requireAdmin, async (req, res) => {
  const imageData = req.body?.imageData;
  if (typeof imageData !== "string") {
    res.status(400).json({ error: "imageData (base64 data URL) is required" });
    return;
  }

  try {
    await assertMatchExists(req.params.id); // before writing anything to disk
    const imageUrl = saveUploadedMatchImage(req.params.id, imageData);
    const updated = await updateAdminMatch(req.params.id, { imageUrl }, "admin");
    collectionCache = null;
    res.json(updated);
  } catch (err: any) {
    console.error("[server] POST /admin/matches/:id/image failed:", err.response?.data ?? err.message ?? err);
    res.status(err.message?.startsWith("Unknown match id") ? 404 : 400).json({ error: err.message ?? String(err) });
  }
});

const EVENT_TYPES: MatchEventType[] = ["GOAL", "YELLOW_CARD", "RED_CARD"];

app.post("/admin/matches/:id/events", requireAdmin, async (req, res) => {
  const { type, minute, playerName, side } = req.body ?? {};
  if (!EVENT_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of ${EVENT_TYPES.join(", ")}` });
    return;
  }
  if (side !== "teamA" && side !== "teamB") {
    res.status(400).json({ error: 'side must be "teamA" or "teamB"' });
    return;
  }

  try {
    const updated = await addMatchEvent(req.params.id, { type, minute: Number(minute), playerName: String(playerName ?? ""), side }, "admin");
    collectionCache = null;
    res.json(updated);
  } catch (err: any) {
    console.error("[server] POST /admin/matches/:id/events failed:", err.response?.data ?? err.message ?? err);
    res.status(err.message?.startsWith("Unknown match id") ? 404 : 400).json({ error: err.message ?? String(err) });
  }
});

app.delete("/admin/matches/:id/events/:eventId", requireAdmin, async (req, res) => {
  try {
    const updated = await removeMatchEvent(req.params.id, req.params.eventId);
    collectionCache = null;
    res.json(updated);
  } catch (err: any) {
    console.error("[server] DELETE /admin/matches/:id/events failed:", err.response?.data ?? err.message ?? err);
    res.status(err.message?.startsWith("Unknown") ? 404 : 500).json({ error: err.message ?? String(err) });
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
