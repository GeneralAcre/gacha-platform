import { COMPETITIONS } from './competitions'
import { PACK_PRICE_SOL } from './packPayment'

// Every pack's art is a slightly different native ratio (0.60-0.67), so letting each tile
// size to its own image's aspect ratio left them at mismatched heights in the same row --
// a fixed 2:3 box (object-cover) makes every tile, art or placeholder, exactly the same
// size regardless of source image proportions. Same cap at every breakpoint so mobile
// doesn't end up with an oversized column relative to the viewport.
const ART_MAX_WIDTH = 'max-w-[160px] sm:max-w-[190px] md:max-w-[210px]'

export function CompetitionPackSelector({ selected, onPackClick }: { selected: string; onPackClick: (id: string) => void }) {
  return (
    <section aria-label="Choose a pack">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8fe3b0]">Choose your pack</p>
          <h1 className="font-koulen mt-1 text-2xl tracking-tight text-paper md:text-3xl">Open a match moment</h1>
        </div>
        <p className="rounded-full border border-paper/15 bg-paper/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-paper/60">{PACK_PRICE_SOL.toFixed(2)} devnet SOL / pack</p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-5">
        {COMPETITIONS.map((comp) => {
          const isSelected = comp.id === selected
          return (
            <button
              key={comp.id}
              type="button"
              disabled={!comp.live}
              onClick={() => onPackClick(comp.id)}
              aria-pressed={isSelected}
              className={`group relative flex flex-col text-left transition-transform ${!comp.live ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-1'}`}
            >
              {isSelected && (
                <span className={`absolute right-1.5 top-1.5 z-10 rounded-full bg-[#8fe3b0] px-2 py-1 text-[8px] font-black uppercase tracking-widest text-ink shadow`}>
                  Selected
                </span>
              )}
              {comp.art ? (
                <div
                  className={`aspect-[2/3] w-full ${ART_MAX_WIDTH} overflow-hidden rounded-2xl shadow-[0_16px_32px_-20px_rgba(0,0,0,0.9)] transition-shadow ${isSelected ? 'ring-2 ring-[#8fe3b0] ring-offset-2 ring-offset-ink' : 'group-hover:shadow-[0_16px_32px_-12px_rgba(143,227,176,0.35)]'}`}
                >
                  <img src={comp.art} alt={`${comp.label} artwork`} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div
                  className={`flex aspect-[2/3] w-full ${ART_MAX_WIDTH} flex-col items-center justify-center rounded-2xl border border-dashed border-paper/15 bg-paper/[0.03] px-2 text-center transition-shadow ${isSelected ? 'ring-2 ring-[#8fe3b0] ring-offset-2 ring-offset-ink' : ''}`}
                >
                  <span className="text-[8px] font-bold uppercase tracking-widest text-paper/40">
                    {comp.live ? 'Pack art' : 'Coming soon'}
                  </span>
                </div>
              )}
              <div className={`pt-3 ${ART_MAX_WIDTH}`}>
                <p className="text-sm font-black leading-tight text-paper">{comp.label}</p>
                <p className={`mt-1 text-[9px] font-bold uppercase tracking-widest ${comp.live ? 'text-[#8fe3b0]' : 'text-paper/40'}`}>{comp.live ? `${PACK_PRICE_SOL.toFixed(2)} devnet SOL` : 'Coming soon'}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
