import { matchImageUrl } from './adminApi'
import type { AdminMatchView } from './types'

const STATUS_STYLE: Record<AdminMatchView['status'], string> = {
  scheduled: 'bg-white text-ink',
  live: 'bg-[color:var(--admin-neon)] text-ink',
  finished: 'bg-ink text-white',
}

const COLUMNS = ['', 'Kickoff', 'Round', 'Match', 'Score', 'Status', 'Win Prob.', 'Stadium', 'Sealed', '']

export function MatchTable({ matches, onEdit }: { matches: AdminMatchView[]; onEdit: (match: AdminMatchView) => void }) {
  return (
    <div className="overflow-x-auto border-[3px] border-ink bg-white">
      <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b-[3px] border-ink bg-ink text-white">
            {COLUMNS.map((h, i) => (
              <th key={i} className="px-3 py-2 font-black uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id} className="border-b border-ink/20 hover:bg-canvas">
              <td className="px-3 py-2">
                <img src={matchImageUrl(m.imageUrl)} alt="" className="h-8 w-14 border-[2px] border-ink object-cover" />
              </td>
              <td className="px-3 py-2 font-bold tabular-nums">{m.dateMs ? new Date(m.dateMs).toLocaleDateString() : '—'}</td>
              <td className="px-3 py-2 uppercase text-ink/70">{m.round}</td>
              <td className="px-3 py-2 font-black">{m.teamA} vs {m.teamB}</td>
              <td className="px-3 py-2 font-black tabular-nums">{m.score ? `${m.score.teamA}–${m.score.teamB}` : '—'}</td>
              <td className="px-3 py-2">
                <span className={`border-[2px] border-ink px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[m.status]}`}>
                  {m.status}
                </span>
              </td>
              <td className="px-3 py-2 tabular-nums text-ink/70">
                {m.winProbability ? `${Math.round(m.winProbability.teamA)}/${Math.round(m.winProbability.teamB)}` : '—'}
              </td>
              <td className="px-3 py-2 text-ink/70">{m.stadium ?? <span className="text-ink/30">Not set</span>}</td>
              <td className="px-3 py-2">
                {m.sealedSignature ? (
                  <a
                    href={`https://explorer.solana.com/tx/${m.sealedSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-[10px] uppercase tracking-wider text-ink underline decoration-2 underline-offset-2"
                  >
                    ✓ Sealed
                  </a>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-ink/30">Unsealed</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onEdit(m)} className="border-[2px] border-ink px-2 py-1 text-[10px] font-black uppercase hover:bg-canvas">
                  Curate
                </button>
              </td>
            </tr>
          ))}
          {matches.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-ink/40">No matches yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
