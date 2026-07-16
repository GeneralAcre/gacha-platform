import { forwardRef, useCallback, useId, useRef, useState } from 'react'
import type { MomentResult } from './momentsApi'

// Sports-card style: bold color-blocked panel (gold for a favorite flip, green
// for a swing), the swing magnitude as one big hero number, a clean name bar
// at the bottom. Deliberately minimal -- narrative/fixture-id/branding live in
// the click-through detail modal, not on the card face.
const FLIP_THEME = { from: '#5c3d0d', to: '#2e1e06', accent: '#ffd447' }
const SWING_THEME = { from: '#0d4d3a', to: '#082e23', accent: '#8fe3b0' }

export const MomentCardArt = forwardRef<SVGSVGElement, { moment: MomentResult; className?: string }>(
  function MomentCardArt({ moment, className = '' }, ref) {
    const uid = useId().replace(/:/g, '')
    const isFlip = moment.kind === 'flip'
    const theme = isFlip ? FLIP_THEME : SWING_THEME
    const isUp = moment.toProbability >= moment.fromProbability

    return (
      <svg
        ref={ref}
        viewBox="0 0 100 140"
        width={100}
        height={140}
        role="img"
        aria-label={`${moment.team} vs ${moment.opponent} moment card`}
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
          <rect x="6" y="6" width="30" height="10" rx="5" fill="#ffffff" />
          <text x="21" y="13.2" fill="#0a0a0a" fontSize="4.4" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {isFlip ? 'FLIP' : 'SWING'}
          </text>
          <text x="94" y="13" fill={theme.accent} fontSize="3.4" fontWeight="800" textAnchor="end" letterSpacing="0.4" fontFamily="Arial, sans-serif">
            SEALED
          </text>

          {/* hero number: the swing magnitude */}
          <text x="50" y="72" fill="#ffffff" fontSize="30" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {isUp ? '↑' : '↓'}{Math.abs(Math.round(moment.deltaProbability))}
          </text>
          <text x="50" y="86" fill={theme.accent} fontSize="4.2" fontWeight="800" textAnchor="middle" letterSpacing="0.6" fontFamily="Arial, sans-serif">
            POINT SWING{moment.matchMinute !== undefined ? ` · ${moment.matchMinute}'` : ''}
          </text>

          {/* name bar */}
          <rect x="0" y="104" width="100" height="36" fill="#00000045" />
          <text x="50" y="118" fill="#ffffff" fontSize="6.2" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">
            {moment.team}
          </text>
          <text x="50" y="127" fill={theme.accent} fontSize="4.6" fontWeight="700" textAnchor="middle" fontFamily="Arial, sans-serif">
            vs {moment.opponent}
          </text>
          <text x="50" y="135" fill="#ffffff70" fontSize="3.4" fontWeight="700" textAnchor="middle" fontFamily="Arial, sans-serif">
            {Math.round(moment.fromProbability)}% {'→'} {Math.round(moment.toProbability)}%
          </text>
        </g>
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
