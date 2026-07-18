import { useEffect, useState } from 'react'
import { fetchRecentMoments, type MomentResult } from './momentsApi'
import { momentRarity, type MomentRarity } from './momentRarity'
import { COMPETITIONS } from './competitions'

const RARITIES: MomentRarity[] = ['common', 'rare', 'legendary']

const RARITY_LABEL: Record<MomentRarity, string> = { common: 'Common', rare: 'Rare', legendary: 'Legendary' }
const RARITY_COLOR: Record<MomentRarity, string> = { common: '#c8c8d0', rare: '#8fe3b0', legendary: '#ffd447' }

function tally(moments: MomentResult[]): Record<MomentRarity, number> {
  const counts: Record<MomentRarity, number> = { common: 0, rare: 0, legendary: 0 }
  for (const m of moments) counts[momentRarity(m)]++
  return counts
}

/** Pull-odds disclosure for all 4 packs. Every live pack shares the same real (or
 * auto-sealed-on-demand) Moment queue, with rarity graded from how big the real odds swing
 * actually was (see momentRarity.ts) -- there's no fixed weighted-roll behind it, so instead
 * of inventing a percentage we show the real threshold rule plus the actual observed split
 * among recently sealed Moments, clearly labeled as observed-not-guaranteed. */
export function PackOddsPanel() {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<MomentResult[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    fetchRecentMoments(50)
      .catch(() => [])
      .then((moments) => {
        setRecent(moments)
        setLoaded(true)
      })
  }, [open, loaded])

  const counts = tally(recent)
  const total = recent.length

  return (
    <div className="mt-4 w-full rounded-2xl border border-paper/10 bg-void">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-paper"
      >
        <span>Pull odds — all 4 packs</span>
        <span className="text-paper/40">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-paper/10 p-4 sm:grid-cols-2">
          {COMPETITIONS.map((comp) => (
            <div key={comp.id} className="rounded-xl border border-paper/10 bg-paper/[0.03] p-3">
              <p className="text-xs font-black uppercase tracking-widest text-paper">{comp.label}</p>

              {!comp.live ? (
                <p className="mt-2 text-[11px] text-paper/40">Not live yet — odds will be published at launch.</p>
              ) : (
                <>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-paper/40">How rarity is decided</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] leading-5 text-paper/60">
                    <li>Common — under 30pt swing (under 15pt on a favorite flip)</li>
                    <li>Rare — 30pt+ swing (15pt+ on a flip)</li>
                    <li>Legendary — 55pt+ swing (40pt+ on a flip)</li>
                  </ul>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-paper/40">
                    Observed in the last {loaded ? total : '…'} sealed Moment{total === 1 ? '' : 's'}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {RARITIES.map((r) => (
                      <span key={r} className="text-[11px] font-bold" style={{ color: RARITY_COLOR[r] }}>
                        {RARITY_LABEL[r]} {loaded && total > 0 ? Math.round((counts[r] / total) * 100) : 0}%
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
