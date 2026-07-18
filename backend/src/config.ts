import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Hosting dashboards (Railway's Raw Editor included) make it easy to paste in a
// trailing space or newline that's invisible in the UI but breaks base58 decoding
// (new PublicKey(...)) or URL parsing downstream, so every value is trimmed here.
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export const config = {
  solanaRpcUrl: optional("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
  solanaKeypairPath: optional("SOLANA_KEYPAIR_PATH", "./devnet-keypair.json"),

  txlineProgramId: required("TXLINE_PROGRAM_ID"),
  txlineTokenMint: required("TXLINE_TOKEN_MINT"),
  txlineApiBaseUrl: optional("TXLINE_API_BASE_URL", "https://txline-dev.txodds.com/api"),
  txlineJwtUrl: optional("TXLINE_JWT_URL", "https://txline-dev.txodds.com/auth/guest/start"),
  txlineServiceLevel: Number(optional("TXLINE_SERVICE_LEVEL", "1")),
  txlineDurationWeeks: Number(optional("TXLINE_DURATION_WEEKS", "4")),
  txlineSelectedLeagues: [] as number[],

  sessionCachePath: optional("TXLINE_SESSION_CACHE_PATH", "./.txline-session.json"),
};
