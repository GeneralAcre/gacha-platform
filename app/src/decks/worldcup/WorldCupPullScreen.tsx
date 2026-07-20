import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { fetchRecentMoments, triggerSimulatedMoments, explorerTxUrl, isRealMoment, momentKey, type MomentResult } from './momentsApi'
import { MomentCardArt, MomentShareButtons, useMomentCardDownload } from './MomentCardArt'
import { MatchMomentCardArt } from './MatchMomentCardArt'
import { MomentReel } from './MomentReel'
import { MomentClaimButton } from './MomentClaimButton'
import { MomentDetailModal } from './MomentDetailModal'
import { LiveMatchTicker } from './LiveMatchTicker'
import { CompetitionPackSelector } from './CompetitionPackSelector'
import { PackOddsPanel } from './PackOddsPanel'
import { COMPETITIONS, DEFAULT_COMPETITION } from './competitions'
import { momentRarity, MOMENT_RARITY_STYLE } from './momentRarity'
import { LIVE_PACK_PRICE_SOL, HISTORY_PACK_PRICE_SOL, packPriceSol, payForPack, friendlyPayError, type DrawMode } from './packPayment'
import { PackPurchaseModal } from './PackPurchaseModal'
import { formatSwing, MomentTile, type CardArtComponent } from './MomentTile'

// Every live pack pulls from the same real (or auto-sealed-on-demand) Moment queue and the
// same claim-as-NFT flow -- only the card face differs, keyed by pack id.
const CARD_ART_BY_PACK: Record<string, CardArtComponent> = {
  event: MomentCardArt,
  match: MatchMomentCardArt,
}

const POLL_INTERVAL_MS = 3000

// Known Semifinal/Final matchups (mirrors backend/src/worldCup2026Results.ts's Semifinal
// entries and collection.ts's labelLiveRound Final assumption) -- the draw page's preview
// strip only teases the tournament's marquee matches; the full archive lives on Collection.
const SEMIFINAL_OR_FINAL_PAIRS: Array<[string, string]> = [
  ['Spain', 'France'],
  ['Argentina', 'England'],
  ['Spain', 'Argentina'],
]

function isSemifinalOrFinal(moment: MomentResult): boolean {
  return SEMIFINAL_OR_FINAL_PAIRS.some(
    ([a, b]) => (moment.team === a && moment.opponent === b) || (moment.team === b && moment.opponent === a)
  )
}

