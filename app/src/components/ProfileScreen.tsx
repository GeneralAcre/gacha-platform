import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor'
import idl from '../idl/gacha_er.json'
import type { CardInfo, Rarity } from './cardRegistry'
import { getCategory, type Category } from './categories'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  cardRecordPda,
  momentRecordPda,
  listingPda,
  ataPda,
} from '../decks/marketplace/marketplaceApi'
import { OwnedMomentArt } from '../decks/marketplace/OwnedMomentArt'
import { MOMENT_RARITY_STYLE, type MomentRarity } from '../decks/worldcup/momentRarity'

type AnchorWallet = ConstructorParameters<typeof AnchorProvider>[1]

const RARITY_LABEL: Record<Rarity, string> = {
  minor: 'MINOR OMEN',
  major: 'MAJOR OMEN',
  grand: 'GRAND REVELATION',
}
const MOMENT_RARITY_BY_BYTE: MomentRarity[] = ['common', 'rare', 'legendary']

interface OwnedCard {
  kind: 'card'
  mint: web3.PublicKey
  card: CardInfo
  category: Category
}

interface OwnedMoment {
  kind: 'moment'
  mint: web3.PublicKey
  fixtureId: number
  momentKind: number
  rarity: number
  deltaBps: number
}

type OwnedItem = OwnedCard | OwnedMoment

