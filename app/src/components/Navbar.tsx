import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import type { Rarity } from './cardRegistry'

export interface NavbarLastDraw {
  name: string
  rarity: Rarity
}

const RARITY_DOT: Record<Rarity, string> = {
  minor: 'bg-ink/30',
  major: 'bg-flare',
  grand: 'bg-flare shadow-[0_0_8px_1px_rgba(91,79,232,0.6)]',
}

export function Navbar({
  lastDraw,
  onHome,
  onDraw,
  onCollection,
  onProfile,
}: {
  lastDraw: NavbarLastDraw | null
  onHome: () => void
  onDraw: () => void
  onCollection: () => void
  onProfile: () => void
}) {
  return (
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper [padding-top:max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-3 md:px-6">
          <button onClick={onHome} className="flex min-w-0 items-center gap-1.5 text-left" aria-label="Return to Obsession home">
          <span className="text-flare leading-none">✦</span>
          <span className="truncate text-base font-black uppercase tracking-tight text-ink">
            Obsession
          </span>
        </button>
          {/* Phones: only brand + wallet up top; Draw/Collection/Profile live in the
              fixed bottom bar below. From md up everything joins one top row. */}
          <div className="order-2 origin-right scale-90 md:order-4">
            <WalletMultiButton />
          </div>
          <div className="order-3 hidden items-center gap-2 md:ml-auto md:flex md:shrink-0">
          <button onClick={onDraw} className="h-9 rounded-full border border-ink/12 px-4 text-[11px] font-bold uppercase tracking-wide text-ink transition-colors hover:border-ink">
            Draw
          </button>
          <button onClick={onCollection} className="h-9 rounded-full border border-ink/12 px-4 text-[11px] font-bold uppercase tracking-wide text-ink transition-colors hover:border-ink">
            Collection
          </button>
          <button onClick={onProfile} className="h-9 rounded-full border border-ink/12 px-4 text-[11px] font-bold uppercase tracking-wide text-ink transition-colors hover:border-ink">
            Profile
          </button>
          </div>
        </div>

      {lastDraw && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink/10 px-4 py-1.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${RARITY_DOT[lastDraw.rarity]}`} />
            <span className="max-w-[9rem] truncate text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Last: {lastDraw.name}
            </span>
          </div>
        </div>
      )}
      </header>
  )
}

/** Phone-only bottom navigation. Hidden from md up, where the Navbar shows these buttons. */
export function MobileNav({
  onDraw,
  onCollection,
  onProfile,
}: {
  onDraw: () => void
  onCollection: () => void
  onProfile: () => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1.5 border-t border-ink/10 bg-paper px-2 pt-2 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <button onClick={onDraw} className="h-11 flex-1 rounded-full border border-ink/12 text-[10px] font-bold uppercase tracking-widest text-ink active:bg-ink/5">
        Draw
      </button>
      <button onClick={onCollection} className="h-11 flex-1 rounded-full border border-ink/12 text-[10px] font-bold uppercase tracking-widest text-ink active:bg-ink/5">
        Collection
      </button>
      <button onClick={onProfile} className="h-11 flex-1 rounded-full border border-ink/12 text-[10px] font-bold uppercase tracking-widest text-ink active:bg-ink/5">
        Profile
      </button>
    </nav>
  )
}
