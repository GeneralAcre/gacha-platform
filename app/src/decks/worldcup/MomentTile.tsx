import { MomentCardArt } from './MomentCardArt'
import { momentRarity, MOMENT_RARITY_STYLE } from './momentRarity'
import { isRealMoment, type MomentResult } from './momentsApi'

export type CardArtComponent = typeof MomentCardArt

export function formatSwing(moment: MomentResult): string {
  const arrow = moment.toProbability >= moment.fromProbability ? '↑' : '↓'
  return `${Math.round(moment.fromProbability)}% → ${Math.round(moment.toProbability)}% ${arrow}`
}

/** A single Sealed Moment card — shared by WorldCupPullScreen's Trending Draws strip and
 * CollectionScreen's Sealed Moments grid, so the two stay visually identical. `className`
 * controls the outer sizing: a fixed width for a horizontal-scroll strip, or `w-full` (the
 * default) to fill a grid cell. */
export function MomentTile({
  moment,
  CardArt,
  onOpen,
  className = 'w-full',
}: {
  moment: MomentResult
  CardArt: CardArtComponent
  onOpen: () => void
  className?: string
}) {
  const rarityStyle = MOMENT_RARITY_STYLE[momentRarity(moment)]
  const isReal = isRealMoment(moment)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-3 text-left transition-transform hover:-translate-y-1 ${className}`}
    >
      <div className="relative">
        <CardArt moment={moment} className="w-full rounded-xl" />
        <span
          className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest shadow ${
            isReal ? 'bg-[#8fe3b0] text-ink' : 'bg-white/85 text-ink/70'
          }`}
        >
          {isReal ? 'Real' : 'Demo'}
        </span>
      </div>
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
