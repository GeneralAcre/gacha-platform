import { useState, type FormEvent } from 'react'
import { addMatchEvent, removeMatchEvent } from './adminApi'
import type { AdminMatchView, MatchEventType } from './types'

const EVENT_LABEL: Record<MatchEventType, string> = { GOAL: 'Goal', YELLOW_CARD: 'Yellow Card', RED_CARD: 'Red Card' }
const EVENT_ICON: Record<MatchEventType, string> = { GOAL: '⚽', YELLOW_CARD: '🟨', RED_CARD: '🟥' }

/** Admin-reported goal/card timeline for a live match. Deliberately separate from the
 * TxLINE-sourced win probability shown above it in MatchForm — this is attested by
 * whoever's signed in as admin, not verified against any odds feed, and each entry gets
 * its own devnet memo seal so "who reported what, when" is independently checkable. */
export function EventPack({ match, onChange }: { match: AdminMatchView; onChange: (updated: AdminMatchView) => void }) {
  const [type, setType] = useState<MatchEventType>('GOAL')
  const [minute, setMinute] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [side, setSide] = useState<'teamA' | 'teamB'>('teamA')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...match.events].sort((a, b) => a.minute - b.minute || a.sortOrder - b.sortOrder)

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const updated = await addMatchEvent(match.id, { type, minute: Number(minute), playerName, side })
      onChange(updated)
      setMinute('')
      setPlayerName('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    setError(null)
    try {
      const updated = await removeMatchEvent(match.id, eventId)
      onChange(updated)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="mt-4 border-[3px] border-ink p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest">
          Reported Events <span className="normal-case text-ink/40">(admin-reported, not TxLINE)</span>
        </p>
        {match.reportedScore && (
          <span className="border-[2px] border-ink px-2 py-0.5 text-[10px] font-black uppercase">
            Reported {match.reportedScore.teamA}–{match.reportedScore.teamB}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="mb-3 text-[11px] text-ink/40">No events reported yet.</p>
      ) : (
        <div className="mb-3 flex flex-col gap-1">
          {sorted.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between border-b-2 border-ink/15 py-1.5 text-xs">
              <span className="font-bold">
                {EVENT_ICON[ev.type]} {ev.minute}&apos; {ev.playerName}{' '}
                <span className="text-ink/40">({ev.side === 'teamA' ? match.teamA : match.teamB})</span>
              </span>
              <div className="flex items-center gap-2">
                {ev.sealedSignature && (
                  <a
                    href={`https://explorer.solana.com/tx/${ev.sealedSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9px] font-black uppercase text-ink/50 underline decoration-2 underline-offset-2"
                  >
                    Sealed
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(ev.id)}
                  className="border-[2px] border-ink bg-white px-2 py-0.5 text-[9px] font-black uppercase text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-5 gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MatchEventType)}
          className="col-span-1 border-[2px] border-ink px-1 py-1.5 text-[10px] font-bold"
        >
          {(Object.keys(EVENT_LABEL) as MatchEventType[]).map((t) => (
            <option key={t} value={t}>{EVENT_LABEL[t]}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={130}
          required
          placeholder="Min"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className="col-span-1 border-[2px] border-ink px-1 py-1.5 text-[10px] font-bold"
        />
        <input
          required
          placeholder="Player"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="col-span-2 border-[2px] border-ink px-1 py-1.5 text-[10px] font-bold"
        />
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as 'teamA' | 'teamB')}
          className="col-span-1 border-[2px] border-ink px-1 py-1.5 text-[10px] font-bold"
        >
          <option value="teamA">{match.teamA}</option>
          <option value="teamB">{match.teamB}</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="col-span-5 mt-1 border-[2px] border-ink bg-[color:var(--admin-neon)] px-2 py-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
        >
          {submitting ? 'Sealing on-chain...' : '+ Add Event'}
        </button>
      </form>
      {error && <p className="mt-2 border-[2px] border-red-600 bg-red-50 p-1.5 text-[10px] font-bold text-red-600">{error}</p>}
    </div>
  )
}
