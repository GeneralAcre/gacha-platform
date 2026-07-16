import { useEffect } from 'react'
import { CollectionCardArt } from './CollectionCardArt'
import { explorerTxUrl, momentKey, type CollectionEntry, type MomentResult } from './momentsApi'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-2.5 text-sm last:border-0">
      <span className="text-white/40">{label}</span>
      <span className="truncate font-bold text-white">{value}</span>
    </div>
  )
}

export function CollectionDetailModal({
  entry,
  moments,
  onClose,
}: {
  entry: CollectionEntry
  moments: MomentResult[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const isResult = entry.kind === 'result'
  const dateLabel = entry.dateMs
    ? new Date(entry.dateMs).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Unknown'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 md:p-6" onClick={onClose}>
      <div
        className="relative my-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl md:flex-row md:gap-8 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-black text-ink shadow-md transition-colors hover:bg-[#ffd447]"
        >
          ×
        </button>

        <div className="mx-auto w-full max-w-[13rem] shrink-0">
          <CollectionCardArt entry={entry} className="w-full rounded-2xl" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {entry.round} {'·'} {isResult ? 'Verified Result' : 'TxLINE Live'}
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-white">
            {entry.team1} <span className="text-white/30">vs</span> {entry.team2}
          </h2>

          {isResult ? (
            <p className="mt-2 text-3xl font-black text-[#8fe3b0]">
              {entry.score1} {'–'} {entry.score2}
            </p>
          ) : entry.winProbability ? (
            <p className="mt-2 text-lg font-black text-[#8fe3b0]">
              {Math.round(entry.winProbability.participant1)}% {'–'} {Math.round(entry.winProbability.participant2)}%
            </p>
          ) : (
            <p className="mt-2 text-sm text-white/50">Odds not yet published</p>
          )}

          <div className="mt-5 border-t border-white/10 pt-1">
            <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Match details</p>
            <DetailRow label="Round" value={entry.round} />
            <DetailRow label="Date" value={dateLabel} />
            {(entry.venue || entry.city) && (
              <DetailRow label="Venue" value={[entry.venue, entry.city].filter(Boolean).join(', ')} />
            )}
            {isResult && entry.penalties && (
              <DetailRow label="Penalties" value={`${entry.penalties.team1} – ${entry.penalties.team2}`} />
            )}
            {isResult && entry.wentToExtraTime && <DetailRow label="Duration" value="After extra time" />}
            {!isResult && <DetailRow label="Status" value={(entry.status ?? 'live').toUpperCase()} />}
          </div>

          {moments.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ffd447]">
                {moments.length} Sealed Moment{moments.length > 1 ? 's' : ''} captured
              </p>
              <ul className="flex flex-col gap-2">
                {moments.map((m) => (
                  <li key={momentKey(m)} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="min-w-0 truncate text-white/70">{m.narrative}</span>
                    <a
                      href={explorerTxUrl(m.signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 font-bold uppercase tracking-widest text-[#8fe3b0] underline underline-offset-2"
                    >
                      Tx ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isResult && (
            <p className="mt-5 text-[11px] leading-5 text-white/40">
              Sealed on devnet the instant a {'≥'}20pt swing or a favorite/underdog flip is detected in this fixture's real TxLINE odds.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
