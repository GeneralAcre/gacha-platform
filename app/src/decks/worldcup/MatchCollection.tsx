import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { fetchCollection, type CollectionEntry, type MomentResult } from './momentsApi'
import { CollectionCardArt } from './CollectionCardArt'
import { CollectionDetailModal } from './CollectionDetailModal'

const COLLECTION_POLL_INTERVAL_MS = 15000
const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Third Place', 'Final']

// House wallet — the same devnet keypair the backend uses to sign Moment memo
// transactions, so pack revenue also keeps that wallet funded for tx fees.
const TREASURY_PUBKEY = new PublicKey('H6rUHSPYTRu65WSgVhVdGaB94SReGsvL7NNCTUsfasCn')
const PACK_PRICE_SOL = 0.02

function friendlyPayError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e)
  if (/user rejected|rejected the request|declined|approval denied/i.test(message)) {
    return 'Payment was declined in your wallet.'
  }
  if (/insufficient|debit an account|0x1\b/i.test(message)) {
    return 'This wallet needs a little devnet SOL to buy a pack. Get some from a devnet faucet and try again.'
  }
  return message
}

function scoreLabel(entry: CollectionEntry): string {
  if (entry.kind === 'result') return `${entry.score1} – ${entry.score2}`
  if (entry.winProbability) return `${Math.round(entry.winProbability.participant1)}% – ${Math.round(entry.winProbability.participant2)}%`
  return 'Odds pending'
}

