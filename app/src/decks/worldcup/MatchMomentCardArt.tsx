import { forwardRef, useId } from 'react'
import type { MomentResult } from './momentsApi'
import { momentRarity, MOMENT_RARITY_STYLE } from './momentRarity'

// Match Pack's card face for a real (or auto-sealed) Moment — same layout and forwardRef
// signature as MomentCardArt.tsx (Event Pack), swappable by the pull screen based on which
// pack is selected, but with the Match-card.png backdrop and a plain team-name title
// instead of the RED CARD/YELLOW CARD framing, which only makes sense against Event Pack's
// VAR-referee art.
const FLIP_THEME = { tint: '#4a2f05', accent: '#ffd447' }
const SWING_THEME = { tint: '#06331f', accent: '#8fe3b0' }
const STADIUM_ART = '/worldcup-card/Match-card.png'

const RARITY_BORDER_WIDTH = { common: 0.6, rare: 1.6, legendary: 2.6 }
const RARITY_BORDER_OPACITY = { common: 0.18, rare: 0.85, legendary: 1 }

export const MatchMomentCardArt = forwardRef<SVGSVGElement, { moment: MomentResult; className?: string }>(
  function MatchMomentCardArt({ moment, className = '' }, ref) {
    const uid = useId().replace(/:/g, '')
    const isFlip = moment.kind === 'flip'
    const theme = isFlip ? FLIP_THEME : SWING_THEME
    const isUp = moment.toProbability >= moment.fromProbability
    const rarity = momentRarity(moment)
    const rarityStyle = MOMENT_RARITY_STYLE[rarity]

    return (
      <svg
        ref={ref}
        viewBox="0 0 100 140"
        width={100}
        height={140}
        role="img"
        aria-label={`${moment.team} vs ${moment.opponent} moment card — ${rarityStyle.label}`}
        className={className}
      >
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
            {isUp ? '↑' : '↓'}{Math.abs(Math.round(moment.deltaProbability))}
          </text>
          <text x="50" y="87" fill={theme.accent} fontSize="4" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
            POINT SWING{moment.matchMinute !== undefined ? ` · ${moment.matchMinute}'` : ''}
          </text>

          {/* name bar: team names on one row, one color -- consistent with CollectionCardArt */}
          <rect x="0" y="108" width="100" height="32" fill="#000000a8" />
          <text x="50" y="127" fill="#ffffff" fontSize="5.6" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {moment.team} vs {moment.opponent}
          </text>
        </g>

        <rect
          x={RARITY_BORDER_WIDTH[rarity] / 2}
          y={RARITY_BORDER_WIDTH[rarity] / 2}
          width={100 - RARITY_BORDER_WIDTH[rarity]}
          height={140 - RARITY_BORDER_WIDTH[rarity]}
          rx="7"
          fill="none"
          stroke={rarityStyle.accent}
          strokeWidth={RARITY_BORDER_WIDTH[rarity]}
          strokeOpacity={RARITY_BORDER_OPACITY[rarity]}
        />
      </svg>
    )
  }
)
