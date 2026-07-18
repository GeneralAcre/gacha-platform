import { useEffect, useRef, useState } from 'react'
import { MomentCardArt } from './MomentCardArt'
import type { MomentResult } from './momentsApi'
import { momentRarity, MOMENT_RARITY_STYLE } from './momentRarity'

const TILE_WIDTH = 72
const TILE_HEIGHT = 100
const TILE_GAP = 8
const STEP = TILE_WIDTH + TILE_GAP
const LANDING_INDEX = 18
const FILLER_BEFORE_COUNT = LANDING_INDEX
const FILLER_AFTER_COUNT = 5
const SPIN_TILE_COUNT = 10
const VIEWPORT_MAX_WIDTH = 320
// The event already happened by the time we start this animation (we polled it from the
// API) — this is a fixed theatrical "opening the pack" beat, not a wait on real data.
const SPIN_DURATION_MS = 900

function SealedTile() {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#141414] text-lg"
      style={{ width: TILE_WIDTH, height: TILE_HEIGHT }}
      aria-hidden="true"
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Moment</span>
    </div>
  )
}

/** Same reel-then-land mechanic as the Tarot deck's PullReel, adapted for a Moment that's
 * already resolved: a short fixed spin for the "opening the pack" beat, then a deceleration
 * onto the real MomentCardArt. Filler tiles are a generic sealed-pack glyph, never another
 * team's data — there is nothing to synthesize since these are real match events. */
export function MomentReel({ moment, onLanded }: { moment: MomentResult; onLanded: () => void }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'spin' | 'landing'>('spin')
  const [landed, setLanded] = useState(false)
  const [targetOffset, setTargetOffset] = useState(0)
  const rarityAccent = MOMENT_RARITY_STYLE[momentRarity(moment)].accent

  useEffect(() => {
    setPhase('spin')
    setLanded(false)
    const timer = window.setTimeout(() => setPhase('landing'), SPIN_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [moment])

  useEffect(() => {
    if (phase !== 'landing') return
    const width = viewportRef.current?.clientWidth ?? VIEWPORT_MAX_WIDTH
    setTargetOffset(LANDING_INDEX * STEP + STEP / 2 - width / 2)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setLanded(true)))
    return () => cancelAnimationFrame(id)
  }, [phase])

  return (
    <div
      ref={viewportRef}
      className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]"
      style={{ maxWidth: VIEWPORT_MAX_WIDTH, height: TILE_HEIGHT + 24 }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 transition-colors duration-300"
        style={{ background: rarityAccent, boxShadow: `0 0 10px 2px ${rarityAccent}b3` }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent"
        style={{ borderTopColor: rarityAccent }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[6px] border-x-transparent"
        style={{ borderBottomColor: rarityAccent }}
      />

      {phase === 'spin' ? (
        <div className="flex animate-[reel-spin_0.9s_linear_infinite] items-center p-3" style={{ gap: TILE_GAP, width: 'max-content' }}>
          {Array.from({ length: SPIN_TILE_COUNT * 2 }).map((_, i) => (
            <SealedTile key={i} />
          ))}
        </div>
      ) : (
        <div
          className="flex items-center p-3"
          style={{
            gap: TILE_GAP,
            width: 'max-content',
            transform: `translateX(-${landed ? targetOffset : 0}px)`,
            transition: landed ? 'transform 2200ms cubic-bezier(0.11,0.68,0.16,1), filter 2200ms ease-out' : 'none',
            filter: landed ? 'blur(0px)' : 'blur(2.5px)',
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'transform' && e.target === e.currentTarget) onLanded()
          }}
        >
          {Array.from({ length: FILLER_BEFORE_COUNT }).map((_, i) => (
            <SealedTile key={`b${i}`} />
          ))}
          <div
            className="shrink-0 overflow-hidden rounded-lg border transition-shadow duration-300"
            style={{
              width: TILE_WIDTH,
              height: TILE_HEIGHT,
              borderColor: landed ? rarityAccent : 'rgba(255,255,255,0.1)',
              boxShadow: landed ? `0 0 18px 2px ${rarityAccent}80` : 'none',
            }}
          >
            <MomentCardArt moment={moment} className="h-full w-full" />
          </div>
          {Array.from({ length: FILLER_AFTER_COUNT }).map((_, i) => (
            <SealedTile key={`a${i}`} />
          ))}
        </div>
      )}
    </div>
  )
}
