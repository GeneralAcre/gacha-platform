/**
 * TxLINE World Cup free-tier auth: on-chain `subscribe`, off-chain guest JWT,
 * and API token activation, per https://txline-docs.txodds.com/documentation/quickstart
 * and the reference flow in https://github.com/txodds/tx-on-chain
 * (examples/devnet/common/users.ts).
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import axios, { AxiosInstance } from "axios";
import nacl from "tweetnacl";
import * as fs from "fs";
import { config } from "./config";
import { loadHouseKeypair } from "./sendMemoTx";
import idl from "./idl/txoracle.json";

// axios has no default request timeout, so a stalled connection to TxLINE would
// otherwise hang every caller (including the live-odds watcher) forever instead
// of surfacing an error to retry.
const HTTP_TIMEOUT_MS = 15_000;

export interface TxlineSession {
  apiToken: string;
  jwt: string;
  obtainedAt: number;
}

function readSessionCache(): TxlineSession | null {
  if (!fs.existsSync(config.sessionCachePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(config.sessionCachePath, "utf8"));
  } catch {
    return null;
  }
}

function writeSessionCache(session: TxlineSession): void {
  fs.writeFileSync(config.sessionCachePath, JSON.stringify(session, null, 2));
}

/** Decode a JWT's payload without verifying the signature, just to read `exp`. */
function decodeJwtExpiryMs(jwt: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function fetchGuestJwt(): Promise<string> {
  const resp = await axios.post(config.txlineJwtUrl, undefined, { timeout: HTTP_TIMEOUT_MS });
  return resp.data.token;
}

async function subscribeOnChain(connection: Connection, user: Keypair): Promise<string> {
  const programId = new PublicKey(config.txlineProgramId);
  const tokenMint = new PublicKey(config.txlineTokenMint);

  const wallet = new anchor.Wallet(user);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const userTokenAccountAddress = getAssociatedTokenAddressSync(
    tokenMint,
    user.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(userTokenAccountAddress);
  if (!accountInfo) {
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        user.publicKey,
        userTokenAccountAddress,
        user.publicKey,
        tokenMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    await anchor.web3.sendAndConfirmTransaction(connection, tx, [user], { commitment: "confirmed" });
  }

  const userTokenAccount = await getAccount(connection, userTokenAccountAddress, "confirmed", TOKEN_2022_PROGRAM_ID);

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], programId);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], programId);
  const tokenTreasuryVault = getAssociatedTokenAddressSync(tokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);

  const tx = await program.methods
    .subscribe(config.txlineServiceLevel, config.txlineDurationWeeks)
    .accounts({
      user: user.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint,
      userTokenAccount: userTokenAccount.address,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.feePayer = user.publicKey;
  tx.sign(user);

  const txSig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature: txSig, ...latestBlockhash }, "confirmed");
  return txSig;
}

async function activateApiToken(txSig: string, jwt: string, user: Keypair): Promise<string> {
  // Exact message format required by TxLINE: `${txSig}:${leagues.join(",")}:${jwt}`.
  // With no selected leagues this collapses to `${txSig}::${jwt}`.
  const messageString = `${txSig}:${config.txlineSelectedLeagues.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, user.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  const resp = await axios.post(
    `${config.txlineApiBaseUrl}/token/activate`,
    { txSig, walletSignature, leagues: config.txlineSelectedLeagues },
    { headers: { Authorization: `Bearer ${jwt}` }, timeout: HTTP_TIMEOUT_MS }
  );
  return resp.data.token || resp.data;
}

/**
 * Return a valid { jwt, apiToken } pair, resubscribing on-chain only if there is
 * no cached API token (or it has been rejected with 403 by the caller).
 */
export async function getSession(opts: { forceResubscribe?: boolean } = {}): Promise<TxlineSession> {
  const cached = readSessionCache();
  const jwtStillValid = cached && (decodeJwtExpiryMs(cached.jwt) ?? 0) > Date.now() + 60_000;

  if (cached?.apiToken && !opts.forceResubscribe) {
    const jwt = jwtStillValid ? cached.jwt : await fetchGuestJwt();
    const session: TxlineSession = { apiToken: cached.apiToken, jwt, obtainedAt: Date.now() };
    writeSessionCache(session);
    return session;
  }

  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  const user = loadHouseKeypair();
  const jwt = await fetchGuestJwt();

  console.log(`[txlineAuth] Subscribing on-chain: service level ${config.txlineServiceLevel}, ${config.txlineDurationWeeks} weeks...`);
  const txSig = await subscribeOnChain(connection, user);
  console.log(`[txlineAuth] Subscribe tx confirmed: ${txSig}`);

  console.log("[txlineAuth] Activating API token...");
  const apiToken = await activateApiToken(txSig, jwt, user);

  const session: TxlineSession = { apiToken, jwt, obtainedAt: Date.now() };
  writeSessionCache(session);
  console.log(`[txlineAuth] Session cached to ${config.sessionCachePath}`);
  return session;
}

/**
 * Axios client pre-wired with TxLINE auth headers. Renews the JWT on 401 and
 * re-runs the full subscribe+activate flow on 403 (per TxLINE's troubleshooting
 * doc: 401 = expired guest JWT, 403 = activation/signature/token problem).
 */
export function createTxlineApiClient(): AxiosInstance {
  const client = axios.create({ baseURL: config.txlineApiBaseUrl, timeout: HTTP_TIMEOUT_MS });

  client.interceptors.request.use(async (reqConfig) => {
    const session = await getSession();
    reqConfig.headers = reqConfig.headers || {};
    reqConfig.headers["Authorization"] = `Bearer ${session.jwt}`;
    reqConfig.headers["X-Api-Token"] = session.apiToken;
    return reqConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!originalRequest || originalRequest._retry) return Promise.reject(error);

      const status = error.response?.status;
      if (status === 401) {
        console.warn("[txlineAuth] 401 received, renewing JWT and retrying...");
        originalRequest._retry = true;
        const jwt = await fetchGuestJwt();
        const cached = readSessionCache();
        if (cached) writeSessionCache({ ...cached, jwt });
        originalRequest.headers["Authorization"] = `Bearer ${jwt}`;
        return client(originalRequest);
      }
      if (status === 403) {
        console.warn("[txlineAuth] 403 received, re-subscribing on-chain and retrying...");
        originalRequest._retry = true;
        const session = await getSession({ forceResubscribe: true });
        originalRequest.headers["Authorization"] = `Bearer ${session.jwt}`;
        originalRequest.headers["X-Api-Token"] = session.apiToken;
        return client(originalRequest);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

if (require.main === module) {
  getSession()
    .then((session) => {
      console.log("API Token:", session.apiToken);
      console.log("JWT (truncated):", session.jwt.slice(0, 40) + "...");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[txlineAuth] Failed:", err.response?.data ?? err.message ?? err);
      process.exit(1);
    });
}
