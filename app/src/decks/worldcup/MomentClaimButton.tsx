import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider, BN, Program, web3 } from '@coral-xyz/anchor'
import bs58 from 'bs58'
import idl from '../../idl/gacha_er.json'
import {
  PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ataPda,
  listingPda,
  momentRecordPda,
} from '../marketplace/marketplaceApi'
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

function formatSol(lamports: number): string {
  return (lamports / web3.LAMPORTS_PER_SOL).toFixed(3)
}

interface ListingState {
  seller: web3.PublicKey
  priceLamports: number
}

/** First-claimer-wins: the mint PDA is derived purely from the Moment's own signature, so
 * this checks (and later attempts) claiming the one NFT that will ever exist for it — a
 * second claim attempt after someone else wins the race fails on-chain, surfaced as an error.
 *
 * `showSellControls` additionally offers Keep/Sell once claimed by the connected wallet —
 * off by default so the reveal screen keeps its plain "Claim as NFT" button; the detail
 * modal (reachable from Collection/Trending Draws too, not just right after reveal) opts in. */
export function MomentClaimButton({
  moment,
  className = '',
  showSellControls = false,
}: {
  moment: MomentResult
  className?: string
  showSellControls?: boolean
}) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [claimed, setClaimed] = useState<boolean | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [owned, setOwned] = useState<boolean | null>(null)
  const [listing, setListing] = useState<ListingState | null | undefined>(undefined) // undefined = not checked yet
  const [checkingListing, setCheckingListing] = useState(false)
  const [priceInput, setPriceInput] = useState('0.05')
  const [listingBusy, setListingBusy] = useState(false)
  const [listingError, setListingError] = useState<string | null>(null)
  const [selling, setSelling] = useState(false)

  const signatureBytes = useMemo(() => bs58.decode(moment.signature), [moment.signature])
  const mintPda = useMemo(() => momentMintPda(signatureBytes), [signatureBytes])

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null
    return new AnchorProvider(connection, wallet as unknown as AnchorWallet, { preflightCommitment: 'processed' })
  }, [connection, wallet])
  const program = useMemo(() => (provider ? new Program(idl, provider) : null), [provider])

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

  // Ownership + active-listing state -- only needed to decide what Keep/Sell controls to
  // show, so skip entirely unless the caller actually wants them.
  const refreshOwnershipAndListing = useCallback(async () => {
    if (!showSellControls || !claimed || !wallet.publicKey || !program) return
    setCheckingListing(true)
    try {
      const [tokenBalance, listingAccount] = await Promise.all([
        connection.getTokenAccountBalance(ataPda(wallet.publicKey, mintPda)).catch(() => null),
        (program.account as unknown as { listing: { fetchNullable: (a: web3.PublicKey) => Promise<{ seller: web3.PublicKey; price: BN } | null> } }).listing.fetchNullable(
          listingPda(mintPda)
        ),
      ])
      setOwned((tokenBalance?.value.uiAmount ?? 0) > 0)
      setListing(listingAccount ? { seller: listingAccount.seller, priceLamports: Number(listingAccount.price.toString()) } : null)
    } finally {
      setCheckingListing(false)
    }
  }, [showSellControls, claimed, wallet.publicKey, program, connection, mintPda])

  useEffect(() => {
    refreshOwnershipAndListing()
  }, [refreshOwnershipAndListing])

  const handleClaim = useCallback(async () => {
    if (!wallet.publicKey) return
    setClaiming(true)
    setError(null)
    try {
      const claimProvider = new AnchorProvider(connection, wallet as unknown as AnchorWallet, { preflightCommitment: 'processed' })
      const claimProgram = new Program(idl, claimProvider)
      const rarity = RARITY_BYTE[momentRarity(moment)]
      const deltaBps = Math.round(moment.deltaProbability * 100)

      await claimProgram.methods
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

  const handleList = useCallback(async () => {
    if (!wallet.publicKey || !program) return
    const priceSol = Number(priceInput)
    if (!Number.isFinite(priceSol) || priceSol <= 0) {
      setListingError('Enter a price greater than 0.')
      return
    }
    setListingBusy(true)
    setListingError(null)
    try {
      await program.methods
        .listCard(new BN(Math.round(priceSol * web3.LAMPORTS_PER_SOL)))
        .accounts({
          seller: wallet.publicKey,
          mint: mintPda,
          sellerTokenAccount: ataPda(wallet.publicKey, mintPda),
          listing: listingPda(mintPda),
          vault: ataPda(listingPda(mintPda), mintPda),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc()
      setSelling(false)
      await refreshOwnershipAndListing()
    } catch (e) {
      setListingError(e instanceof Error ? e.message : 'Listing failed')
    } finally {
      setListingBusy(false)
    }
  }, [wallet.publicKey, program, priceInput, mintPda, refreshOwnershipAndListing])

  const handleCancelListing = useCallback(async () => {
    if (!wallet.publicKey || !program) return
    setListingBusy(true)
    setListingError(null)
    try {
      await program.methods
        .cancelListing()
        .accounts({
          seller: wallet.publicKey,
          mint: mintPda,
          listing: listingPda(mintPda),
          vault: ataPda(listingPda(mintPda), mintPda),
          sellerTokenAccount: ataPda(wallet.publicKey, mintPda),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc()
      await refreshOwnershipAndListing()
    } catch (e) {
      setListingError(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setListingBusy(false)
    }
  }, [wallet.publicKey, program, mintPda, refreshOwnershipAndListing])

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

      {showSellControls && claimed && !checkingListing && (
        <div className="mt-3">
          {listing ? (
            wallet.publicKey.equals(listing.seller) ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-[11px] font-bold text-white/70">
                  Listed for <span className="text-[#8fe3b0]">{formatSol(listing.priceLamports)} SOL</span>
                </p>
                <button
                  type="button"
                  onClick={handleCancelListing}
                  disabled={listingBusy}
                  className="rounded-full border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 transition-colors hover:border-white disabled:opacity-50"
                >
                  {listingBusy ? 'Working…' : 'Cancel Listing'}
                </button>
              </div>
            ) : (
              <p className="text-[11px] font-bold text-white/50">Listed for {formatSol(listing.priceLamports)} SOL by another owner.</p>
            )
          ) : owned ? (
            selling ? (
              <div className="flex flex-col items-start gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Price (devnet SOL)
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="mt-1 block w-28 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm font-bold text-white outline-none focus:border-[#8fe3b0]"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleList}
                    disabled={listingBusy}
                    className="rounded-full bg-[#ffd447] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {listingBusy ? 'Listing…' : 'Confirm Listing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelling(false)}
                    disabled={listingBusy}
                    className="rounded-full border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-colors hover:border-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
                  Keep
                </span>
                <button
                  type="button"
                  onClick={() => setSelling(true)}
                  className="rounded-full bg-[#8fe3b0] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
                >
                  Sell
                </button>
              </div>
            )
          ) : null}
          {listingError && <p className="mt-1 max-w-[14rem] text-[10px] font-bold text-red-400">{listingError}</p>}
        </div>
      )}
    </div>
  )
}
