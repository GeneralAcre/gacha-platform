// Client for the hackathon-scope Moments API (backend/src/server.ts). No auth,
// no pagination beyond a simple `n` count — matches the server's in-memory-only scope.

export interface MomentResult {
  fixtureId: number
  competition: string
  team: string
  opponent: string
  fromProbability: number
  toProbability: number
  deltaProbability: number
  matchMinute?: number
  timestamp: number
  kind: 'swing' | 'flip'
  narrative: string
  /** Whether the fixture had actually kicked off when this swing happened -- odds move
   * pre-match too (team news, lineups), so a card-type title is only shown once true. */
  matchStarted: boolean
  signature: string
  /** Admin-curated if set, else a generated placeholder — see backend/src/matchImages.ts. */
  imageUrl?: string
  /** Set only when this card came from an admin-reported real match event
   * (backend/src/matchEventMoments.ts) rather than the algorithmic swing detector --
   * TxLINE's odds feed has no goal/card data of its own, so this is the one case where
   * the card's "why" is a real, human-attested event instead of a swing/flip guess. */
  triggerEvent?: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD'
  /** "swing"/"event" are both real, TxLINE-backed; "synthetic" is the fabricated demo
   * fallback used when nothing real is queued (see backend/src/synthetic.ts). */
  source: 'swing' | 'event' | 'synthetic'
}

/** Real (TxLINE-backed, whether algorithmically swing-detected or admin-event-triggered)
 * vs. synthetic (fabricated demo fallback) -- the one distinction players actually care
 * about, so card badges collapse the three backend `source` values down to this. */
export function isRealMoment(moment: MomentResult): boolean {
  return moment.source !== 'synthetic'
}

export interface FixtureSummary {
  fixtureId: number
  competition: string
  participant1: string
  participant2: string
  startTimeMs: number
  status: 'upcoming' | 'live' | 'past'
  winProbability?: { participant1: number; participant2: number }
}

export interface CollectionEntry {
  id: string
  kind: 'result' | 'live'
  round: string
  team1: string
  team2: string
  dateMs: number
  // "result": a verified historical match, no on-chain data
  score1?: number
  score2?: number
  penalties?: { team1: number; team2: number }
  wentToExtraTime?: boolean
  venue?: string
  city?: string
  // "live": a fixture TxLINE is currently tracking, eligible for real Sealed Moments
  fixtureId?: number
  status?: 'upcoming' | 'live' | 'past'
  winProbability?: { participant1: number; participant2: number }
  /** Admin-curated if set, else a generated placeholder — see backend/src/matchImages.ts. */
  imageUrl?: string
}

const API_BASE = (import.meta.env.VITE_MOMENTS_API_URL as string | undefined) ?? 'http://localhost:8787'

async function parseOrThrow(res: Response): Promise<any> {
  if (!res.ok) throw new Error(`Moments API error: HTTP ${res.status}`)
  return res.json()
}

export async function fetchRecentMoments(limit = 20): Promise<MomentResult[]> {
  const res = await fetch(`${API_BASE}/moments/recent?n=${limit}`)
  return parseOrThrow(res)
}

/** Every fixture TxLINE's tier has ever returned (past, live, and upcoming), with the latest win-probability snapshot where published. */
export async function fetchFixtures(): Promise<FixtureSummary[]> {
  const res = await fetch(`${API_BASE}/fixtures`)
  return parseOrThrow(res)
}

/** The full World Cup 2026 knockout-stage collection: verified historical results merged with whatever TxLINE is tracking live. */
export async function fetchCollection(): Promise<CollectionEntry[]> {
  const res = await fetch(`${API_BASE}/collection`)
  return parseOrThrow(res)
}

/** Triggers the backend's synthetic swing-detector sequence on demand. Dev/demo only. */
export async function triggerSimulatedMoments(): Promise<MomentResult[]> {
  const res = await fetch(`${API_BASE}/moments/simulate`, { method: 'POST' })
  return parseOrThrow(res)
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

/** Stable per-render key for a Moment — the memo signature is unique per confirmed tx. */
export function momentKey(moment: MomentResult): string {
  return moment.signature
}
