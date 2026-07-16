import { forwardRef, useId } from 'react'
import type { CollectionEntry } from './momentsApi'

// Sports-card style: bold color-blocked panel (varies by round, like a rating
// tier), one big hero number, a clean name bar at the bottom. Deliberately
// minimal -- venue/date/extra detail lives in the click-through detail modal,
// not on the card face.
const ROUND_THEME: Record<string, { from: string; to: string; accent: string }> = {
  'Round of 32': { from: '#0d4d3a', to: '#082e23', accent: '#8fe3b0' },
  'Round of 16': { from: '#0d3d5c', to: '#082438', accent: '#7ec8ff' },
  Quarterfinal: { from: '#3d1f6b', to: '#251142', accent: '#c9a8ff' },
  Semifinal: { from: '#6b1f3d', to: '#421125', accent: '#ff9ab5' },
  'Third Place': { from: '#6b4a1f', to: '#422d11', accent: '#ffcb7a' },
  Final: { from: '#3d3115', to: '#161206', accent: '#ffd447' },
  'World Cup': { from: '#0d4d3a', to: '#082e23', accent: '#8fe3b0' },
}

const ROUND_ABBR: Record<string, string> = {
  'Round of 32': 'R32',
  'Round of 16': 'R16',
  Quarterfinal: 'QF',
  Semifinal: 'SF',
  'Third Place': '3RD',
  Final: 'FINAL',
  'World Cup': 'WC',
}

export const CollectionCardArt = forwardRef<SVGSVGElement, { entry: CollectionEntry; className?: string }>(
  function CollectionCardArt({ entry, className = '' }, ref) {
    const uid = useId().replace(/:/g, '')
    const isResult = entry.kind === 'result'
    const theme = ROUND_THEME[entry.round] ?? ROUND_THEME['World Cup']
    const chipLabel = ROUND_ABBR[entry.round] ?? entry.round.slice(0, 4).toUpperCase()
    const wp = entry.winProbability

    return (
      <svg
        ref={ref}
        viewBox="0 0 100 140"
        width={100}
        height={140}
        role="img"
        aria-label={`${entry.team1} vs ${entry.team2} — ${entry.round}`}
        className={className}
      >
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={theme.from} />
            <stop offset="100%" stopColor={theme.to} />
          </linearGradient>
          <clipPath id={`card-${uid}`}>
            <rect x="0" y="0" width="100" height="140" rx="7" />
          </clipPath>
        </defs>

        <g clipPath={`url(#card-${uid})`}>
          <rect x="0" y="0" width="100" height="140" fill={`url(#bg-${uid})`} />

          {/* top chip */}
          <rect x="6" y="6" width="24" height="10" rx="5" fill="#ffffff" />
          <text x="18" y="13.2" fill="#0a0a0a" fontSize="4.4" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {chipLabel}
          </text>
          {!isResult && (
            <text x="94" y="13" fill={theme.accent} fontSize="3.4" fontWeight="800" textAnchor="end" letterSpacing="0.4" fontFamily="Arial, sans-serif">
              {(entry.status ?? 'live').toUpperCase()}
            </text>
          )}

          {/* hero number */}
          {isResult ? (
            <>
              <text x="50" y="72" fill="#ffffff" fontSize="26" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
                {entry.score1}{'–'}{entry.score2}
              </text>
              <text x="50" y="86" fill={theme.accent} fontSize="4.2" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
                {entry.penalties ? `PENS ${entry.penalties.team1}-${entry.penalties.team2}` : entry.wentToExtraTime ? 'AFTER EXTRA TIME' : 'FULL TIME'}
              </text>
            </>
          ) : wp ? (
            <>
              <text x="50" y="70" fill="#ffffff" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
                {Math.round(wp.participant1)}{'–'}{Math.round(wp.participant2)}
              </text>
              <text x="50" y="86" fill={theme.accent} fontSize="4.2" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
                WIN PROBABILITY %
              </text>
            </>
          ) : (
            <>
              <text x="50" y="72" fill="#ffffff30" fontSize="24" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
                VS
              </text>
              <text x="50" y="86" fill={theme.accent} fontSize="4.2" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
                ODDS PENDING
              </text>
            </>
          )}

          {/* name bar */}
          <rect x="0" y="104" width="100" height="36" fill="#00000045" />
          <text x="50" y="120" fill="#ffffff" fontSize="6.2" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {entry.team1}
          </text>
          <text x="50" y="129" fill={theme.accent} fontSize="4.6" fontWeight="700" textAnchor="middle" fontFamily="Arial, sans-serif">
            vs {entry.team2}
          </text>
          <text x="50" y="136.5" fill="#ffffff70" fontSize="3" fontWeight="700" textAnchor="middle" letterSpacing="0.8" fontFamily="Arial, sans-serif">
            WORLD CUP 2026
          </text>
        </g>
      </svg>
    )
  }
)
