import { useId } from 'react'
import { MOMENT_RARITY_STYLE, type MomentRarity } from '../worldcup/momentRarity'

// Same backdrop as a freshly-drawn Event Pack Moment (see worldcup/MomentCardArt.tsx) for
// visual consistency, but this renders from on-chain MomentRecord fields only -- no team
// names or narrative, since those live off-chain and a claimed/listed NFT should only ever
// show what the mint can actually prove.
const STADIUM_ART = '/worldcup-card/Event-card.png'
const MOMENT_RARITY_BY_BYTE: MomentRarity[] = ['common', 'rare', 'legendary']
const RARITY_BORDER_WIDTH = { common: 0.6, rare: 1.6, legendary: 2.6 }
const RARITY_BORDER_OPACITY = { common: 0.18, rare: 0.85, legendary: 1 }
const FLIP_THEME = { tint: '#4a0505', accent: '#ff5c5c' }
const SWING_THEME = { tint: '#4a3505', accent: '#ffd447' }

export function OwnedMomentArt({
  momentKind,
  rarity,
  deltaBps,
  fixtureId,
  className = '',
}: {
  momentKind: number
  rarity: number
  deltaBps: number
  fixtureId: number
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const isFlip = momentKind === 1
  const theme = isFlip ? FLIP_THEME : SWING_THEME
  const deltaPoints = deltaBps / 100
  const isUp = deltaPoints >= 0
  const rarityKey = MOMENT_RARITY_BY_BYTE[rarity] ?? 'common'
  const rarityStyle = MOMENT_RARITY_STYLE[rarityKey]

  return (
    <svg viewBox="0 0 100 140" width={100} height={140} role="img" aria-label={`Fixture #${fixtureId} moment card — ${rarityStyle.label}`} className={className}>
      <defs>
        <linearGradient id={`scrim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.55" />
          <stop offset="18%" stopColor="#000000" stopOpacity="0.05" />
          <stop offset="68%" stopColor="#000000" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
        </linearGradient>
        <clipPath id={`card-${uid}`}>
          <rect x="0" y="0" width="100" height="140" rx="7" />
        </clipPath>
      </defs>

      <g clipPath={`url(#card-${uid})`}>
        <image href={STADIUM_ART} x="0" y="0" width="100" height="140" preserveAspectRatio="xMidYMid slice" />
        <rect x="0" y="0" width="100" height="140" fill={theme.tint} opacity="0.38" />
        <rect x="0" y="0" width="100" height="140" fill={`url(#scrim-${uid})`} />

        <rect x="6" y="6" width="30" height="10" rx="5" fill="#ffffff" />
        <text x="21" y="13.2" fill="#0a0a0a" fontSize="4.4" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
          {isFlip ? 'FLIP' : 'SWING'}
        </text>
        <rect x="66" y="6" width="28" height="10" rx="5" fill="#00000090" />
        <text x="80" y="12.8" fill={rarityStyle.accent} fontSize="3.4" fontWeight="800" textAnchor="middle" letterSpacing="0.4" fontFamily="Arial, sans-serif">
          {rarityStyle.label.toUpperCase()}
        </text>

        <rect x="12" y="50" width="76" height="42" rx="6" fill="#000000" opacity="0.4" />
        <rect x="12" y="50" width="76" height="42" rx="6" fill="none" stroke={theme.accent} strokeOpacity="0.35" strokeWidth="0.6" />
        <text x="50" y="76" fill="#ffffff" fontSize="26" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
          {isUp ? '↑' : '↓'}{Math.abs(Math.round(deltaPoints))}
        </text>
        <text x="50" y="87" fill={theme.accent} fontSize="4" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
          POINT SWING
        </text>

        <rect x="0" y="108" width="100" height="32" fill="#000000a8" />
        <text x="50" y="127" fill="#ffffff" fontSize="6.2" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
          FIXTURE #{fixtureId}
        </text>
      </g>

      <rect
        x={RARITY_BORDER_WIDTH[rarityKey] / 2}
        y={RARITY_BORDER_WIDTH[rarityKey] / 2}
        width={100 - RARITY_BORDER_WIDTH[rarityKey]}
        height={140 - RARITY_BORDER_WIDTH[rarityKey]}
        rx="7"
        fill="none"
        stroke={rarityStyle.accent}
        strokeWidth={RARITY_BORDER_WIDTH[rarityKey]}
        strokeOpacity={RARITY_BORDER_OPACITY[rarityKey]}
      />
    </svg>
  )
}
