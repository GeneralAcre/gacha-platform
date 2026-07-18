import { useCallback, useEffect, useState } from 'react'
import { AdminLayout } from './AdminLayout'
import { AdminLogin } from './AdminLogin'
import { MatchForm } from './MatchForm'
import { MatchTable } from './MatchTable'
import { fetchAdminMatches, getStoredToken, logout, updateAdminMatch } from './adminApi'
import type { AdminMatchView, MatchMetadataPatch } from './types'

export function AdminMatchesPage() {
  const [authed, setAuthed] = useState(() => getStoredToken() !== null)
  const [matches, setMatches] = useState<AdminMatchView[]>([])
  const [editing, setEditing] = useState<AdminMatchView | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchAdminMatches()
      .then(setMatches)
      .catch((e: Error) => {
        setError(e.message)
        if (e.message.includes('Not authenticated')) setAuthed(false)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (authed) load()
  }, [authed, load])

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />
  }

  const handleSubmit = async (patch: MatchMetadataPatch) => {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateAdminMatch(editing.id, patch)
      setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEditing(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = (updated: AdminMatchView) => {
    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setEditing(updated)
  }

  const handleSignOut = async () => {
    await logout()
    setAuthed(false)
  }

  return (
    <AdminLayout section="matches" onNavigate={() => {}}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tight">Matches</h1>
        <div className="flex gap-3">
          <button onClick={load} className="border-[3px] border-ink bg-white px-4 py-2 text-xs font-black uppercase tracking-widest">
            Refresh
          </button>
          <button onClick={handleSignOut} className="border-[3px] border-ink bg-white px-4 py-2 text-xs font-black uppercase tracking-widest">
            Sign Out
          </button>
        </div>
      </div>

      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-ink/40">
        Score, status, and win probability are always live from TxLINE — curate stadium, city, and cover image only.
      </p>

      {error && <p className="mb-4 border-[3px] border-red-600 bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p>}

      {editing && (
        <div className="mb-6">
          <MatchForm
            match={editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
            onUpdate={handleUpdate}
            saving={saving}
          />
        </div>
      )}

      {loading ? (
        <p className="text-xs font-bold uppercase text-ink/50">Loading...</p>
      ) : (
        <MatchTable matches={matches} onEdit={setEditing} />
      )}
    </AdminLayout>
  )
}
