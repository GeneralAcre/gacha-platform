import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  solanaKeypairPath: process.env.SOLANA_KEYPAIR_PATH || "./devnet-keypair.json",

  txlineProgramId: required("TXLINE_PROGRAM_ID"),
  txlineTokenMint: required("TXLINE_TOKEN_MINT"),
  txlineApiBaseUrl: process.env.TXLINE_API_BASE_URL || "https://txline-dev.txodds.com/api",
  txlineJwtUrl: process.env.TXLINE_JWT_URL || "https://txline-dev.txodds.com/auth/guest/start",
  txlineServiceLevel: Number(process.env.TXLINE_SERVICE_LEVEL || "1"),
  txlineDurationWeeks: Number(process.env.TXLINE_DURATION_WEEKS || "4"),
  txlineSelectedLeagues: [] as number[],

  sessionCachePath: process.env.TXLINE_SESSION_CACHE_PATH || "./.txline-session.json",
};
