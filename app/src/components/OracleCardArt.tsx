import type { Category } from './categories'
import type { Rarity } from './cardRegistry'

const PALETTE: Record<Category, { glow: string; line: string; mark: string }> = {
  life: { glow: '#fcd34d', line: '#fef3c7', mark: 'M50 20v60M20 50h60M29 29l42 42M71 29L29 71' },
  crypto: { glow: '#6ee7b7', line: '#d1fae5', mark: 'M25 66l18-20 13 10 20-28M24 73h52M30 27v46M50 18v55M70 34v39' },
  relationship: { glow: '#fda4af', line: '#ffe4e6', mark: 'M50 73C23 56 27 31 41 31c6 0 9 4 9 8 0-4 3-8 9-8 14 0 18 25-9 42Z' },
}

export function OracleCardArt({ category, rarity, className = '' }: { category: Category; rarity: Rarity; className?: string }) {
  const palette = PALETTE[category]
  const stars = rarity === 'grand' ? 12 : rarity === 'major' ? 8 : 4
  return (
    <svg viewBox="0 0 100 140" role="img" aria-label={`${category} ${rarity} oracle card`} className={className}>
      <rect x="3" y="3" width="94" height="134" fill="#201839" stroke={palette.line} strokeWidth="3" />
      <rect x="9" y="9" width="82" height="122" fill="none" stroke={palette.glow} strokeWidth={rarity === 'grand' ? '2' : '1'} />
      {Array.from({ length: stars }, (_, index) => {
        const angle = (Math.PI * 2 * index) / stars
        const x = 50 + Math.cos(angle) * 33
        const y = 70 + Math.sin(angle) * 48
        return <circle key={index} cx={x} cy={y} r={rarity === 'grand' ? 1.8 : 1.2} fill={palette.glow} />
      })}
      <circle cx="50" cy="70" r={rarity === 'grand' ? 25 : rarity === 'major' ? 22 : 19} fill="none" stroke={palette.glow} strokeWidth="2" />
      <path d={palette.mark} fill="none" stroke={palette.line} strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" />
      <text x="50" y="120" fill={palette.glow} fontSize="7" fontWeight="900" textAnchor="middle">OBSESSION</text>
    </svg>
  )
}
