import type { Connection } from '@solana/web3.js'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'

// House wallet — the same devnet keypair the backend uses to sign Moment memo
// transactions, so pack revenue also keeps that wallet funded for tx fees.
export const TREASURY_PUBKEY = new PublicKey('H6rUHSPYTRu65WSgVhVdGaB94SReGsvL7NNCTUsfasCn')
export const PACK_PRICE_SOL = 0.02

export function friendlyPayError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e)
  if (/user rejected|rejected the request|declined|approval denied/i.test(message)) {
    return 'Payment was declined in your wallet.'
  }
  if (/insufficient|debit an account|0x1\b/i.test(message)) {
    return 'This wallet needs a little devnet SOL to buy a pack. Get some from a devnet faucet and try again.'
  }
  if (/block height exceeded|expired/i.test(message)) {
    return 'Payment took too long to confirm on devnet and expired. Please try again.'
  }
  return message
}

const MAX_PAYMENT_ATTEMPTS = 3
const POLL_INTERVAL_MS = 1500

/** Polls a sent transaction's own status directly via HTTP instead of
 * `connection.confirmTransaction`'s websocket-based signature subscription — the public
 * devnet RPC's subscription can miss the notification and throw a false "expired" well
 * before the blockhash is actually unusable, which was forcing a needless second wallet
 * prompt on transactions that would have landed fine with a few more seconds. This keeps
 * checking for as long as the blockhash that was actually signed remains genuinely valid
 * (compared against the real current block height, not a client-side timer), so a signed
 * transaction gets every real chance to land before anything asks for a new signature. */
// Expiry only needs to be caught within a couple of seconds of actually happening (the
// window is ~60-90s of block height), so block height is checked every 3rd poll instead of
// every poll -- halves the RPC call volume against a rate-limited endpoint for no real loss
// of responsiveness.
const BLOCK_HEIGHT_CHECK_EVERY_N_POLLS = 3

async function pollForConfirmation(
  connection: Connection,
  signature: string,
  lastValidBlockHeight: number
): Promise<'confirmed' | 'expired'> {
  for (let poll = 0; ; poll++) {
    const status = await connection.getSignatureStatus(signature)
    if (status.value?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
    if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
      return 'confirmed'
    }

    if (poll % BLOCK_HEIGHT_CHECK_EVERY_N_POLLS === 0) {
      const currentHeight = await connection.getBlockHeight('confirmed')
      if (currentHeight > lastValidBlockHeight) return 'expired'
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

/** Sends the pack-price SOL transfer to the house treasury and waits for confirmation.
 * Throws (with a message run through friendlyPayError by the caller) on any failure —
 * callers should treat a thrown error as "no pack was opened, no charge went through".
 * `onAttempt` fires right before each wallet prompt, `onSigned` right after — a signed
 * transaction can take a while to confirm on public devnet, and without a status update
 * for that window it looks stuck on "waiting for approval" even though it's already been
 * approved. A second prompt only ever appears if the original blockhash has genuinely
 * expired (see pollForConfirmation above), never just because confirmation is slow. */
export async function payForPack(
  connection: Connection,
  wallet: WalletContextState,
  onAttempt?: (attempt: number, maxAttempts: number) => void,
  onSigned?: () => void
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Connect your wallet to buy a pack.')
  }

  for (let attempt = 1; attempt <= MAX_PAYMENT_ATTEMPTS; attempt++) {
    onAttempt?.(attempt, MAX_PAYMENT_ATTEMPTS)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: TREASURY_PUBKEY,
        lamports: Math.round(PACK_PRICE_SOL * LAMPORTS_PER_SOL),
      })
    )
    tx.recentBlockhash = blockhash
    tx.feePayer = wallet.publicKey

    const signature = await wallet.sendTransaction(tx, connection, { maxRetries: 5 })
    onSigned?.()

    const result = await pollForConfirmation(connection, signature, lastValidBlockHeight)
    if (result === 'confirmed') return signature
    if (attempt === MAX_PAYMENT_ATTEMPTS) {
      throw new Error('Payment took too long to confirm on devnet and expired after retrying.')
    }
    // Genuinely expired (the real block height passed lastValidBlockHeight, not just a
    // client-side timeout) -- the transfer never reached the chain, safe to retry with a
    // fresh blockhash. The wallet will prompt again.
  }

  throw new Error('Payment took too long to confirm on devnet and expired after retrying.')
}
