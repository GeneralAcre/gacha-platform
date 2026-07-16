export type DeckChoice = 'tarot' | 'worldcup'

export function PlatformHome({ onSelect }: { onSelect: (deck: DeckChoice) => void }) {
  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 md:px-6 md:py-14">
      <header className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink/50">Obsession · 02 decks live</p>
        <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight text-ink md:text-6xl">Choose your deck</h1>
      </header>

      <section className="relative mx-auto mt-10 grid w-full gap-6 grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect('tarot')}
          aria-label="Open the Tarot deck"
          className="group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper text-left transition-transform hover:-translate-y-1"
        >
          <div className="h-56 w-full overflow-hidden bg-black">
            <img src="/Browse-deck.png" alt="Tarot deck" className="h-full w-full object-cover object-center opacity-90 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-ink/45">Gacha deck</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-ink">Tarot Deck</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/65">
              Draw a sealed on-chain card reading for life, relationships, or the chronically online.
            </p>
            <span className="mt-5 w-full rounded-full bg-ink px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[.08em] text-paper transition-colors group-hover:bg-flare">
              Enter Tarot Deck
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect('worldcup')}
          aria-label="Open the World Cup deck"
          className="group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper text-left transition-transform hover:-translate-y-1"
        >
          <div className="flex h-56 w-full flex-col items-center justify-center gap-2 bg-[#0b3d24]">
            <span className="text-6xl">⚽</span>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#ffd447]">Live · TxLINE</span>
          </div>
          <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-ink/45">Live sports deck</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-ink">World Cup Deck</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/65">
              Real World Cup odds-swing Moments, sealed as devnet transactions the instant a match tips.
            </p>
            <span className="mt-5 w-full rounded-full bg-ink px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[.08em] text-paper transition-colors group-hover:bg-flare">
              Enter World Cup Deck
            </span>
          </div>
        </button>
      </section>
    </div>
  )
}