export function WorldCupPullScreen() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [recentMoments, setRecentMoments] = useState<MomentResult[]>([])
  const [queue, setQueue] = useState<MomentResult[]>([])
  const [openedMoment, setOpenedMoment] = useState<MomentResult | null>(null)
  const [paying, setPaying] = useState(false)
  const [payStatus, setPayStatus] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [detailMoment, setDetailMoment] = useState<MomentResult | null>(null)
  const [paymentPackOpen, setPaymentPackOpen] = useState(false)
  const [selectedCompetition, setSelectedCompetition] = useState(DEFAULT_COMPETITION)
  const selectedPack = COMPETITIONS.find((pack) => pack.id === selectedCompetition) ?? COMPETITIONS[0]
  const CardArt = CARD_ART_BY_PACK[selectedCompetition] ?? MomentCardArt
  const semifinalOrFinalMoments = useMemo(() => recentMoments.filter(isSemifinalOrFinal), [recentMoments])

  const seenRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  const enqueueFresh = useCallback((moments: MomentResult[]) => {
    const fresh = moments.filter((m) => !seenRef.current.has(momentKey(m)))
    if (fresh.length === 0) return
    fresh.forEach((m) => seenRef.current.add(momentKey(m)))
    // API returns newest-first; reveal in the order they actually happened.
    setQueue((q) => [...q, ...fresh.slice().reverse()])
  }, [])

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = await fetchRecentMoments(20)
        if (cancelled) return
        setApiError(null)
        const scoped = data.filter((m) => m.competition === selectedPack.sourceCompetition)
        setRecentMoments(scoped)

        if (!initializedRef.current) {
          // Don't replay history on first load — only reveal Moments that arrive from here on.
          data.forEach((m) => seenRef.current.add(momentKey(m)))
          initializedRef.current = true
          return
        }
        enqueueFresh(scoped)
      } catch {
        if (!cancelled) setApiError('Could not reach the Moments API — is backend/ running (npm run server)?')
      }
    }

    poll()
    const id = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enqueueFresh, selectedPack.sourceCompetition])

  // Packs accumulate silently as real swings arrive — nothing reveals until the player
  // actually pays to open one. Each open is its own payment, not a one-time unlock.
  // Payment happens first (so the wallet prompt appears immediately, not after several
  // seconds of on-chain work the player never asked to wait for). `mode` decides where the
  // reveal comes from -- a Live pack only ever takes the next real, already-queued Moment
  // (never falls back), a History pack always seals a fresh synthetic demo one on the spot,
  // regardless of what's queued. Every pack (Event, Match) shares this exact mechanic —
  // always claimable as an NFT, always the same real memo-tx pipeline — only the reveal's
  // card art differs.
  const handleOpenPack = useCallback(async (mode: DrawMode) => {
    if (paying || openedMoment) return
    if (mode === 'live' && queue.length === 0) return
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setPayError('Connect your wallet to open a pack.')
      return
    }
    setPayError(null)
    setPaying(true)
    setPayStatus('Waiting for wallet approval...')

    try {
      await payForPack(
        connection,
        wallet,
        packPriceSol(mode),
        (attempt, max) => {
          setPayStatus(
            attempt === 1
              ? 'Waiting for wallet approval...'
              : `Blockhash expired before confirming — approve again in your wallet (attempt ${attempt}/${max})...`
          )
        },
        () => setPayStatus('Approved — confirming on devnet...')
      )
    } catch (e: unknown) {
      setPayError(friendlyPayError(e))
      setPaying(false)
      setPayStatus(null)
      return
    }

    // Payment is confirmed on-chain from here on — the player has already been charged,
    // so a failure past this point must never just vanish silently.
    let nextMoment: MomentResult

    if (mode === 'live') {
      nextMoment = queue[0]
    } else {
      // The player has already paid for this pack — sealing must not have a dead end,
      // so this retries on the spot (no further charge) rather than surfacing a failure
      // that would make "Open History" look safe to click again when it would charge twice.
      setPayStatus('Payment confirmed — sealing your card on-chain...')
      const SEAL_ATTEMPTS = 3
      let sealed: MomentResult | undefined
      for (let attempt = 1; attempt <= SEAL_ATTEMPTS && !sealed; attempt++) {
        try {
          const simulated = await triggerSimulatedMoments()
          const fresh = simulated.filter((m) => !seenRef.current.has(momentKey(m)))
          fresh.forEach((m) => seenRef.current.add(momentKey(m)))
          if (fresh.length === 0) continue
          sealed = fresh[0]
          if (fresh.length > 1) setQueue((q) => [...q, ...fresh.slice(1)])
        } catch {
          if (attempt < SEAL_ATTEMPTS) setPayStatus(`Payment confirmed — sealing your card on-chain (retry ${attempt + 1}/${SEAL_ATTEMPTS})...`)
        }
      }
      if (!sealed) {
        setPaying(false)
        setPayStatus(null)
        setPayError('Payment succeeded but sealing your card failed after retrying — the backend may be briefly unavailable. Please try again shortly; devnet SOL has no real value, so this only costs a small delay.')
        return
      }
      nextMoment = sealed
    }

    setPaying(false)
    setPayStatus(null)
    setOpenedMoment(nextMoment)
    if (mode === 'live') setQueue((q) => q.slice(1))
  }, [queue, paying, openedMoment, wallet, connection])

  const handleDismiss = useCallback(() => setOpenedMoment(null), [])

  const handlePackClick = useCallback((id: string) => {
    const pack = COMPETITIONS.find((p) => p.id === id)
    if (!pack || !pack.live) return
    setSelectedCompetition(id)
    setQueue([])
    setOpenedMoment(null)
    setPaymentPackOpen(true)
  }, [])

  const handlePackPayment = useCallback((mode: DrawMode) => {
    if (paying || openedMoment) return
    setPaymentPackOpen(false)
    void handleOpenPack(mode)
  }, [handleOpenPack, openedMoment, paying])

  return (
    <div className="w-full flex-1 bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-0 px-4 py-10 md:py-14">
      <div className="w-full">
        <CompetitionPackSelector selected={selectedCompetition} onPackClick={handlePackClick} />
        <PackOddsPanel />
      </div>

      <div className="mt-6 w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sealed on devnet · real-time draw</p>
            <p className="mt-1 text-lg font-black tracking-tight text-white">{selectedPack.label} Draws</p>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8fe3b0]">
            {'≥'}20pt swing or flip {'→'} sealed
          </span>
        </div>

        <div className="mt-4">
          <LiveMatchTicker competition={selectedPack.sourceCompetition} />
        </div>

        {apiError && (
          <div className="mt-4 w-full rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-[11px] text-red-300">
            {apiError}
          </div>
        )}

        <div className="mt-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6">
          {openedMoment ? (
            <MomentReveal moment={openedMoment} CardArt={CardArt} queueCount={queue.length} onDismiss={handleDismiss} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm font-bold uppercase tracking-widest text-white/80">
                {queue.length > 0 ? `${queue.length} real Moment${queue.length > 1 ? 's' : ''} queued` : 'No real Moment queued right now'}
              </p>
              <p className="max-w-xs text-center text-xs text-white/40">
                Open Live for a guaranteed-real, already-detected Moment, or History for a cheaper demo seal generated fresh on the spot.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => handleOpenPack('live')}
                  disabled={paying || queue.length === 0}
                  title={queue.length === 0 ? 'No real Moment is queued right now' : undefined}
                  className="rounded-full bg-[#8fe3b0] px-6 py-3 text-xs font-black uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {paying ? 'Processing...' : `Open Live — ${LIVE_PACK_PRICE_SOL.toFixed(2)} SOL`}
                </button>
                <button
                  onClick={() => handleOpenPack('history')}
                  disabled={paying}
                  className="rounded-full bg-[#ffd447] px-6 py-3 text-xs font-black uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {paying ? 'Processing...' : `Open History — ${HISTORY_PACK_PRICE_SOL.toFixed(2)} SOL`}
                </button>
              </div>
              {paying && payStatus && (
                <p className="max-w-xs text-center text-[11px] font-bold text-[#ffd447]">{payStatus}</p>
              )}
              {!wallet.publicKey && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">Connect your wallet above to open a pack</p>
              )}
              {payError && (
                <div className="w-full max-w-xs [overflow-wrap:anywhere] rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-[11px] text-red-300">
                  {payError}
                </div>
              )}
            </div>
          )}
        </div>

        {semifinalOrFinalMoments.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Semifinal &amp; Final Draws</p>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {semifinalOrFinalMoments.slice(0, 12).map((m) => (
                <MomentTile
                  key={momentKey(m)}
                  moment={m}
                  CardArt={CardArt}
                  onOpen={() => setDetailMoment(m)}
                  className="w-36 shrink-0 sm:w-40"
                />
              ))}
            </div>
          </div>
        )}
      </div>

        {detailMoment && <MomentDetailModal moment={detailMoment} CardArt={CardArt} onClose={() => setDetailMoment(null)} />}
        {paymentPackOpen && selectedPack.art && (
          <PackPurchaseModal
            packArt={selectedPack.art}
            packLabel={selectedPack.label}
            liveAvailable={queue.length > 0}
            paying={paying}
            onCancel={() => setPaymentPackOpen(false)}
            onConfirm={handlePackPayment}
          />
        )}
      </div>
    </div>
  )
}

