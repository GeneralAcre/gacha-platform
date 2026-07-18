import { useCallback, useEffect, useRef, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { fetchRecentMoments, triggerSimulatedMoments, explorerTxUrl, momentKey, type MomentResult } from './momentsApi'
import { MomentCardArt, MomentShareButtons, useMomentCardDownload } from './MomentCardArt'
import { MomentReel } from './MomentReel'
import { MomentClaimButton } from './MomentClaimButton'
import { MomentDetailModal } from './MomentDetailModal'
import { MatchCollection } from './MatchCollection'
import { LiveMatchTicker } from './LiveMatchTicker'
import { CompetitionPackSelector } from './CompetitionPackSelector'
import { PackOddsPanel } from './PackOddsPanel'
import { COMPETITIONS, DEFAULT_COMPETITION } from './competitions'
import { momentRarity, MOMENT_RARITY_STYLE } from './momentRarity'
import { PACK_PRICE_SOL, payForPack, friendlyPayError } from './packPayment'

const POLL_INTERVAL_MS = 3000

function formatSwing(moment: MomentResult): string {
  const arrow = moment.toProbability >= moment.fromProbability ? '↑' : '↓'
  return `${Math.round(moment.fromProbability)}% → ${Math.round(moment.toProbability)}% ${arrow}`
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
  const [eventPaymentOpen, setEventPaymentOpen] = useState(false)
  const [selectedCompetition, setSelectedCompetition] = useState(DEFAULT_COMPETITION)
  const selectedPack = COMPETITIONS.find((pack) => pack.id === selectedCompetition) ?? COMPETITIONS[0]

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
  // seconds of on-chain work the player never asked to wait for) and only once it's
  // confirmed do we pick a Moment to reveal: whatever real live-match swing is already
  // queued, or — since none is queued between matches, or for a demo — seal a fresh one
  // on demand through the same real memo-tx pipeline.
  const handleOpenPack = useCallback(async () => {
    if (paying || openedMoment) return
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
    const fromQueue = queue.length > 0
    let nextMoment: MomentResult

    if (fromQueue) {
      nextMoment = queue[0]
    } else {
      // The player has already paid for this pack — sealing must not have a dead end,
      // so this retries on the spot (no further charge) rather than surfacing a failure
      // that would make "Open Pack" look safe to click again when it would charge twice.
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
    if (fromQueue) setQueue((q) => q.slice(1))
  }, [queue, paying, openedMoment, wallet, connection])

  const handleDismiss = useCallback(() => setOpenedMoment(null), [])

  const handleSelectCompetition = useCallback((id: string) => {
    setSelectedCompetition(id)
    setQueue([])
    setOpenedMoment(null)
  }, [])

  const handleEventPackClick = useCallback(() => {
    setSelectedCompetition('event')
    setOpenedMoment(null)
    setEventPaymentOpen(true)
  }, [])

  const handleEventPayment = useCallback(() => {
    if (paying || openedMoment) return
    setEventPaymentOpen(false)
    void handleOpenPack()
  }, [handleOpenPack, openedMoment, paying])

  return (
    <div className="w-full bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-0 px-4 py-10 md:py-14">
      <div className="w-full">
        <CompetitionPackSelector selected={selectedCompetition} onSelect={handleSelectCompetition} onEventPackClick={handleEventPackClick} />
        <PackOddsPanel />
      </div>

      {selectedPack.view === 'matches' ? (
        <div className="mt-6 flex w-full justify-center">
          <MatchCollection recentMoments={recentMoments} />
        </div>
      ) : (
        <div className="mt-6 w-full max-w-4xl rounded-3xl border border-paper/10 bg-void p-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sealed on devnet · real-time draw</p>
              <p className="mt-1 text-lg font-black tracking-tight text-white">Match Card Draws</p>
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
              <MomentReveal moment={openedMoment} queueCount={queue.length} onDismiss={handleDismiss} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm font-bold uppercase tracking-widest text-white/80">
                  {queue.length > 0 ? `${queue.length} sealed pack${queue.length > 1 ? 's' : ''} ready` : 'Ready to open a pack'}
                </p>
                <p className="max-w-xs text-center text-xs text-white/40">
                  {queue.length > 0
                    ? 'A real odds swing was just detected in a live match. Pay to open the pack and reveal the Moment card.'
                    : 'Pay to seal and open a fresh pack right now.'}
                </p>
                <button
                  onClick={handleOpenPack}
                  disabled={paying}
                  className="mt-2 rounded-full bg-[#ffd447] px-6 py-3 text-xs font-black uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {paying ? 'Processing...' : `Open Pack — ${PACK_PRICE_SOL} SOL`}
                </button>
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

          {recentMoments.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Trending Draws</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {recentMoments.slice(0, 8).map((m) => (
                  <MomentTile key={momentKey(m)} moment={m} onOpen={() => setDetailMoment(m)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

        {detailMoment && <MomentDetailModal moment={detailMoment} onClose={() => setDetailMoment(null)} />}
        {eventPaymentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="event-pack-title">
            <div className="w-full max-w-sm rounded-3xl border border-paper/15 bg-void p-6 text-center shadow-2xl">
              <img src="/worldcup-card/Event-Pull-card.png" alt="Event Pack" className="mx-auto h-36 w-28 rounded-xl bg-black object-contain shadow-lg" />
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#8fe3b0]">Event Pack</p>
              <h2 id="event-pack-title" className="mt-2 text-2xl font-black text-paper">Ready to draw?</h2>
              <p className="mt-3 text-sm leading-6 text-paper/60">Pay {PACK_PRICE_SOL.toFixed(2)} devnet SOL to open your Event Pack and reveal a sealed match moment.</p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setEventPaymentOpen(false)} className="flex-1 rounded-full border border-paper/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-paper transition-colors hover:bg-paper/10">Cancel</button>
                <button type="button" onClick={handleEventPayment} disabled={paying} className="flex-1 rounded-full bg-[#8fe3b0] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink transition-colors hover:bg-[#b1f2cb] disabled:cursor-not-allowed disabled:opacity-40">{paying ? 'Confirming...' : `Pay ${PACK_PRICE_SOL.toFixed(2)} SOL`}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MomentTile({ moment, onOpen }: { moment: MomentResult; onOpen: () => void }) {
  const rarityStyle = MOMENT_RARITY_STYLE[momentRarity(moment)]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-3 text-left transition-transform hover:-translate-y-1"
    >
      <MomentCardArt moment={moment} className="w-full rounded-xl" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/40">Sealed Moment</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${rarityStyle.badge}`}>
          {rarityStyle.label}
        </span>
      </div>
      <p className="truncate text-sm font-black tracking-tight text-white">
        {moment.team} <span className="text-white/30">vs</span> {moment.opponent}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-white/50">{formatSwing(moment)}</span>
        <span className="shrink-0 rounded-full bg-[#ffd447]/15 px-2 py-1 text-[10px] font-black text-[#ffd447]">
          {Math.abs(Math.round(moment.deltaProbability))} PTS
        </span>
      </div>
    </button>
  )
}

/** Reveal now has two beats: MomentReel plays a spin-then-land pack-opening animation first
 * (mirrors the Tarot deck's PullReel), then the detail panel — with its own share/download
 * controls in a separate normal-flow block so they never get squeezed by the fixed-height
 * card art — appears once the reel actually finishes landing. */
function MomentReveal({ moment, queueCount, onDismiss }: { moment: MomentResult; queueCount: number; onDismiss: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const { svgRef, downloading, downloadError, handleDownload } = useMomentCardDownload(moment)
  const rarityStyle = MOMENT_RARITY_STYLE[momentRarity(moment)]

  if (!revealed) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <MomentReel moment={moment} onLanded={() => setRevealed(true)} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Opening the live match pack…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-1 text-center md:flex-row md:items-start md:gap-5 md:text-left">
      <div className="flex w-[11.5rem] shrink-0 flex-col items-center gap-3">
        <div className="animate-[card-glow_2.4s_ease-in-out_infinite]">
          <MomentCardArt ref={svgRef} moment={moment} className="h-64 w-[11.5rem] rounded-2xl" />
        </div>
        <MomentShareButtons moment={moment} downloading={downloading} downloadError={downloadError} onDownload={handleDownload} />
        <MomentClaimButton moment={moment} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 md:items-start animate-[rise-in_500ms_ease-out_both]">
        <div className="flex flex-wrap items-center gap-2">
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
