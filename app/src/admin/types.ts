export type MatchSource = 'result' | 'live'
export type MatchStatus = 'scheduled' | 'live' | 'finished'
export type MatchEventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD'

/** Admin-reported goal/card — NOT the TxLINE-sourced score. See AdminMatchView.reportedScore. */
export interface MatchEvent {
  id: string
  type: MatchEventType
  minute: number
  playerName: string
  side: 'teamA' | 'teamB'
  sortOrder: number
  createdAt: number
  createdBy: string
  sealedSignature: string | null
  sealedAt: number | null
}

/** Mirrors backend/src/adminMatches.ts's AdminMatchView exactly. Score, status, and
 * winProbability are always TxLINE/verified-result-sourced — there is no draft/editable
 * counterpart for any of them; only stadium/city/imageUrl/events are admin-curated. */
export interface AdminMatchView {
  id: string
  source: MatchSource
  round: string
  teamA: string
  teamB: string
  dateMs: number
  status: MatchStatus
  score: { teamA: number; teamB: number } | null
  winProbability: { teamA: number; teamB: number } | null
  stadium: string | null
  city: string | null
  imageUrl: string
  imageIsCustom: boolean
  sealedSignature: string | null
  sealedAt: number | null
  updatedAt: number | null
  events: MatchEvent[]
  /** Tally of admin-reported GOAL events by side — deliberately distinct from `score`. */
  reportedScore: { teamA: number; teamB: number } | null
}

/** What PUT /admin/matches/:id accepts — deliberately just the three curated fields. */
export interface MatchMetadataPatch {
  stadium?: string
  city?: string
  imageUrl?: string
}

export interface MatchEventInput {
  type: MatchEventType
  minute: number
  playerName: string
  side: 'teamA' | 'teamB'
}