interface MyListing {
  listingPda: web3.PublicKey
  mint: web3.PublicKey
  priceLamports: number
  fixtureId: number
  momentKind: number
  rarity: number
  deltaBps: number
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function ProfileScreen() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [owned, setOwned] = useState<OwnedItem[]>([])
  const [myListings, setMyListings] = useState<MyListing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyMint, setBusyMint] = useState<string | null>(null)
  const [listingDraft, setListingDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!wallet.publicKey) {
      setOwned([])
      setMyListings([])
      setError(null)
      return
    }
    const walletPublicKey = wallet.publicKey
    setLoading(true)
    setError(null)

    try {
      const baseProvider = new AnchorProvider(connection, wallet as unknown as AnchorWallet, { preflightCommitment: 'processed' })
      const baseProgram = new Program(idl, baseProvider)

      // Real holdings, not guessed pull indices — this is what actually lets a card
      // bought on the marketplace (minted under someone else's pubkey) show up here,
      // and lets a sold-away card stop showing up.
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, { programId: TOKEN_PROGRAM_ID })
      const mints = tokenAccounts.value
        .map((a) => a.account.data.parsed?.info)
        .filter((info) => info?.tokenAmount?.decimals === 0 && info?.tokenAmount?.uiAmount === 1)
        .map((info) => new web3.PublicKey(info.mint))

      const foundItems: OwnedItem[] = []
      for (const batch of chunk(mints, 50)) {
        const cardPdas = batch.map(cardRecordPda)
        const momentPdas = batch.map(momentRecordPda)
        const [cardInfos, momentInfos] = await Promise.all([
          connection.getMultipleAccountsInfo(cardPdas),
          connection.getMultipleAccountsInfo(momentPdas),
        ])

        batch.forEach((mint, i) => {
          const cardInfo = cardInfos[i]
          if (cardInfo) {
            try {
              baseProgram.coder.accounts.decode<{ rarity: number; cardSeed: number; category: number; special: number }>(
                'cardRecord',
                cardInfo.data
              )
              // Recognized Tarot holding: do not include it in the World Cup-only profile.
              return
            } catch {
              /* not a CardRecord — fall through */
            }
          }
          const momentInfo = momentInfos[i]
          if (momentInfo) {
            try {
              const record = baseProgram.coder.accounts.decode<{ fixtureId: number; kind: number; rarity: number; deltaBps: number }>(
                'momentRecord',
                momentInfo.data
              )
              foundItems.push({ kind: 'moment', mint, fixtureId: record.fixtureId, momentKind: record.kind, rarity: record.rarity, deltaBps: record.deltaBps })
            } catch {
              /* neither record type — not one of ours, skip */
            }
          }
        })
      }

      // Own active listings — these hold the token in escrow, so they never appear in
      // the wallet-owned scan above; found separately by filtering Listing.seller.
      const listingAccounts = (baseProgram.account as unknown as {
        listing: {
          all: (filters: { memcmp: { offset: number; bytes: string } }[]) => Promise<{ publicKey: web3.PublicKey; account: { mint: web3.PublicKey; price: BN | number } }[]>
        }
      }).listing
      const rawListings = await listingAccounts.all([{ memcmp: { offset: 8, bytes: walletPublicKey.toBase58() } }])
      const listingMomentInfos = await connection.getMultipleAccountsInfo(rawListings.map(({ account }) => momentRecordPda(account.mint)))
      const listings: MyListing[] = rawListings.flatMap(({ publicKey, account }, index) => {
        const momentInfo = listingMomentInfos[index]
        if (!momentInfo) return []
        try {
          const record = baseProgram.coder.accounts.decode<{ fixtureId: number; kind: number; rarity: number; deltaBps: number }>(
            'momentRecord',
            momentInfo.data
          )
          return [{
            listingPda: publicKey,
            mint: account.mint,
            priceLamports: typeof account.price === 'number' ? account.price : Number(account.price.toString()),
            fixtureId: record.fixtureId,
            momentKind: record.kind,
            rarity: record.rarity,
            deltaBps: record.deltaBps,
          }]
        } catch {
          return []
        }
      })

      setOwned(foundItems)
      setMyListings(listings)
    } catch (e) {
      console.error(e)
      setError('Could not load your collection right now — try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [connection, wallet])

  useEffect(() => {
    load()
  }, [load])

  const handleList = useCallback(
    async (mint: web3.PublicKey) => {
      if (!wallet.publicKey) return
      const draft = listingDraft[mint.toBase58()]
      const priceSol = Number(draft)
      if (!draft || !Number.isFinite(priceSol) || priceSol <= 0) {
        setError('Enter a price greater than 0 SOL before listing.')
        return
      }
      const priceLamports = Math.round(priceSol * web3.LAMPORTS_PER_SOL)
      setBusyMint(mint.toBase58())
      setError(null)
      try {
        const provider = new AnchorProvider(connection, wallet as unknown as AnchorWallet, { preflightCommitment: 'processed' })
        const program = new Program(idl, provider)
        await program.methods
          .listCard(new BN(priceLamports))
          .accounts({
            seller: wallet.publicKey,
            mint,
            sellerTokenAccount: ataPda(wallet.publicKey, mint),
            listing: listingPda(mint),
            vault: ataPda(listingPda(mint), mint),
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .rpc()
        await load()
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : 'Listing failed')
      } finally {
        setBusyMint(null)
      }
    },
    [connection, wallet, listingDraft, load]
  )

  const handleCancel = useCallback(
    async (listing: MyListing) => {
      if (!wallet.publicKey) return
      setBusyMint(listing.mint.toBase58())
      setError(null)
      try {
        const provider = new AnchorProvider(connection, wallet as unknown as AnchorWallet, { preflightCommitment: 'processed' })
        const program = new Program(idl, provider)
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
        console.error(e)
        setError(e instanceof Error ? e.message : 'Cancel failed')
      } finally {
        setBusyMint(null)
      }
    },
    [connection, wallet, load]
  )

  const walletAddress = wallet.publicKey?.toBase58() ?? null

  return (
    <div className="w-full flex-1 bg-ink text-paper">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Player profile</p>
          <h1 className="font-koulen mt-2 text-4xl tracking-tight text-white md:text-5xl">My collection</h1>
          {walletAddress ? (
            <p className="mt-2 font-mono text-xs text-white/55">
              Connected · {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-white/55">Connect a wallet to see your minted cards.</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center">
          <p className="text-2xl font-black text-white">{owned.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Held now</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 w-full [overflow-wrap:anywhere] rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {!walletAddress ? null : loading ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white/55">Reading the chain...</p>
        </div>
      ) : (
        <>
          {myListings.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/45">Your active listings</p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {myListings.map((listing) => (
                  <div key={listing.listingPda.toBase58()} className="flex items-center justify-between gap-3 rounded-2xl border border-flare/30 bg-flare/10 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <OwnedMomentArt
                        momentKind={listing.momentKind}
                        rarity={listing.rarity}
                        deltaBps={listing.deltaBps}
                        fixtureId={listing.fixtureId}
                        className="h-20 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/45">Fixture #{listing.fixtureId}</p>
                        <p className="font-black text-white">{(listing.priceLamports / web3.LAMPORTS_PER_SOL).toFixed(3)} SOL</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancel(listing)}
                      disabled={busyMint === listing.mint.toBase58()}
                      className="shrink-0 rounded-full border border-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:border-white disabled:opacity-50"
                    >
                      {busyMint === listing.mint.toBase58() ? 'Working…' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {owned.length === 0 && myListings.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-2xl font-black tracking-tight text-white">Your cabinet is waiting.</p>
              <p className="mt-2 text-sm text-white/55">Draw a fortune and claim it as an NFT to begin your collection.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {owned.map((item) => {
                const mintKey = item.mint.toBase58()
                const isBusy = busyMint === mintKey
                return (
                  <div key={mintKey} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    {item.kind === 'card' ? (
                      <div className="flex gap-4">
                        <img
                          src={item.card.image}
                          alt={`${item.card.name} card art`}
                          className="h-36 w-24 shrink-0 rounded-xl border border-white/10 object-cover"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-flare">
                            {RARITY_LABEL[item.card.rarity]} · {getCategory(item.category).label}
                          </span>
                          <div className="mt-2 font-black tracking-tight text-white">{item.card.name}</div>
                          <p className="mt-1 text-xs italic text-white/65">"{item.card.reading}"</p>
                          <a
                            href={`https://explorer.solana.com/address/${mintKey}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest text-white/35"
                          >
                            View on Explorer ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <OwnedMomentArt
                          momentKind={item.momentKind}
                          rarity={item.rarity}
                          deltaBps={item.deltaBps}
                          fixtureId={item.fixtureId}
                          className="h-36 w-24 shrink-0 rounded-xl border border-white/10 object-cover"
                        />
                        <div className="min-w-0">
                          <span
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: MOMENT_RARITY_STYLE[MOMENT_RARITY_BY_BYTE[item.rarity] ?? 'common'].accent }}
                          >
                            {MOMENT_RARITY_STYLE[MOMENT_RARITY_BY_BYTE[item.rarity] ?? 'common'].label} · {item.momentKind === 1 ? 'Favorite Flip' : 'Odds Swing'}
                          </span>
                          <div className="mt-2 font-black tracking-tight text-white">Fixture #{item.fixtureId}</div>
                          <p className="mt-1 text-xs text-white/65">{Math.round(item.deltaBps / 100)} point swing</p>
                          <a
                            href={`https://explorer.solana.com/address/${mintKey}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest text-white/35"
                          >
                            View on Explorer ↗
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="Price in SOL"
                        value={listingDraft[mintKey] ?? ''}
                        onChange={(e) => setListingDraft((prev) => ({ ...prev, [mintKey]: e.target.value }))}
                        className="w-full min-w-0 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-flare"
                      />
                      <button
                        type="button"
                        onClick={() => handleList(item.mint)}
                        disabled={isBusy}
                        className="shrink-0 rounded-full bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-[#ffd447] disabled:opacity-50"
                      >
                        {isBusy ? 'Working…' : 'List'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
