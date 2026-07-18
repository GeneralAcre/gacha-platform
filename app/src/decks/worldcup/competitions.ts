/** Pack choices and the draw experience each one opens. */
export interface CompetitionInfo {
  id: string
  label: string
  live: boolean
  /** Real pack-art photo; falls back to a text treatment when unset (see CompetitionPackSelector.tsx). */
  art?: string
  sourceCompetition: string
  view: 'live' | 'matches'
}

export const COMPETITIONS: CompetitionInfo[] = [
  { id: 'event', label: 'Event Pack', live: true, art: '/worldcup-card/Event-Pull-card.png', sourceCompetition: 'World Cup', view: 'live' },
  { id: 'match', label: 'Match Pack', live: true, art: '/worldcup-card/Match-Pull-card.png', sourceCompetition: 'World Cup', view: 'matches' },
  { id: 'player', label: 'Player Pack', live: false, sourceCompetition: 'World Cup', view: 'live' },
  { id: 'mixed', label: 'Mixed Pack', live: false, sourceCompetition: 'World Cup', view: 'live' },
]

export const DEFAULT_COMPETITION = 'event'
