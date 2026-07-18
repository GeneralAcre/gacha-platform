import { forwardRef, useId } from 'react'
import type { CollectionEntry } from './momentsApi'

// Match-Pull-card.png is the pack-selector cover photo (see competitions.ts); the drawn
// card itself uses Match-card.png as its backdrop, with the real match data written on
// top of it, matching MomentCardArt.tsx's "Event Pack" drawn-card art.
const MATCH_ART = '/worldcup-card/Match-card.png'

// Round accent still varies the chip/text color for a bit of visual range across rounds,
// even though the backdrop photo itself is now the same for every card.
const ROUND_ACCENT: Record<string, string> = {
  'Round of 32': '#8fe3b0',
  'Round of 16': '#7ec8ff',
  Quarterfinal: '#c9a8ff',
  Semifinal: '#ff9ab5',
  'Third Place': '#ffcb7a',
  Final: '#ffd447',
  'World Cup': '#8fe3b0',
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
    const accent = ROUND_ACCENT[entry.round] ?? ROUND_ACCENT['World Cup']
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
          <image href={MATCH_ART} x="0" y="0" width="100" height="140" preserveAspectRatio="xMidYMid slice" />
          {/* Scrim: darkens top (badges) and bottom (name bar) so text reads over the photo. */}
          <rect x="0" y="0" width="100" height="140" fill={`url(#scrim-${uid})`} />

          {/* top chip: filled with the round's accent color so rounds read apart at a glance */}
          <rect x="6" y="6" width="24" height="10" rx="5" fill={accent} />
          <text x="18" y="13.2" fill="#0a0a0a" fontSize="4.4" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {chipLabel}
          </text>
          {!isResult && (
            <>
              <rect x="66" y="6" width="28" height="10" rx="5" fill="#00000090" />
              <text x="80" y="12.8" fill={accent} fontSize="3.4" fontWeight="800" textAnchor="middle" letterSpacing="0.4" fontFamily="Arial, sans-serif">
                {(entry.status ?? 'live').toUpperCase()}
              </text>
            </>
          )}

          {/* hero number, in a glass panel for guaranteed contrast over the photo */}
          <rect x="12" y="50" width="76" height="42" rx="6" fill="#000000" opacity="0.4" />
          <rect x="12" y="50" width="76" height="42" rx="6" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="0.6" />
          {isResult ? (
            <>
              <text x="50" y="74" fill="#ffffff" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
                {entry.score1}{'–'}{entry.score2}
              </text>
              <text x="50" y="87" fill={accent} fontSize="4" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
                {entry.penalties ? `PENS ${entry.penalties.team1}-${entry.penalties.team2}` : entry.wentToExtraTime ? 'AFTER EXTRA TIME' : 'FULL TIME'}
              </text>
            </>
          ) : wp ? (
            <>
              <text x="50" y="74" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
                {Math.round(wp.participant1)}{'–'}{Math.round(wp.participant2)}
              </text>
              <text x="50" y="87" fill={accent} fontSize="4" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
                WIN PROBABILITY %
              </text>
            </>
          ) : (
            <>
              <text x="50" y="74" fill="#ffffff60" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
                VS
              </text>
              <text x="50" y="87" fill={accent} fontSize="4" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
                ODDS PENDING
              </text>
            </>
          )}

          {/* name bar: both teams on one row, one color -- avoids the mismatched two-tone/two-line look */}
          <rect x="0" y="108" width="100" height="32" fill="#000000a8" />
          <text x="50" y="127" fill="#ffffff" fontSize="5.6" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {entry.team1} vs {entry.team2}
          </text>
        </g>
      </svg>
    )
  }
)
