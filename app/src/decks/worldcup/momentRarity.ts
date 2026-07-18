import type { MomentResult } from './momentsApi'

export type MomentRarity = 'common' | 'rare' | 'legendary'

// A flip means the market's favorite reversed — significant even at a moderate
// magnitude, so it gets a flat bump on top of the swing size itself.
const FLIP_BONUS = 15
const RARE_THRESHOLD = 30
const LEGENDARY_THRESHOLD = 55

type RarityInput = Pick<MomentResult, 'deltaProbability' | 'kind'>

/** Rarity is graded entirely from numbers the odds feed already gives us: how far the
 * win probability actually moved, plus a bonus if the favorite changed. There's no
 * shot/goal event feed behind this data, so rarity can't be graded by event type —
 * only by how much the market's expectation actually moved. */
export function momentRarityScore(moment: RarityInput): number {
  return Math.abs(moment.deltaProbability) + (moment.kind === 'flip' ? FLIP_BONUS : 0)
}

export function momentRarity(moment: RarityInput): MomentRarity {
  const score = momentRarityScore(moment)
  if (score >= LEGENDARY_THRESHOLD) return 'legendary'
  if (score >= RARE_THRESHOLD) return 'rare'
  return 'common'
}

export const MOMENT_RARITY_STYLE: Record<MomentRarity, { label: string; badge: string; accent: string; ring: string }> = {
  common: {
    label: 'Common',
    badge: 'bg-white/10 text-white/60',
    accent: '#ffffff',
    ring: 'border-white/10',
  },
  rare: {
    label: 'Rare',
    badge: 'bg-[#8fe3b0]/15 text-[#8fe3b0]',
    accent: '#8fe3b0',
    ring: 'border-[#8fe3b0] shadow-[0_0_24px_-6px_rgba(143,227,176,0.55)]',
  },
  legendary: {
    label: 'Legendary',
    badge: 'bg-[#ffd447]/15 text-[#ffd447]',
    accent: '#ffd447',
    ring: 'border-[#ffd447] shadow-[0_0_36px_-6px_rgba(255,212,71,0.6)]',
  },
}
