/** Pack choices and the draw experience each one opens. Every live pack pulls from the
 * same real (or auto-sealed-on-demand) Moment queue — same memo-tx pipeline, same
 * claim-as-NFT flow — just with its own card art. `showCollectionGrid` additionally shows
 * the full historical match archive below the draw panel (Match Pack only, for browsing
 * results — not part of the draw mechanic itself). */
export interface CompetitionInfo {
  id: string
  label: string
  live: boolean
  /** Real pack-art photo; falls back to a text treatment when unset (see CompetitionPackSelector.tsx). */
  art?: string
  sourceCompetition: string
  showCollectionGrid: boolean
}

export const COMPETITIONS: CompetitionInfo[] = [
  { id: 'event', label: 'Event Pack', live: true, art: '/worldcup-card/Event-Pull-card.png', sourceCompetition: 'World Cup', showCollectionGrid: false },
  { id: 'match', label: 'Match Pack', live: true, art: '/worldcup-card/Match-Pull-card.png', sourceCompetition: 'World Cup', showCollectionGrid: true },
  { id: 'player', label: 'Player Pack', live: false, sourceCompetition: 'World Cup', showCollectionGrid: false },
  { id: 'mixed', label: 'Mixed Pack', live: false, sourceCompetition: 'World Cup', showCollectionGrid: false },
]

export const DEFAULT_COMPETITION = 'event'
