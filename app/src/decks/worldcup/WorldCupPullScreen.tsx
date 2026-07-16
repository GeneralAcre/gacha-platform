import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRecentMoments, explorerTxUrl, momentKey, type MomentResult } from './momentsApi'
import { MomentCardArt, MomentShareButtons, useMomentCardDownload } from './MomentCardArt'
import { MomentDetailModal } from './MomentDetailModal'
import { MatchCollection } from './MatchCollection'

const POLL_INTERVAL_MS = 3000

type Tab = 'feed' | 'matches'

function formatSwing(moment: MomentResult): string {
  const arrow = moment.toProbability >= moment.fromProbability ? '↑' : '↓'
  return `${Math.round(moment.fromProbability)}% → ${Math.round(moment.toProbability)}% ${arrow}`
}

export function WorldCupPullScreen({ onChangeDeck }: { onChangeDeck: () => void }) {
  const [recentMoments, setRecentMoments] = useState<MomentResult[]>([])
  const [queue, setQueue] = useState<MomentResult[]>([])
  const [currentReveal, setCurrentReveal] = useState<MomentResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('feed')
  const [detailMoment, setDetailMoment] = useState<MomentResult | null>(null)

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
        setRecentMoments(data)

        if (!initializedRef.current) {
          // Don't replay history on first load — only reveal Moments that arrive from here on.
          data.forEach((m) => seenRef.current.add(momentKey(m)))
          initializedRef.current = true
          return
        }
        enqueueFresh(data)
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
  }, [enqueueFresh])

  useEffect(() => {
    if (!currentReveal && queue.length > 0) {
      setCurrentReveal(queue[0])
      setQueue((q) => q.slice(1))
    }
  }, [queue, currentReveal])

  const handleDismiss = useCallback(() => setCurrentReveal(null), [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-0 px-4 py-10 md:py-14">
      <div className="flex w-full flex-col gap-2 border-b border-ink/10 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink/45">Active deck</p>
          <p className="text-lg font-black tracking-tight text-ink">World Cup — Moments</p>
        </div>
        <button onClick={onChangeDeck} className="rounded-full border border-ink/12 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:border-ink">
          Change
        </button>
      </div>

      <div className="mt-6 flex w-full max-w-md gap-2 rounded-full border border-ink/10 bg-paper p-1">
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 rounded-full py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
            tab === 'feed' ? 'bg-ink text-paper' : 'text-ink/50'
          }`}
        >
          Live Feed
        </button>
        <button
          onClick={() => setTab('matches')}
          className={`flex-1 rounded-full py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
            tab === 'matches' ? 'bg-ink text-paper' : 'text-ink/50'
          }`}
        >
          Matches
        </button>
      </div>

      {tab === 'matches' ? (
        <div className="mt-6 flex w-full justify-center">
          <MatchCollection recentMoments={recentMoments} />
        </div>
      ) : (
        <div className="mt-6 w-full max-w-4xl rounded-3xl bg-[#0a0a0a] p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sealed on devnet · real-time draw</p>
              <p className="mt-1 text-lg font-black tracking-tight text-white">Match Card Draws</p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8fe3b0]">
              {'≥'}20pt swing or flip {'→'} sealed
            </span>
          </div>

          {apiError && (
            <div className="mt-4 w-full rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-[11px] text-red-300">
              {apiError}
            </div>
          )}

          <div className="mt-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6">
            {currentReveal ? (
              <MomentReveal moment={currentReveal} queueCount={queue.length} onDismiss={handleDismiss} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <span className="text-3xl">⚽</span>
                <p className="text-sm font-bold uppercase tracking-widest text-white/80">Waiting for the next swing...</p>
                <p className="text-xs text-white/40">This screen polls the Moments API every few seconds.</p>
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
    </div>
  )
}

function MomentTile({ moment, onOpen }: { moment: MomentResult; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-3 text-left transition-transform hover:-translate-y-1"
    >
      <MomentCardArt moment={moment} className="w-full rounded-xl" />
      <p className="mt-3 truncate text-[10px] font-bold uppercase tracking-widest text-white/40">Sealed Moment</p>
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

/** The flip-animated card art gets a fixed height (h-64) for its 3D animation box; the
 * share/download buttons render as a separate normal-flow block so they're never squeezed
 * into (or overflowing out of) that fixed-height box. */
function MomentReveal({ moment, queueCount, onDismiss }: { moment: MomentResult; queueCount: number; onDismiss: () => void }) {
  const { svgRef, downloading, downloadError, handleDownload } = useMomentCardDownload(moment)

  return (
    <div className="flex flex-col items-center gap-4 pb-1 text-center md:flex-row md:items-start md:gap-5 md:text-left">
      <div className="flex w-[11.5rem] shrink-0 flex-col items-center gap-3">
        <div className="[perspective:1200px]">
          <div className="relative h-64 w-[11.5rem] animate-[card-flip_950ms_cubic-bezier(.3,.9,.35,1.08)_both] [transform-style:preserve-3d]">
            <div className="absolute inset-0 animate-[card-glow_2.4s_ease-in-out_1s_infinite] [backface-visibility:hidden]">
              <MomentCardArt ref={svgRef} moment={moment} className="h-64 w-[11.5rem] rounded-2xl" />
            </div>
          </div>
        </div>
        <MomentShareButtons moment={moment} downloading={downloading} downloadError={downloadError} onDownload={handleDownload} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 md:items-start animate-[rise-in_500ms_ease-out_450ms_both]">
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#ffd447]">
          {moment.kind === 'flip' ? 'Favorite Flip' : 'Odds Swing'}
        </span>
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
          {queueCount > 0 ? `Next Moment (${queueCount} waiting)` : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}
