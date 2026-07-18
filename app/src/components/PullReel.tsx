import { useEffect, useMemo, useRef, useState } from 'react'
import { OracleCardArt } from './OracleCardArt'
import type { CardInfo, Rarity } from './cardRegistry'
import type { Category } from './categories'

const TILE_WIDTH = 72
const TILE_HEIGHT = 100
const TILE_GAP = 8
const STEP = TILE_WIDTH + TILE_GAP
const LANDING_INDEX = 22
const FILLER_BEFORE_COUNT = LANDING_INDEX
const FILLER_AFTER_COUNT = 6
const SPIN_FILLER_COUNT = 10
const VIEWPORT_MAX_WIDTH = 320

// Cosmetic odds for the tiles that fly past before landing — unrelated to the real
// on-chain rarity roll, just weighted so the strip mostly reads as "common" like a real reel.
const FILLER_WEIGHTS: [Rarity, number][] = [
  ['minor', 70],
  ['major', 25],
  ['grand', 5],
]

function randomFillerRarity(): Rarity {
  const total = FILLER_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = Math.random() * total
  for (const [rarity, weight] of FILLER_WEIGHTS) {
    if (roll < weight) return rarity
    roll -= weight
  }
  return 'minor'
}

function makeFiller(count: number): Rarity[] {
  return Array.from({ length: count }, randomFillerRarity)
}

function ReelTile({ category, rarity, highlight }: { category: Category; rarity: Rarity; highlight?: boolean }) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-lg border transition-shadow duration-300 ${
        highlight ? 'border-flare shadow-[0_0_18px_2px_rgba(91,79,232,0.65)]' : 'border-paper/10'
      }`}
      style={{ width: TILE_WIDTH, height: TILE_HEIGHT }}
    >
      <OracleCardArt category={category} rarity={rarity} className="h-full w-full" />
    </div>
  )
}

/** CS:GO-case-style reveal: an endless strip spins while the on-chain pull is in
 * flight ("phase=spin"), then swaps to a strip with the real card seeded near the
 * end and decelerates to a stop under the center pointer ("phase=landing"). Calls
 * onLanded once the deceleration transition actually finishes. */
export function PullReel({
  category,
  phase,
  result,
  onLanded,
}: {
  category: Category
  phase: 'spin' | 'landing'
  result: CardInfo | null
  onLanded: () => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [landed, setLanded] = useState(false)
  const [targetOffset, setTargetOffset] = useState(0)

  const spinFiller = useMemo(() => makeFiller(SPIN_FILLER_COUNT), [])
  const landingFiller = useMemo(
    () => (result ? { before: makeFiller(FILLER_BEFORE_COUNT), after: makeFiller(FILLER_AFTER_COUNT) } : null),
    [result]
  )

  useEffect(() => {
    if (phase !== 'landing' || !result) return
    setLanded(false)
    const width = viewportRef.current?.clientWidth ?? VIEWPORT_MAX_WIDTH
    setTargetOffset(LANDING_INDEX * STEP + STEP / 2 - width / 2)
    // Two rAFs so the browser paints the "reset to start" frame before the
    // transform/transition that animates to the landing offset kicks in.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setLanded(true)))
    return () => cancelAnimationFrame(id)
  }, [phase, result])

  return (
    <div
      ref={viewportRef}
      className="relative mx-auto w-full overflow-hidden rounded-2xl border border-paper/10 bg-[#120e24]"
      style={{ maxWidth: VIEWPORT_MAX_WIDTH, height: TILE_HEIGHT + 24 }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-flare shadow-[0_0_10px_2px_rgba(91,79,232,0.7)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-flare" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[6px] border-x-transparent border-b-flare" />

      {phase === 'spin' ? (
        <div className="flex animate-[reel-spin_0.9s_linear_infinite] items-center p-3" style={{ gap: TILE_GAP, width: 'max-content' }}>
          {[...spinFiller, ...spinFiller].map((rarity, i) => (
            <ReelTile key={i} category={category} rarity={rarity} />
          ))}
        </div>
      ) : result && landingFiller ? (
        <div
          className="flex items-center p-3"
          style={{
            gap: TILE_GAP,
            width: 'max-content',
            transform: `translateX(-${landed ? targetOffset : 0}px)`,
            transition: landed ? 'transform 2500ms cubic-bezier(0.11,0.68,0.16,1), filter 2500ms ease-out' : 'none',
            filter: landed ? 'blur(0px)' : 'blur(2.5px)',
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'transform' && e.target === e.currentTarget) onLanded()
          }}
        >
          {landingFiller.before.map((rarity, i) => (
            <ReelTile key={`b${i}`} category={category} rarity={rarity} />
          ))}
          <ReelTile category={category} rarity={result.rarity} highlight={landed} />
          {landingFiller.after.map((rarity, i) => (
            <ReelTile key={`a${i}`} category={category} rarity={rarity} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
