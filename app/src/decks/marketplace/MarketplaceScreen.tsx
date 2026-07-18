import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor'
import idl from '../../idl/gacha_er.json'
import {
  fetchListings,
  treasuryPda,
  ataPda,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  type MarketListing,
  type MomentListing,
} from './marketplaceApi'
import { OwnedMomentArt } from './OwnedMomentArt'

type AnchorWallet = ConstructorParameters<typeof AnchorProvider>[1]

function formatSol(lamports: number): string {
  return (lamports / web3.LAMPORTS_PER_SOL).toFixed(3)
}

function truncate(pubkey: web3.PublicKey): string {
  const s = pubkey.toBase58()
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

/** MomentRecord only stores what's actually on-chain (fixture id, kind, rarity, delta) —
 * no team names or narrative, since those live only in the backend's ephemeral off-chain
 * feed. This tile shows exactly what the mint can honestly prove, not a reconstruction. */
function MomentListingArt({ listing }: { listing: MomentListing }) {
  return (
    <OwnedMomentArt
      momentKind={listing.momentKind}
      rarity={listing.rarity}
      deltaBps={listing.deltaBps}
      fixtureId={listing.fixtureId}
      className="h-48 w-full rounded-lg border border-white/10 object-cover"
    />
  )
}

export function MarketplaceScreen() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [listings, setListings] = useState<MomentListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyPda, setBusyPda] = useState<string | null>(null)

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null
    return new AnchorProvider(connection, wallet as unknown as AnchorWallet, { preflightCommitment: 'processed' })
  }, [connection, wallet])

  const program = useMemo(() => (provider ? new Program(idl, provider) : null), [provider])

  const load = useCallback(async () => {
    if (!program) {
      setListings([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setListings((await fetchListings(program)).filter((listing): listing is MomentListing => listing.kind === 'moment'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [program])

  useEffect(() => {
    load()
  }, [load])

  const handleBuy = useCallback(
    async (listing: MarketListing) => {
      if (!program || !wallet.publicKey) return
      setBusyPda(listing.listingPda.toBase58())
      setError(null)
      try {
        await program.methods
          .buyCard()
          .accounts({
            buyer: wallet.publicKey,
            seller: listing.seller,
            mint: listing.mint,
            listing: listing.listingPda,
            treasury: treasuryPda(),
            vault: ataPda(listing.listingPda, listing.mint),
            buyerTokenAccount: ataPda(wallet.publicKey, listing.mint),
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .rpc()
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Purchase failed')
      } finally {
        setBusyPda(null)
      }
    },
    [program, wallet.publicKey, load]
  )

  const handleCancel = useCallback(
    async (listing: MarketListing) => {
      if (!program || !wallet.publicKey) return
      setBusyPda(listing.listingPda.toBase58())
      setError(null)
      try {
        await program.methods
          .cancelListing()
          .accounts({
            seller: wallet.publicKey,
            mint: listing.mint,
            listing: listing.listingPda,
            vault: ataPda(listing.listingPda, listing.mint),
            sellerTokenAccount: ataPda(wallet.publicKey, listing.mint),
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .rpc()
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Cancel failed')
      } finally {
        setBusyPda(null)
      }
    },
    [program, wallet.publicKey, load]
  )

  return (
    <div className="w-full flex-1 bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-10 md:px-6 md:py-14">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/50">Peer-to-peer · on-chain escrow</p>
          <h1 className="font-koulen mt-2 text-3xl leading-none tracking-tight text-white md:text-5xl">Marketplace</h1>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:border-white disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {!wallet.publicKey && (
        <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/60">
          Connect your wallet to buy, list, or cancel listings.
        </p>
      )}

      {error && (
        <div className="mt-4 w-full [overflow-wrap:anywhere] rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && listings.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/45">No active Moment listings yet.</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing) => {
          const pdaKey = listing.listingPda.toBase58()
          const isOwn = wallet.publicKey?.equals(listing.seller) ?? false
          const busy = busyPda === pdaKey
          return (
            <div key={pdaKey} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <MomentListingArt listing={listing} />
              <p className="mt-3 truncate text-[9px] font-bold uppercase tracking-widest text-white/40">
                World Cup deck · seller {truncate(listing.seller)}
              </p>
              <p className="text-lg font-black text-white">{formatSol(listing.priceLamports)} SOL</p>
              <button
                type="button"
                onClick={() => (isOwn ? handleCancel(listing) : handleBuy(listing))}
                disabled={!wallet.publicKey || busy}
                className={`mt-3 w-full rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
                  isOwn ? 'border border-white/20 text-white hover:border-white' : 'bg-white text-ink hover:bg-[#ffd447]'
                }`}
              >
                {busy ? 'Working…' : isOwn ? 'Cancel Listing' : 'Buy'}
              </button>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