function CollectionTile({ entry, hasMoments, onOpen }: { entry: CollectionEntry; hasMoments: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex flex-col overflow-hidden rounded-2xl border bg-[#141414] p-3 text-left transition-transform hover:-translate-y-1 ${
        hasMoments ? 'border-[#ffd447]/50' : 'border-white/10'
      }`}
    >
      <CollectionCardArt entry={entry} className="w-full rounded-xl" />
      <p className="mt-3 truncate text-[10px] font-bold uppercase tracking-widest text-white/40">{entry.round}</p>
      <p className="truncate text-sm font-black tracking-tight text-white">
        {entry.team1} <span className="text-white/30">vs</span> {entry.team2}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-white/50">{scoreLabel(entry)}</span>
        {hasMoments && (
          <span className="shrink-0 rounded-full bg-[#ffd447]/15 px-2 py-1 text-[10px] font-black text-[#ffd447]">SEALED</span>
        )}
      </div>
    </button>
  )
}

export function MatchCollection({ recentMoments }: { recentMoments: MomentResult[] }) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [collection, setCollection] = useState<CollectionEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailEntry, setDetailEntry] = useState<CollectionEntry | null>(null)
  const [drawnEntry, setDrawnEntry] = useState<CollectionEntry | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = await fetchCollection()
        if (cancelled) return
        setCollection(data)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not reach the Moments API — is backend/ running (npm run server)?')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    poll()
    const id = window.setInterval(poll, COLLECTION_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const momentsByFixture = useMemo(() => {
    const map = new Map<number, MomentResult[]>()
    for (const m of recentMoments) {
      const list = map.get(m.fixtureId) ?? []
      list.push(m)
      map.set(m.fixtureId, list)
    }
    return map
  }, [recentMoments])

  const momentsFor = (entry: CollectionEntry) => (entry.fixtureId !== undefined ? momentsByFixture.get(entry.fixtureId) ?? [] : [])

  const grouped = useMemo(() => {
    const map = new Map<string, CollectionEntry[]>()
    for (const round of ROUND_ORDER) map.set(round, [])
    for (const entry of collection) {
      const list = map.get(entry.round) ?? []
      list.push(entry)
      map.set(entry.round, list)
    }
    return map
  }, [collection])

  const handleDraw = useCallback(async () => {
    if (collection.length === 0 || drawing || paying) return
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setPayError('Connect your wallet to buy a pack.')
      return
    }

    setPayError(null)
    setPaying(true)
    try {
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
    } catch (e: unknown) {
      setPayError(friendlyPayError(e))
      setPaying(false)
      return
    }

    setPaying(false)
    setDrawing(true)
    setDrawnEntry(null)
    window.setTimeout(() => {
      setDrawnEntry(collection[Math.floor(Math.random() * collection.length)])
      setDrawing(false)
    }, 700)
  }, [collection, drawing, paying, wallet, connection])

  return (
    <div className="w-full max-w-4xl rounded-3xl bg-[#0a0a0a] p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Verified results + real-time TxLINE odds</p>
          <p className="mt-1 text-lg font-black tracking-tight text-white">World Cup 2026 Collection</p>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8fe3b0]">
          {collection.length} knockout matches
        </span>
      </div>

      {error && (
        <div className="mt-4 w-full rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-[11px] text-red-300">{error}</div>
      )}

      {/* Gachapon draw */}
      <div className="mt-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6">
        {drawnEntry ? (
          <div className="flex flex-col items-center gap-4 pb-1 text-center md:flex-row md:items-start md:gap-5 md:text-left">
            <div className="mx-0 shrink-0 [perspective:1200px]">
              <div className="relative h-64 w-[11.5rem] animate-[card-flip_950ms_cubic-bezier(.3,.9,.35,1.08)_both] [transform-style:preserve-3d]">
                <div className="absolute inset-0 animate-[card-glow_2.4s_ease-in-out_1s_infinite] [backface-visibility:hidden]">
                  <CollectionCardArt entry={drawnEntry} className="h-64 w-[11.5rem] rounded-2xl" />
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 md:items-start animate-[rise-in_500ms_ease-out_450ms_both]">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#8fe3b0]">
                {drawnEntry.round}
              </span>
              <div className="text-2xl font-black tracking-tight text-white">
                {drawnEntry.team1} <span className="text-white/40">vs</span> {drawnEntry.team2}
              </div>
              <div className="text-xl font-black text-[#ffd447]">{scoreLabel(drawnEntry)}</div>
              {momentsFor(drawnEntry).length > 0 && (
                <span className="rounded-full bg-[#ffd447]/15 px-3 py-1 text-xs font-black text-[#ffd447]">
                  {'⚡'} {momentsFor(drawnEntry).length} Sealed Moment{momentsFor(drawnEntry).length > 1 ? 's' : ''} captured!
                </span>
              )}
              <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => setDetailEntry(drawnEntry)}
                  className="rounded-full bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink transition-colors hover:bg-[#ffd447]"
                >
                  View Details
                </button>
                <button
                  onClick={handleDraw}
                  disabled={drawing || paying}
                  className="rounded-full border border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/70 transition-colors hover:border-white hover:text-white disabled:opacity-50"
                >
                  {paying ? 'Confirming payment...' : `Buy Another — ${PACK_PRICE_SOL} SOL`}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="text-4xl">{'🎰'}</span>
            <p className="text-sm font-bold uppercase tracking-widest text-white/80">Open a capsule</p>
            <p className="max-w-xs text-xs text-white/40">
              Pull a random match from the full World Cup 2026 knockout collection — {PACK_PRICE_SOL} SOL per pack, paid on devnet.
            </p>
            <button
              onClick={handleDraw}
              disabled={loading || collection.length === 0 || drawing || paying}
              className="mt-2 rounded-full bg-[#ffd447] px-6 py-3 text-xs font-black uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {paying ? 'Confirming payment...' : drawing ? 'Opening...' : `Buy Pack — ${PACK_PRICE_SOL} SOL`}
            </button>
            {!wallet.publicKey && <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">Connect your wallet above to buy a pack</p>}
          </div>
        )}
        {payError && (
          <div className="w-full [overflow-wrap:anywhere] rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-[11px] text-red-300">
            {payError}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white/50">Loading the collection...</p>
        </div>
      ) : (
        ROUND_ORDER.map((round) => {
          const entries = grouped.get(round) ?? []
          if (entries.length === 0) return null
          return (
            <div key={round} className="mt-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{round}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {entries.map((entry) => (
                  <CollectionTile
                    key={entry.id}
                    entry={entry}
                    hasMoments={momentsFor(entry).length > 0}
                    onOpen={() => setDetailEntry(entry)}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {detailEntry && (
        <CollectionDetailModal entry={detailEntry} moments={momentsFor(detailEntry)} onClose={() => setDetailEntry(null)} />
      )}
    </div>
  )
}
