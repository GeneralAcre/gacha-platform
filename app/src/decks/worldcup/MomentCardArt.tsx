import { forwardRef, useCallback, useId, useRef, useState } from 'react'
import type { MomentResult } from './momentsApi'
import { momentRarity, MOMENT_RARITY_STYLE } from './momentRarity'

// Sports-card style: a real stadium photo as the backing art (gold tint for a favorite
// flip, green for a swing), the swing magnitude as one big hero number in a translucent
// "glass" panel so it stays readable over the photo, a clean name bar at the bottom.
// Deliberately minimal -- narrative/fixture-id/from-to percentages live in the
// click-through detail modal, not on the card face (see MomentDetailModal.tsx).
// A flip (crosses 50%, favorite changes) reads as the bigger, more disruptive event --
// a red card. A swing that doesn't flip the favorite is the smaller caution -- a yellow
// card. Same soccer-card colors carry through the tint, hero panel, and card title below.
const FLIP_THEME = { tint: '#4a0505', accent: '#ff5c5c' }
const SWING_THEME = { tint: '#4a3505', accent: '#ffd447' }
// Event-Pull-card.png is the pack-selector cover photo (see competitions.ts); the drawn
// card itself uses Event-card.png as its backdrop, with the real swing data written on
// top of it, matching CollectionCardArt.tsx's "Match Pack" drawn-card art.
const STADIUM_ART = '/worldcup-card/Event-card.png'

// Rarity is graded from the swing itself (see momentRarity.ts), not the flip/swing kind --
// the outer border weight is how "big a pull" this was, independent of what type it is.
const RARITY_BORDER_WIDTH = { common: 0.6, rare: 1.6, legendary: 2.6 }
const RARITY_BORDER_OPACITY = { common: 0.18, rare: 0.85, legendary: 1 }

export const TRIGGER_EVENT_LABEL: Record<'GOAL' | 'YELLOW_CARD' | 'RED_CARD', string> = {
  GOAL: 'GOAL',
  YELLOW_CARD: 'YELLOW CARD',
  RED_CARD: 'RED CARD',
}

/** The name-bar title: a real admin-reported event (goal/card) always wins when present --
 * see backend/src/matchEventMoments.ts -- since that's an actual attested fact, not a
 * guess. Every other Moment falls back to the flip/swing heuristic this card always used:
 * a flip (favorite changes) reads as the bigger, more disruptive event (red card); a
 * swing that doesn't flip the favorite is the smaller caution (yellow card). */
function titleFor(moment: MomentResult, isFlip: boolean): string {
  if (moment.triggerEvent) return TRIGGER_EVENT_LABEL[moment.triggerEvent]
  if (!moment.matchStarted) return isFlip ? 'FLIP' : 'SWING'
  return isFlip ? 'RED CARD' : 'YELLOW CARD'
}

