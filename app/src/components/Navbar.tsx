import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import type { Rarity } from './cardRegistry'

export interface NavbarLastDraw {
  name: string
  rarity: Rarity
}

const RARITY_DOT: Record<Rarity, string> = {
  minor: 'bg-paper/60',
  major: 'bg-flare',
  grand: 'bg-flare shadow-[0_0_8px_1px_#FD1789]',
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
      <header className="sticky top-0 z-20 border-b-4 border-ink bg-paper [padding-top:max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-x-2 gap-y-2 px-4 py-3">
          <button onClick={onHome} className="flex min-w-0 items-center gap-1.5 text-left" aria-label="Return to Obsession home">
          <span className="text-flare leading-none">✦</span>
          <span className="truncate text-base font-black uppercase tracking-tight text-ink">
            Obsession
          </span>
        </button>
          <div className="flex shrink-0 items-center gap-2">
          <button onClick={onDraw} className="h-10 border-[3px] border-ink bg-flare px-3 text-[10px] font-black uppercase tracking-widest text-ink">
            Draw
          </button>
          <button onClick={onCollection} className="h-10 border-[3px] border-ink px-3 text-[10px] font-black uppercase tracking-widest text-ink">
            Collection
          </button>
          <button onClick={onProfile} className="h-10 border-[3px] border-ink px-3 text-[10px] font-black uppercase tracking-widest text-ink">
            Profile
          </button>
          <div className="origin-right scale-90">
            <WalletMultiButton />
          </div>
          </div>
        </div>

      {lastDraw && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-ink/20 px-4 py-1.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${RARITY_DOT[lastDraw.rarity]}`} />
            <span className="max-w-[9rem] truncate text-[10px] font-bold uppercase tracking-widest text-ink/60">
              Last: {lastDraw.name}
            </span>
          </div>
        </div>
      )}
      </header>
  )
}
