import { useEffect, useMemo, useState } from 'react'
import { fetchCollection, type CollectionEntry, type MomentResult } from './momentsApi'
import { CollectionDetailModal } from './CollectionDetailModal'
import { ROUND_ORDER, CollectionTile } from './collectionShared'

const COLLECTION_POLL_INTERVAL_MS = 15000

/** Read-only archive of every World Cup 2026 knockout match, shown below the Match Pack
 * draw panel for browsing — drawing itself happens through the same real/auto-sealed
 * Moment queue as every other pack (see WorldCupPullScreen.tsx), not from this archive. */
export function MatchCollection({ recentMoments }: { recentMoments: MomentResult[] }) {
  const [collection, setCollection] = useState<CollectionEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailEntry, setDetailEntry] = useState<CollectionEntry | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = await fetchCollection()
        if (cancelled) return
        setCollection(data)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not reach the Moments API — is backend/ running (npm run server)?')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    poll()
    const id = window.setInterval(poll, COLLECTION_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const momentsByFixture = useMemo(() => {
    const map = new Map<number, MomentResult[]>()
    for (const m of recentMoments) {
      const list = map.get(m.fixtureId) ?? []
      list.push(m)
      map.set(m.fixtureId, list)
    }
    return map
  }, [recentMoments])

  const momentsFor = (entry: CollectionEntry) => (entry.fixtureId !== undefined ? momentsByFixture.get(entry.fixtureId) ?? [] : [])

  const grouped = useMemo(() => {
    const map = new Map<string, CollectionEntry[]>()
    for (const round of ROUND_ORDER) map.set(round, [])
    for (const entry of collection) {
      const list = map.get(entry.round) ?? []
      list.push(entry)
      map.set(entry.round, list)
    }
    return map
  }, [collection])

  return (
    <div className="w-full max-w-4xl rounded-3xl bg-[#0a0a0a] p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Verified results + real-time TxLINE odds</p>
          <p className="mt-1 text-lg font-black tracking-tight text-white">World Cup 2026 Collection</p>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8fe3b0]">
          {collection.length} knockout matches
        </span>
      </div>

      {error && (
        <div className="mt-4 w-full rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-[11px] text-red-300">{error}</div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white/50">Loading the collection...</p>
        </div>
      ) : (
        ROUND_ORDER.map((round) => {
          const entries = grouped.get(round) ?? []
          if (entries.length === 0) return null
          return (
            <div key={round} className="mt-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{round}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {entries.map((entry) => (
                  <CollectionTile
                    key={entry.id}
                    entry={entry}
                    hasMoments={momentsFor(entry).length > 0}
                    onOpen={() => setDetailEntry(entry)}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {detailEntry && (
        <CollectionDetailModal entry={detailEntry} moments={momentsFor(detailEntry)} onClose={() => setDetailEntry(null)} />
      )}
    </div>
  )
}