export const MomentCardArt = forwardRef<SVGSVGElement, { moment: MomentResult; className?: string }>(
  function MomentCardArt({ moment, className = '' }, ref) {
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
          {/* Theme tint identifies flip vs swing at a glance without hiding the photo. */}
          <rect x="0" y="0" width="100" height="140" fill={theme.tint} opacity="0.38" />
          {/* Scrim: darkens top (badges) and bottom (name bar) so text reads over any photo. */}
          <rect x="0" y="0" width="100" height="140" fill={`url(#scrim-${uid})`} />

          {/* top chip */}
          <rect x="6" y="6" width="30" height="10" rx="5" fill="#ffffff" />
          <text x="21" y="13.2" fill="#0a0a0a" fontSize="4.4" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {isFlip ? 'FLIP' : 'SWING'}
          </text>
          <rect x="66" y="6" width="28" height="10" rx="5" fill="#00000090" />
          <text x="80" y="12.8" fill={rarityStyle.accent} fontSize="3.4" fontWeight="800" textAnchor="middle" letterSpacing="0.4" fontFamily="Arial, sans-serif">
            {rarityStyle.label.toUpperCase()}
          </text>

          {/* hero number: the swing magnitude, in a glass panel for guaranteed contrast */}
          <rect x="12" y="50" width="76" height="42" rx="6" fill="#000000" opacity="0.4" />
          <rect x="12" y="50" width="76" height="42" rx="6" fill="none" stroke={theme.accent} strokeOpacity="0.35" strokeWidth="0.6" />
          <text x="50" y="76" fill="#ffffff" fontSize="26" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {isUp ? '↑' : '↓'}{Math.abs(Math.round(moment.deltaProbability))}
          </text>
          <text x="50" y="87" fill={theme.accent} fontSize="4" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
            POINT SWING{moment.matchMinute !== undefined ? ` · ${moment.matchMinute}'` : ''}
          </text>

          {/* name bar: card-type title (why the chance dropped), match name underneath.
              A red/yellow card can only have happened once the match actually kicked off --
              odds move pre-match too (team news, lineups), so before kickoff this only
              shows the stat itself, never a fabricated in-match event. */}
          <rect x="0" y="108" width="100" height="32" fill="#000000a8" />
          <text x="50" y="122" fill={theme.accent} fontSize="6.4" fontWeight="900" textAnchor="middle" letterSpacing="0.4" fontFamily="Arial, sans-serif">
            {titleFor(moment, isFlip)}
          </text>
          <text x="50" y="133" fill="#ffffff" fontSize="4.6" fontWeight="700" textAnchor="middle" fontFamily="Arial, sans-serif">
            {moment.team} vs {moment.opponent}
          </text>
        </g>

        {/* Rarity-graded border: bigger swings and flips get a bolder, brighter frame. */}
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

/** Rasterizes an inline SVG element to a PNG and triggers a browser download. */
async function downloadSvgAsPng(svgEl: SVGSVGElement, filename: string, scale = 4): Promise<void> {
  const svgString = new XMLSerializer().serializeToString(svgEl)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to rasterize card art'))
      img.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = 100 * scale
    canvas.height = 140 * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not supported in this browser')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) throw new Error('Could not encode PNG')

    const pngUrl = URL.createObjectURL(pngBlob)
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(pngUrl)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

/**
 * Ref + download handler for a Moment's card art, kept separate from any
 * particular layout so the SVG (often placed inside a height-constrained
 * flip-animation box) and the action buttons (which need their own natural
 * height) can be positioned independently by the caller.
 */
export function useMomentCardDownload(moment: MomentResult) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    if (!svgRef.current) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadSvgAsPng(svgRef.current, `moment-${moment.team.toLowerCase()}-${moment.timestamp}.png`)
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }, [moment])

  return { svgRef, downloading, downloadError, handleDownload }
}

/** Share-to-X / Download-PNG action row. Renders on its own -- no fixed height, so it's safe next to a height-constrained card art box. */
export function MomentShareButtons({
  moment,
  downloading,
  downloadError,
  onDownload,
  className = '',
}: {
  moment: MomentResult
  downloading: boolean
  downloadError: string | null
  onDownload: () => void
  className?: string
}) {
  const shareText = `${moment.narrative} ⚡ Sealed on Solana devnet via TxLINE.`
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}${
    shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ''
  }`

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <a
        href={tweetUrl}
        target="_blank"
        rel="noreferrer"
        className="w-full rounded-full bg-white px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-flare hover:text-white"
      >
        Share to X
      </a>
      <button
        onClick={onDownload}
        disabled={downloading}
        className="w-full rounded-full border border-white/15 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 transition-colors hover:border-white hover:text-white disabled:opacity-50"
      >
        {downloading ? 'Rendering...' : 'Download PNG'}
      </button>
      {downloadError && <p className="text-[11px] font-bold text-red-400">{downloadError}</p>}
    </div>
  )
}
