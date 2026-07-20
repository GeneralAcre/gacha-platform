import { SwingDetector } from "./swingDetector";

/** Single shared detector instance for real TxLINE-sourced odds, used by both the
 * background live-odds watcher (server.ts's watchLiveOdds) and admin-reported match
 * events (matchEventMoments.ts) -- so a card/goal report can compare against the exact
 * same up-to-the-second per-fixture history the algorithmic swing detector already has,
 * rather than tracking a separate, possibly-stale copy of it. */
export const liveDetector = new SwingDetector();