/** Reveal now has two beats: MomentReel plays a spin-then-land pack-opening animation first
 * (mirrors the Tarot deck's PullReel), then the detail panel — with its own share/download
 * controls in a separate normal-flow block so they never get squeezed by the fixed-height
 * card art — appears once the reel actually finishes landing. */
function MomentReveal({
  moment,
  CardArt,
  queueCount,
  onDismiss,
}: {
  moment: MomentResult
  CardArt: CardArtComponent
  queueCount: number
  onDismiss: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const { svgRef, downloading, downloadError, handleDownload } = useMomentCardDownload(moment)
  const rarityStyle = MOMENT_RARITY_STYLE[momentRarity(moment)]

  if (!revealed) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <MomentReel moment={moment} CardArt={CardArt} onLanded={() => setRevealed(true)} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Opening the live match pack…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-1 text-center md:flex-row md:items-start md:gap-5 md:text-left">
      <div className="flex w-[11.5rem] shrink-0 flex-col items-center gap-3">
        <div className="animate-[card-glow_2.4s_ease-in-out_infinite]">
          <CardArt ref={svgRef} moment={moment} className="h-64 w-[11.5rem] rounded-2xl" />
        </div>
        <MomentShareButtons moment={moment} downloading={downloading} downloadError={downloadError} onDownload={handleDownload} />
        <MomentClaimButton moment={moment} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 md:items-start animate-[rise-in_500ms_ease-out_both]">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
              isRealMoment(moment) ? 'bg-[#8fe3b0]/15 text-[#8fe3b0]' : 'bg-white/10 text-white/50'
            }`}
          >
            {isRealMoment(moment) ? 'Real · TxLINE' : 'Demo Seal'}
          </span>
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#ffd447]">
            {moment.kind === 'flip' ? 'Favorite Flip' : 'Odds Swing'}
          </span>
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${rarityStyle.badge}`}>
            {rarityStyle.label}
          </span>
        </div>
        <div className="text-2xl font-black tracking-tight text-white">
          {moment.team} <span className="text-white/40">vs</span> {moment.opponent}
        </div>
        <div className="text-xl font-black text-[#8fe3b0]">{formatSwing(moment)}</div>
        <p className="text-sm italic text-white/60">"{moment.narrative}"</p>
        <a
          href={explorerTxUrl(moment.signature)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 max-w-full truncate text-[11px] font-bold uppercase tracking-widest text-[#8fe3b0] underline decoration-[#8fe3b0]/30 underline-offset-2"
        >
          View memo tx ↗ {moment.signature.slice(0, 12)}...
        </a>

        <button
          onClick={onDismiss}
          className="mt-4 w-full rounded-full bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink transition-colors hover:bg-[#ffd447] md:w-auto"
        >
          {queueCount > 0 ? `Dismiss (${queueCount} more waiting)` : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}
