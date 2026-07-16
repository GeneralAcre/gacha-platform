import { useEffect, useMemo, useState } from 'react'
import { getCollectionCards, type Rarity, RARITY_MAP } from './cardRegistry'
import { CATEGORIES, getCategory } from './categories'

const RARITY_LABEL: Record<Rarity, string> = {
  minor: 'Minor Omen',
  major: 'Major Omen',
  grand: 'Grand Revelation',
}

// Rarity is shown as a ring/badge around the shared deck art, not as separate artwork.
const RARITY_RING: Record<Rarity, string> = {
  minor: 'border-ink/15',
  major: 'border-flare',
  grand: 'border-flare shadow-[0_0_24px_-4px_rgba(91,79,232,0.5)]',
}

const allCards = getCollectionCards()

export function CollectionScreen() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const cards = useMemo(() => allCards, [])

  const groupedCards = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        categoryInfo: getCategory(category.id),
        rarities: RARITY_MAP.map((rarity) => ({
          rarity,
          items: cards
            .map((item, index) => ({ ...item, index }))
            .filter((item) => item.category === category.id && item.card.rarity === rarity),
        })),
      })),
    [cards]
  )

  useEffect(() => {
    if (activeIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex])

  const active = activeIndex === null ? null : cards[activeIndex]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">The complete set</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-ink md:text-5xl">Fortune card collection</h1>
        </div>
        <p className="max-w-xs text-sm text-ink/60">Every card that can emerge from Madame Obsession's sealed gacha decks.</p>
      </div>

      {groupedCards.map(({ categoryInfo, rarities }) => (
        <section key={categoryInfo.id} className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">{categoryInfo.label} deck</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-ink md:text-4xl">{categoryInfo.description}</h2>
            </div>
          </div>

          <div className="mt-6 space-y-8">
            {rarities.map(({ rarity, items }) => (
              <div key={rarity} className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-ink">
                  <span className={`inline-flex h-3 w-3 rounded-full ${
                    rarity === 'minor' ? 'bg-ink/30' : 'bg-flare'
                  }`} />
                  <span>{RARITY_LABEL[rarity]}</span>
                  <span className="text-ink/40">({items.length} cards)</span>
                </div>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {items.map(({ category, card, index }) => (
                    <article
                      key={`${category}-${card.rarity}-${card.name}`}
                      onClick={() => setActiveIndex(index)}
                      className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-ink/10 bg-paper p-3 text-center transition-transform hover:-translate-y-1"
                    >
                      <img
                        src={card.image}
                        alt={`${card.name} card art`}
                        className={`h-36 w-full rounded-xl border-2 bg-ink object-cover ${RARITY_RING[card.rarity]}`}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-flare">{RARITY_LABEL[card.rarity]}</p>
                        <h3 className="mt-2 text-lg font-black leading-tight tracking-tight text-ink">{card.name}</h3>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {active && (
        <div
          className="fixed inset-0 z-50 flex overflow-y-auto bg-ink/80 p-3 items-center justify-center md:p-4"
          onClick={() => setActiveIndex(null)}
        >
          <div
            className="relative my-auto flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-ink/10 bg-paper p-5 shadow-xl md:flex-row md:gap-5 md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              aria-label="Close"
              className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-lg font-black text-paper shadow-md transition-colors hover:bg-flare"
            >
              ×
            </button>

            <img
              src={active.card.image}
              alt={`${active.card.name} card art`}
              className={`mx-auto h-52 w-36 shrink-0 rounded-xl border-2 bg-ink object-cover mx-0 h-64 w-44 ${RARITY_RING[active.card.rarity]}`}
              key={activeIndex}
            />

            <div className="flex min-w-0 flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-flare">{RARITY_LABEL[active.card.rarity]}</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-ink">{active.card.name}</h2>
              <p className="mt-3 text-sm italic leading-6 text-ink/65">"{active.card.reading}"</p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-ink/40">{getCategory(active.category).label} deck</p>

              <div className="mt-5 pt-5 border-t border-ink/10">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Rarity: {RARITY_LABEL[active.card.rarity]}</p>
                <p className="mt-3 text-sm leading-6 text-ink/65">Meaning: {active.card.meaning}</p>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-ink/40">{getCategory(active.category).label} deck</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
