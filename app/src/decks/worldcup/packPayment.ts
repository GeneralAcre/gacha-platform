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

/** Sends the pack-price SOL transfer to the house treasury and waits for confirmation.
 * Throws (with a message run through friendlyPayError by the caller) on any failure —
 * callers should treat a thrown error as "no pack was opened, no charge went through".
 * `onAttempt` fires right before each wallet prompt so the caller can tell the player a
 * retry needs a fresh approval in their wallet — a silent second prompt is easy to miss,
 * which otherwise looks like "I signed it and nothing happened" while the promise just
 * hangs waiting for that unnoticed second approval. */
export async function payForPack(
  connection: Connection,
  wallet: WalletContextState,
  onAttempt?: (attempt: number, maxAttempts: number) => void
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Connect your wallet to buy a pack.')
  }

  let lastError: unknown

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

    try {
      const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
      if (confirmation.value.err) throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      return signature
    } catch (e) {
      // The public devnet RPC's confirmation polling can time out (blockhash expires) even
      // when the transfer actually landed -- check the signature directly before treating
      // this as a real failure, so a slow confirm never causes a retry to charge twice.
      const status = await connection.getSignatureStatus(signature)
      if (status.value && !status.value.err && status.value.confirmationStatus) {
        return signature
      }

      lastError = e
      const message = e instanceof Error ? e.message : String(e)
      const expired = /block height exceeded|expired/i.test(message)
      if (!expired || attempt === MAX_PAYMENT_ATTEMPTS) throw e
      // Blockhash expired before confirmation landed and the transfer never actually
      // reached the chain -- retry with a fresh blockhash (the wallet will prompt again).
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
