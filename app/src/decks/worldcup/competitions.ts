/** Pack choices and the draw experience each one opens. Every live pack pulls from the
 * same real (or auto-sealed-on-demand) Moment queue — same memo-tx pipeline, same
 * claim-as-NFT flow — just with its own card art. The full historical match archive lives
 * on its own Collection page (see CollectionScreen.tsx), not on the draw panel itself. */
export interface CompetitionInfo {
  id: string
  label: string
  live: boolean
  /** Real pack-art photo; falls back to a text treatment when unset (see CompetitionPackSelector.tsx). */
  art?: string
  sourceCompetition: string
}

export const COMPETITIONS: CompetitionInfo[] = [
  { id: 'event', label: 'Event Pack', live: true, art: '/worldcup-card/Event-Pull-card.png', sourceCompetition: 'World Cup' },
  { id: 'match', label: 'Match Pack', live: true, art: '/worldcup-card/Match-Pull-card.png', sourceCompetition: 'World Cup' },
  { id: 'player', label: 'Player Pack', live: false, art: '/worldcup-card/Player-Pull-card.png', sourceCompetition: 'World Cup' },
  { id: 'mixed', label: 'Mixed Pack', live: false, sourceCompetition: 'World Cup' },
]

export const DEFAULT_COMPETITION = 'event'
