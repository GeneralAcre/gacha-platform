import { useEffect, useMemo, useState } from 'react'
import { fetchCollection, fetchRecentMoments, type CollectionEntry, type MomentResult } from './momentsApi'
import { CollectionDetailModal } from './CollectionDetailModal'
import { ROUND_ORDER, CollectionTile } from './collectionShared'

const COLLECTION_POLL_INTERVAL_MS = 15000
const MOMENTS_POLL_INTERVAL_MS = 5000

/** Read-only browse of every World Cup 2026 knockout match on the site — distinct from
 * ProfileScreen ("my collection", what I've drawn/own): this is the full catalog, same for
 * every visitor whether they've drawn anything or not, with no buy/draw mechanic. */
export function CollectionScreen() {
  const [collection, setCollection] = useState<CollectionEntry[]>([])
  const [recentMoments, setRecentMoments] = useState<MomentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = await fetchRecentMoments(50)
        if (!cancelled) setRecentMoments(data)
      } catch {
        /* non-critical -- SEALED badges just won't show if this fails */
      }
    }

    poll()
    const id = window.setInterval(poll, MOMENTS_POLL_INTERVAL_MS)
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
    <div className="w-full flex-1 bg-ink text-paper">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Verified results + real-time TxLINE odds</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">World Cup 2026 Collection</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Every knockout match on the site, whether you've drawn it or not — verified results and matches TxLINE is tracking live.
        </p>

        {error && (
          <div className="mt-6 w-full rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-[11px] text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
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
    </div>
  )
}
