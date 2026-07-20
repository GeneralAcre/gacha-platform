import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { config } from "./config";

// SPL Memo program, same on devnet and mainnet.
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

let cachedKeypair: Keypair | null = null;
export function loadHouseKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;
  // Hosting platforms (Railway, Render, ...) have no access to a local keypair
  // file, so SOLANA_KEYPAIR_JSON (the same JSON array a file would contain) can
  // be set as an env var instead. Local dev keeps using the gitignored file.
  const raw = process.env.SOLANA_KEYPAIR_JSON ?? fs.readFileSync(config.solanaKeypairPath, "utf8");
  const secret = Uint8Array.from(JSON.parse(raw));
  cachedKeypair = Keypair.fromSecretKey(secret);
  return cachedKeypair;
}

const POLL_INTERVAL_MS = 500;
const BLOCK_HEIGHT_CHECK_EVERY_N_POLLS = 3;

/** Polls the memo tx's own status directly via HTTP instead of `confirmTransaction`'s
 * websocket-based signature subscription — same rationale as the frontend's pack-payment
 * poll (see app/src/decks/worldcup/packPayment.ts): the public devnet RPC's subscription
 * can miss the notification and stall well past when the tx actually landed. Accepting
 * `processed` rather than waiting for `confirmed` trades a small, devnet-only risk (a
 * `processed` tx can in rare cases still get dropped) for a much snappier seal — every
 * Moment sealed this way is a fixed-cost devnet memo with no real value at stake. */
async function pollForSignatureConfirmation(
  conn: Connection,
  signature: string,
  lastValidBlockHeight: number
): Promise<void> {
  for (let poll = 0; ; poll++) {
    const status = await conn.getSignatureStatus(signature);
    if (status.value?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    if (
      status.value?.confirmationStatus === "processed" ||
      status.value?.confirmationStatus === "confirmed" ||
      status.value?.confirmationStatus === "finalized"
    ) {
      return;
    }

    if (poll % BLOCK_HEIGHT_CHECK_EVERY_N_POLLS === 0) {
      const currentHeight = await conn.getBlockHeight("confirmed");
      if (currentHeight > lastValidBlockHeight) throw new Error("Memo transaction expired before confirming");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/** Sends one devnet memo transaction carrying `payload` (JSON-stringified) as its data,
 * signed by the house keypair. Returns the confirmed signature. Shared by sendMomentTx
 * (Moment odds-swing sealing) and adminMatches (match-metadata sealing) so both land on
 * the same auditable devnet trail via the same signer. */
export async function sendMemoTx(payload: unknown, connection?: Connection): Promise<string> {
  const conn = connection ?? new Connection(config.solanaRpcUrl, "confirmed");
  const payer = loadHouseKeypair();
  const memoText = JSON.stringify(payload);

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
  await pollForSignatureConfirmation(conn, signature, latestBlockhash.lastValidBlockHeight);

  return signature;
}
