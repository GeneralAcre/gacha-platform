import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { config } from "./config";
import { Moment } from "./types";

// SPL Memo program, same on devnet and mainnet.
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

let cachedKeypair: Keypair | null = null;
function loadKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;
  // Hosting platforms (Railway, Render, ...) have no access to a local keypair
  // file, so SOLANA_KEYPAIR_JSON (the same JSON array a file would contain) can
  // be set as an env var instead. Local dev keeps using the gitignored file.
  const raw = process.env.SOLANA_KEYPAIR_JSON ?? fs.readFileSync(config.solanaKeypairPath, "utf8");
  const secret = Uint8Array.from(JSON.parse(raw));
  cachedKeypair = Keypair.fromSecretKey(secret);
  return cachedKeypair;
}

function momentToMemoPayload(moment: Moment): string {
  return JSON.stringify({
    fixtureId: moment.fixtureId,
    team: moment.team,
    opponent: moment.opponent,
    from: moment.fromProbability,
    to: moment.toProbability,
    delta: moment.deltaProbability,
    minute: moment.matchMinute,
    kind: moment.kind,
    ts: moment.timestamp,
  });
}

/** Send one devnet memo transaction encoding a Moment. Returns the confirmed signature. */
export async function sendMomentTx(moment: Moment, connection?: Connection): Promise<string> {
  const conn = connection ?? new Connection(config.solanaRpcUrl, "confirmed");
  const payer = loadKeypair();
  const memoText = momentToMemoPayload(moment);

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoText, "utf8"),
  });

  const tx = new Transaction().add(instruction);
  const latestBlockhash = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);

  const signature = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");

  console.log(`[sendMomentTx] ${moment.narrative}`);
  console.log(`[sendMomentTx] Confirmed: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  return signature;
}
