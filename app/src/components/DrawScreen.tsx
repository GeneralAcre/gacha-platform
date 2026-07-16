import { CATEGORIES, type Category } from './categories'
import { PACK_PRICE_SOL } from './cardRegistry'

const PACK_DETAILS: Record<Category, { art: string; accent: string }> = {
  life: {
    art: '/cards/Card-Life.png',
    accent: 'bg-[#f8d15c]',
  },
  relationship: {
    art: '/cards/Card-Relation.png',
    accent: 'bg-[#f6aaa8]',
  },
  meme: {
    art: '/cards/Card-Meme.png',
    accent: 'bg-[#a9d7ff]',
  },
}

export function DrawScreen({ onSelect }: { onSelect: (category: Category) => void }) {
  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 md:px-6 md:py-14">
      <header className="relative">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink/50">Obsession gacha terminal · 03 decks live</p>
          <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight text-ink md:text-6xl">Pick your next omen</h1>
        </div>
      </header>

      <section className="relative mx-auto mt-10 grid gap-6 grid-cols-1 lg:grid-cols-3">
        {CATEGORIES.map((category) => {
          const detail = PACK_DETAILS[category.id]
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              aria-label={`Open the ${category.label} card pack`}
              className="group flex w-full min-w-0 h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper text-left transition-transform hover:-translate-y-1"
            >
              <div className="h-48 w-full overflow-hidden bg-black md:h-auto md:aspect-[4/5]">
                <img src={detail.art} alt={`${category.label} card pack`} className="h-full w-full object-contain object-center" />
              </div>

              <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.22em] text-ink/45">{category.label} deck</p>
                    <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-ink">{category.label}</h2>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-ink/65">{category.description}</p>

                <span className="mt-5 w-full break-words whitespace-normal rounded-full bg-ink px-3 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-paper text-center transition-colors group-hover:bg-flare">
                  Open pack : {PACK_PRICE_SOL[category.id].toFixed(3)} SOL
                </span>
              </div>
            </button>
          )
        })}
      </section>
    </div>
  )
}
