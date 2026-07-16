/**
 * CLI test harness for the Moments pipeline.
 *
 * --synthetic  Feed a scripted OddsUpdate sequence through SwingDetector -> sendMomentTx,
 *              bypassing the real TxLINE stream entirely. Always available, no network/auth needed
 *              beyond a funded devnet keypair to pay for the memo transactions.
 * --live       Pull real odds from TxLINE (stream if a fixture is live, snapshot poll otherwise)
 *              through the same pipeline.
 */
import { SwingDetector } from "../src/swingDetector";
import { sendMomentTx } from "../src/sendMomentTx";
import { runSyntheticMoments } from "../src/synthetic";

async function runSynthetic(): Promise<string[]> {
  console.log("[simulate] Running synthetic sequence through SwingDetector -> sendMomentTx...");
  const results = await runSyntheticMoments();

  results.forEach((moment) => console.log(`[simulate] Moment detected (${moment.kind}): ${moment.narrative}`));
  if (results.length === 0) {
    console.log("[simulate] No Moments were triggered by the synthetic sequence.");
  }
  return results.map((r) => r.signature);
}

async function runLive(): Promise<string[]> {
  const { streamOrPollOdds } = await import("../src/txlineClient");
  const detector = new SwingDetector();
  const signatures: string[] = [];

  // Bounded by wall clock, not just update count: outside a live fixture window,
  // TxLINE's own odds may only change rarely (or not at all), so the demo run
  // should still terminate and show whatever real data it captured.
  const WALL_CLOCK_LIMIT_MS = 90_000;
  const deadline = Date.now() + WALL_CLOCK_LIMIT_MS;

  console.log(`[simulate] Pulling live TxLINE odds (stream, falling back to snapshot poll) for up to ${WALL_CLOCK_LIMIT_MS / 1000}s...`);
  const iterator = streamOrPollOdds();
  let updatesSeen = 0;

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const result = await Promise.race([
      iterator.next().then((r) => ({ timedOut: false as const, r })),
      new Promise<{ timedOut: true }>((resolve) => setTimeout(() => resolve({ timedOut: true }), remaining)),
    ]);

    if (result.timedOut) {
      console.log("[simulate] Wall-clock limit reached; stopping.");
      break;
    }
    if (result.r.done) break;

    const update = result.r.value;
    updatesSeen++;
    console.log(`[simulate] OddsUpdate: ${JSON.stringify(update)}`);

    const moment = detector.ingest(update);
    if (moment) {
      console.log(`[simulate] Moment detected (${moment.kind}): ${moment.narrative}`);
      const sig = await sendMomentTx(moment);
      signatures.push(sig);
      if (signatures.length >= 3) break; // enough for a demo run
    }
  }

  console.log(`[simulate] Live run finished: ${updatesSeen} real OddsUpdate(s) observed, ${signatures.length} Moment(s) triggered.`);
  return signatures;
}

async function main() {
  const mode = process.argv.includes("--live") ? "live" : "synthetic";
  const signatures = mode === "live" ? await runLive() : await runSynthetic();

  console.log(`\n[simulate] Done. ${signatures.length} Moment tx(s) sent:`);
  signatures.forEach((sig) => console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`));
}

main()
  .then(() => process.exit(0)) // force-exit: an aborted SSE connection can otherwise leave the process hanging
  .catch((err) => {
    console.error("[simulate] Failed:", err.response?.data ?? err.message ?? err);
    process.exit(1);
  });
