import { useEffect } from 'react'
import { MomentCardArt } from './MomentCardArt'
import { MomentClaimButton } from './MomentClaimButton'
import { explorerTxUrl, type MomentResult } from './momentsApi'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-2.5 text-sm last:border-0">
      <span className="text-white/40">{label}</span>
      <span className="truncate font-bold text-white">{value}</span>
    </div>
  )
}

export function MomentDetailModal({ moment, onClose }: { moment: MomentResult; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const sealedAt = new Date(moment.timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

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
          <MomentCardArt moment={moment} className="w-full rounded-2xl" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sealed Moment</p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-white">
            {moment.team} <span className="text-white/30">vs</span> {moment.opponent}
          </h2>
          <p className="mt-2 text-sm italic leading-6 text-white/60">"{moment.narrative}"</p>

          <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#ffd447]/15 px-3 py-1.5 text-xs font-black text-[#ffd447]">
            {Math.abs(Math.round(moment.deltaProbability))} PTS {'·'} {moment.kind === 'flip' ? 'FLIP' : 'SWING'}
          </span>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Fixture</p>
              <p className="mt-1 truncate text-sm font-bold text-white">#{moment.fixtureId}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Memo signature</p>
              <a
                href={explorerTxUrl(moment.signature)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm font-bold text-[#8fe3b0] underline underline-offset-2"
              >
                {moment.signature.slice(0, 14)}...
              </a>
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-1">
            <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Moment details</p>
            <DetailRow label="Kind" value={moment.kind === 'flip' ? 'Favorite Flip' : 'Odds Swing'} />
            <DetailRow label="From probability" value={`${Math.round(moment.fromProbability)}%`} />
            <DetailRow label="To probability" value={`${Math.round(moment.toProbability)}%`} />
            <DetailRow label="Delta" value={`${moment.deltaProbability > 0 ? '+' : ''}${Math.round(moment.deltaProbability)} pts`} />
            {moment.matchMinute !== undefined && <DetailRow label="Match minute" value={`${moment.matchMinute}'`} />}
            <DetailRow label="Sealed at" value={sealedAt} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={explorerTxUrl(moment.signature)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-ink transition-colors hover:bg-[#ffd447] md:px-6"
            >
              View on Solana Explorer ↗
            </a>
            <MomentClaimButton moment={moment} showSellControls />
          </div>
        </div>
      </div>
    </div>
  )
}
