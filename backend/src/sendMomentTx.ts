import type { Connection } from "@solana/web3.js";
import { sendMemoTx } from "./sendMemoTx";
import { Moment } from "./types";

function momentToMemoPayload(moment: Moment): object {
  return {
    fixtureId: moment.fixtureId,
    competition: moment.competition,
    team: moment.team,
    opponent: moment.opponent,
    from: moment.fromProbability,
    to: moment.toProbability,
    delta: moment.deltaProbability,
    minute: moment.matchMinute,
    kind: moment.kind,
    ts: moment.timestamp,
  };
}

/** Send one devnet memo transaction encoding a Moment. Returns the confirmed signature. */
export async function sendMomentTx(moment: Moment, connection?: Connection): Promise<string> {
  const signature = await sendMemoTx(momentToMemoPayload(moment), connection);

  console.log(`[sendMomentTx] ${moment.narrative}`);
  console.log(`[sendMomentTx] Confirmed: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  return signature;
}
