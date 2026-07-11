import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import type { Rarity } from './cardRegistry'

export interface NavbarStats {
  pullsDone: number
  pitySinceGrand: number
}

export interface NavbarLastDraw {
  name: string
  rarity: Rarity
}

const PITY_THRESHOLD = 50

const RARITY_DOT: Record<Rarity, string> = {
  minor: 'bg-paper/60',
  major: 'bg-flare',
  grand: 'bg-flare shadow-[0_0_8px_1px_#FD1789]',
}

export function Navbar({
  stats,
  lastDraw,
  onHome,
  onDraw,
  onCollection,
  onProfile,
}: {
  stats: NavbarStats | null
  lastDraw: NavbarLastDraw | null
  onHome: () => void
  onDraw: () => void
  onCollection: () => void
  onProfile: () => void
}) {
  const pityPct = stats ? Math.min(100, (stats.pitySinceGrand / PITY_THRESHOLD) * 100) : 0

  return (
    <header className="sticky top-0 z-20 border-b-4 border-ink bg-paper [padding-top:max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2.5 sm:flex-nowrap sm:px-4 sm:py-3">
        <button onClick={onHome} className="flex min-w-0 items-center gap-1.5 text-left sm:w-auto" aria-label="Return to Obsession home">
          <span className="text-flare leading-none">✦</span>
          <span className="truncate text-sm font-black uppercase tracking-tight text-ink sm:text-base">
            Obsession
          </span>
        </button>
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:flex-nowrap sm:shrink-0 sm:gap-2">
          <button onClick={onDraw} className="h-10 border-[3px] border-ink bg-flare px-2.5 text-[10px] font-black uppercase tracking-widest text-ink sm:px-3">
            Draw
          </button>
          <button onClick={onCollection} className="h-10 border-[3px] border-ink px-2.5 text-[10px] font-black uppercase tracking-widest text-ink sm:px-3">
            <span className="sm:hidden">Cards</span><span className="hidden sm:inline">Collection</span>
          </button>
          <button onClick={onProfile} className="h-10 border-[3px] border-ink px-2.5 text-[10px] font-black uppercase tracking-widest text-ink sm:px-3">
            Profile
          </button>
          <div className="origin-right scale-[0.85] sm:scale-90">
          <WalletMultiButton />
          </div>
        </div>
      </div>

      {(stats || lastDraw) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-ink/20 px-3 py-1.5 sm:px-4">
          {stats && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-ink/60">
                Asked {stats.pullsDone}
              </span>
              <div className="order-last h-1.5 w-full border border-ink/30 bg-paper sm:order-none sm:min-w-[3rem]">
                <div className="h-full bg-flare transition-all" style={{ width: `${pityPct}%` }} />
              </div>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-ink/60">
                Pity {stats.pitySinceGrand}/{PITY_THRESHOLD}
              </span>
            </div>
          )}
          {lastDraw && (
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${RARITY_DOT[lastDraw.rarity]}`} />
              <span className="max-w-[9rem] truncate text-[10px] font-bold uppercase tracking-widest text-ink/60">
                Last: {lastDraw.name}
              </span>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
