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
  return message
}

/** Sends the pack-price SOL transfer to the house treasury and waits for confirmation.
 * Throws (with a message run through friendlyPayError by the caller) on any failure —
 * callers should treat a thrown error as "no pack was opened, no charge went through". */
export async function payForPack(connection: Connection, wallet: WalletContextState): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Connect your wallet to buy a pack.')
  }
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: TREASURY_PUBKEY,
      lamports: Math.round(PACK_PRICE_SOL * LAMPORTS_PER_SOL),
    })
  )
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = wallet.publicKey
  const signature = await wallet.sendTransaction(tx, connection)
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
  return signature
}
