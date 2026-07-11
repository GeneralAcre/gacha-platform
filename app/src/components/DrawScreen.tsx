import { OracleCardArt } from './OracleCardArt'
import { CATEGORIES, type Category } from './categories'

export function DrawScreen({ onSelect }: { onSelect: (category: Category) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-7 sm:px-6 sm:py-10">
      <div className="border-b-4 border-ink pb-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-ink/65">Draw a fortune</p>
        <h1 className="mt-2 text-4xl font-black uppercase leading-none text-ink sm:text-6xl">Choose a card pack.</h1>
      </div>

      <div className="grid flex-1 items-center gap-5 py-8 sm:grid-cols-3 sm:py-12">
        {CATEGORIES.map((category, index) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`group flex min-h-80 flex-col items-center justify-center border-4 border-ink p-5 text-center shadow-[7px_7px_0_#18171b] transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-none ${category.accentSoft}`}
          >
            <div className="relative">
              <div className="absolute -left-3 -top-3 h-36 w-24 rotate-[-8deg] border-2 border-ink/50 bg-ink/20" />
              <OracleCardArt category={category.id} rarity={index === 2 ? 'grand' : 'major'} className="relative h-44 w-32 border-2 border-ink bg-ink shadow-[5px_5px_0_#18171b]" />
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-ink/60">{category.symbol} card pack</p>
            <h2 className="mt-2 text-3xl font-black uppercase text-ink">{category.label}</h2>
            <span className="mt-5 border-2 border-ink bg-paper px-4 py-2 text-xs font-black uppercase tracking-widest text-ink group-hover:bg-flare">
              Draw this pack
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
