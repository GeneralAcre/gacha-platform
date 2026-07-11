import type { CardInfo, Rarity } from './cardRegistry'
import { CATEGORIES, type Category } from './categories'
import { OracleCardArt } from './OracleCardArt'

export interface JournalEntry {
  card: CardInfo
  category: Category
  at: number
  intention: string
}

const RARITY_LABEL: Record<Rarity, string> = {
  minor: 'MINOR OMEN',
  major: 'MAJOR OMEN',
  grand: 'GRAND REVELATION',
}

function categoryLabel(id: Category): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id
}

export function ProfileScreen({ entries, walletAddress }: { entries: JournalEntry[]; walletAddress: string | null }) {
  if (entries.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/65">Player profile</p>
        <p className="text-3xl font-black uppercase text-ink">Your cabinet is waiting.</p>
        <p className="text-sm text-ink/65">Draw a fortune to begin your collection.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-ink pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/65">Player profile</p>
          <h1 className="mt-2 text-4xl font-black uppercase text-ink sm:text-5xl">My fortune cards</h1>
          {walletAddress && <p className="mt-2 font-mono text-xs text-ink/65">{walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}</p>}
        </div>
        <div className="border-4 border-ink bg-paper px-5 py-3 text-center shadow-[4px_4px_0_#18171b]">
          <p className="text-2xl font-black text-ink">{entries.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/65">Cards collected</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry, i) => (
        <article key={`${entry.at}-${i}`} className="flex gap-4 border-4 border-ink bg-paper p-3 shadow-[5px_5px_0_#18171b]">
          <OracleCardArt category={entry.category} rarity={entry.card.rarity} className="h-36 w-24 shrink-0 border-2 border-ink bg-ink" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-flare">
                {RARITY_LABEL[entry.card.rarity]} · {categoryLabel(entry.category)}
              </span>
              <span className="text-[10px] text-ink/50">{new Date(entry.at).toLocaleTimeString()}</span>
            </div>
            <div className="mt-2 font-black uppercase text-ink">{entry.card.name}</div>
            <p className="mt-1 text-xs italic text-ink/70">"{entry.card.reading}"</p>
            {entry.intention && <p className="mt-3 border-l-2 border-flare pl-2 text-[11px] font-bold text-ink/70">Wish: {entry.intention}</p>}
          </div>
        </article>
      ))}
      </div>
    </div>
  )
}
