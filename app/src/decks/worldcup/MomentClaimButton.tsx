import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor'
import bs58 from 'bs58'
import idl from '../../idl/gacha_er.json'
import { PROGRAM_ID, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, ataPda, momentRecordPda } from '../marketplace/marketplaceApi'
import { momentRarity, type MomentRarity } from './momentRarity'
import type { MomentResult } from './momentsApi'

type AnchorWallet = ConstructorParameters<typeof AnchorProvider>[1]

const MOMENT_MINT_SEED = Buffer.from('moment_mint_v1')
const RARITY_BYTE: Record<MomentRarity, number> = { common: 0, rare: 1, legendary: 2 }

function momentMintPda(signatureBytes: Uint8Array): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(
    [MOMENT_MINT_SEED, Buffer.from(signatureBytes.slice(0, 32)), Buffer.from(signatureBytes.slice(32, 64))],
    PROGRAM_ID
  )[0]
}

/** First-claimer-wins: the mint PDA is derived purely from the Moment's own signature, so
 * this checks (and later attempts) claiming the one NFT that will ever exist for it — a
 * second claim attempt after someone else wins the race fails on-chain, surfaced as an error. */
export function MomentClaimButton({ moment, className = '' }: { moment: MomentResult; className?: string }) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [claimed, setClaimed] = useState<boolean | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signatureBytes = useMemo(() => bs58.decode(moment.signature), [moment.signature])
  const mintPda = useMemo(() => momentMintPda(signatureBytes), [signatureBytes])

  useEffect(() => {
    let cancelled = false
    connection
      .getAccountInfo(mintPda)
      .then((info) => {
        if (!cancelled) setClaimed(info !== null)
      })
      .catch(() => {
        if (!cancelled) setClaimed(false)
      })
    return () => {
      cancelled = true
    }
  }, [connection, mintPda])

  const handleClaim = useCallback(async () => {
    if (!wallet.publicKey) return
    setClaiming(true)
    setError(null)
    try {
      const provider = new AnchorProvider(connection, wallet as unknown as AnchorWallet, { preflightCommitment: 'processed' })
      const program = new Program(idl, provider)
      const rarity = RARITY_BYTE[momentRarity(moment)]
      const deltaBps = Math.round(moment.deltaProbability * 100)

      await program.methods
        .mintMomentNft(Array.from(signatureBytes), moment.fixtureId, moment.kind === 'flip' ? 1 : 0, rarity, deltaBps)
        .accounts({
          payer: wallet.publicKey,
          mint: mintPda,
          momentRecord: momentRecordPda(mintPda),
          tokenAccount: ataPda(wallet.publicKey, mintPda),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc()
      setClaimed(true)
    } catch (e) {
      console.error(e)
      setError('Claim failed — someone else may have just claimed this Moment first.')
      setClaimed(true)
    } finally {
      setClaiming(false)
    }
  }, [connection, wallet, mintPda, signatureBytes, moment])

  if (!wallet.publicKey || claimed === null) return null

  return (
    <div className={className}>
      {claimed ? (
        <span className="inline-block rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
          ✦ Claimed as NFT
        </span>
      ) : (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="rounded-full bg-[#8fe3b0] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {claiming ? 'Claiming…' : 'Claim as NFT'}
        </button>
      )}
      {error && <p className="mt-1 max-w-[14rem] text-[10px] font-bold text-red-400">{error}</p>}
    </div>
  )
}
