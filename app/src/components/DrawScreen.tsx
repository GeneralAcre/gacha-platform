import { CATEGORIES, type Category } from './categories'

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
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="relative border-b-4 border-ink pb-5 sm:flex sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-ink/65">Obsession gacha terminal · 03 decks live</p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-[.86] text-ink sm:text-6xl">Pick your<br className="sm:hidden" /> next omen.</h1>
        </div>
        <p className="mt-4 max-w-xs text-sm font-bold leading-5 text-ink/70 sm:mt-0 sm:text-right">Each sealed card is resolved on-chain. The reveal is yours to keep.</p>
      </header>

      <section className="relative mx-auto mt-8 grid gap-6 lg:grid-cols-3">
        {CATEGORIES.map((category) => {
          const detail = PACK_DETAILS[category.id]
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              aria-label={`Open the ${category.label} card pack`}
              className="group flex h-full flex-col gap-4 rounded-none text-left transition hover:-translate-y-0.5"
            >
              <div className="overflow-hidden rounded-sm border-4 border-ink bg-ink shadow-[5px_5px_0_#18171b]">
                <div className="aspect-[4/5] w-full overflow-hidden bg-black">
                  <img src={detail.art} alt={`${category.label} card pack`} className="h-full w-full object-contain object-center" />
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between rounded-sm border-4 border-ink bg-paper p-4 shadow-[5px_5px_0_#18171b] sm:p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.22em] text-ink/60">{category.label} deck</p>
                  <h2 className="mt-2 text-2xl font-black uppercase leading-tight text-ink">{category.label}</h2>
                </div>

                <p className="mt-4 text-sm leading-6 text-ink/75">{category.description}</p>

                <button className="mt-5 w-full rounded-sm border-2 border-ink bg-ink px-4 py-3 text-xs font-black uppercase tracking-[.14em] text-paper transition-transform group-hover:-translate-y-1">
                  Open {category.label} pack
                </button>
              </div>
            </button>
          )
        })}
      </section>
    </div>
  )
}
