import { CollectionCardArt } from './CollectionCardArt'
import type { CollectionEntry } from './momentsApi'

const GROUP_STAGE_ROUNDS = 'ABCDEFGHIJKL'.split('').map((letter) => `Group ${letter}`)

export const ROUND_ORDER = [...GROUP_STAGE_ROUNDS, 'Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Third Place', 'Final']

export function scoreLabel(entry: CollectionEntry): string {
  if (entry.kind === 'result') return `${entry.score1} – ${entry.score2}`
  if (entry.winProbability) return `${Math.round(entry.winProbability.participant1)}% – ${Math.round(entry.winProbability.participant2)}%`
  return 'Odds pending'
}

export function CollectionTile({ entry, hasMoments, onOpen }: { entry: CollectionEntry; hasMoments: boolean; onOpen: () => void }) {
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
