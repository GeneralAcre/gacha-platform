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
  await conn.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");

  return signature;
}
