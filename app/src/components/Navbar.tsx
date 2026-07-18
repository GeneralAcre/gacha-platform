import { useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import type { Rarity } from './cardRegistry'

export interface NavbarLastDraw {
  name: string
  rarity: Rarity
}

const RARITY_DOT: Record<Rarity, string> = {
  minor: 'bg-paper/30',
  major: 'bg-flare',
  grand: 'bg-flare shadow-[0_0_8px_1px_rgba(91,79,232,0.6)]',
}

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  )
}

export function Navbar({
  lastDraw,
  onHome,
  onDraw,
  onCollection,
  onProfile,
  onMarketplace,
}: {
  lastDraw: NavbarLastDraw | null
  onHome: () => void
  onDraw: () => void
  onCollection: () => void
  onProfile: () => void
  onMarketplace: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const go = (fn: () => void) => () => {
    setMenuOpen(false)
    fn()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-paper/10 bg-ink [padding-top:max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper/15 text-paper transition-colors hover:border-paper/40 md:hidden"
          >
            <HamburgerIcon />
          </button>
          <button onClick={onHome} className="flex min-w-0 items-center gap-2 text-left [&>span]:hidden" aria-label="Return to Moment home">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-paper/20 text-flare">✦</span>
            <img src="/Moment-logo.png" alt="Moment" className="h-8 w-auto" />
          </button>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: 'Draw', onClick: onDraw },
            { label: 'Collection', onClick: onCollection },
            { label: 'Profile', onClick: onProfile },
            { label: 'Marketplace', onClick: onMarketplace },
          ].map((item) => (
            <button key={item.label} type="button" onClick={item.onClick} className="rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper">
              {item.label}
            </button>
          ))}
        </nav>

        <div className="order-3 flex items-center gap-2 md:ml-auto md:shrink-0">
          <div className="origin-right scale-90">
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {lastDraw && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-paper/10 px-4 py-1.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${RARITY_DOT[lastDraw.rarity]}`} />
            <span className="max-w-[9rem] truncate text-[10px] font-bold uppercase tracking-widest text-paper/50">
              Last: {lastDraw.name}
            </span>
          </div>
        </div>
      )}

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-20 cursor-default bg-ink/60"
          />
          <div className="absolute left-4 top-full z-30 mt-2 w-56 rounded-2xl border border-paper/10 bg-void p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)]">
            {[
              { label: 'Draw', onClick: onDraw },
              { label: 'Collection', onClick: onCollection },
              { label: 'Profile', onClick: onProfile },
              { label: 'Marketplace', onClick: onMarketplace },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={go(item.onClick)}
                className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold uppercase tracking-wide text-paper/80 transition-colors hover:bg-paper/5 hover:text-paper"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
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
    <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1.5 border-t border-paper/10 bg-ink px-2 pt-2 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <button onClick={onDraw} className="h-11 flex-1 rounded-full border border-paper/15 text-[10px] font-bold uppercase tracking-widest text-paper active:bg-paper/10">
        Draw
      </button>
      <button onClick={onCollection} className="h-11 flex-1 rounded-full border border-paper/15 text-[10px] font-bold uppercase tracking-widest text-paper active:bg-paper/10">
        Collection
      </button>
      <button onClick={onProfile} className="h-11 flex-1 rounded-full border border-paper/15 text-[10px] font-bold uppercase tracking-widest text-paper active:bg-paper/10">
        Profile
      </button>
    </nav>
  )
}
