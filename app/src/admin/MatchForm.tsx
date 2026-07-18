import { useRef, useState, type FormEvent } from 'react'
import { matchImageUrl, uploadMatchImage } from './adminApi'
import { EventPack } from './EventPack'
import type { AdminMatchView, MatchMetadataPatch } from './types'

const fieldClass = 'w-full border-[3px] border-ink bg-white px-3 py-2 text-sm font-bold outline-none focus:bg-[color:var(--admin-neon)]/25'
const labelClass = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-ink/70'

/** Curates stadium/city/cover-image for one TxLINE-sourced match. Status, score, and win
 * probability are shown read-only, straight from the live view — this form has no way to
 * edit them, on purpose (see backend/src/adminMatches.ts). Saving reseals the metadata
 * on devnet, so every field here has an on-chain audit trail once set. */
export function MatchForm({
  match,
  onSubmit,
  onCancel,
  onUpdate,
  saving,
}: {
  match: AdminMatchView
  onSubmit: (patch: MatchMetadataPatch) => void
  onCancel: () => void
  onUpdate: (updated: AdminMatchView) => void
  saving: boolean
}) {
  const [stadium, setStadium] = useState(match.stadium ?? '')
  const [city, setCity] = useState(match.city ?? '')
  const [imageUrl, setImageUrl] = useState(match.imageIsCustom ? match.imageUrl : '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const patch: MatchMetadataPatch = {}
    if (stadium !== (match.stadium ?? '')) patch.stadium = stadium
    if (city !== (match.city ?? '')) patch.city = city
    if (imageUrl.trim()) patch.imageUrl = imageUrl.trim()
    if (Object.keys(patch).length === 0) {
      onCancel()
      return
    }
    onSubmit(patch)
  }

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const updated = await uploadMatchImage(match.id, file)
      onUpdate(updated)
      setImageUrl('') // the uploaded file is now match.imageUrl; clear so the URL field doesn't look stale
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const previewSrc = matchImageUrl(imageUrl.trim() || match.imageUrl)

  return (
    <div className="border-[3px] border-ink bg-white p-5 shadow-[8px_8px_0_0_#0a0a0a]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-tight">{match.teamA} vs {match.teamB}</p>
        <span className="border-[2px] border-ink px-2 py-0.5 text-[10px] font-black uppercase">{match.round}</span>
      </div>

      <form onSubmit={handleSubmit}>

      <div className="mb-5 grid grid-cols-3 gap-3 border-[3px] border-ink/15 bg-canvas/50 p-3">
        <ReadOnly label="Status" value={match.status} />
        <ReadOnly label="Score" value={match.score ? `${match.score.teamA}–${match.score.teamB}` : '—'} />
        <ReadOnly
          label="Win Prob. (TxLINE)"
          value={match.winProbability ? `${Math.round(match.winProbability.teamA)}% / ${Math.round(match.winProbability.teamB)}%` : 'Pending'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Stadium</label>
          <input className={fieldClass} value={stadium} onChange={(e) => setStadium(e.target.value)} placeholder="Not set" />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Not set" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Cover Image URL <span className="normal-case text-ink/40">(a link you already host)</span>
          </label>
          <input className={fieldClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className={labelClass}>
            Or Upload a File <span className="normal-case text-ink/40">(stored on this server, sealed immediately)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading}
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
            className={`${fieldClass} py-1.5 file:mr-2 file:border-[2px] file:border-ink file:bg-canvas file:px-2 file:py-1 file:text-[10px] file:font-black file:uppercase disabled:opacity-50`}
          />
          {uploading && <p className="mt-1 text-[10px] font-bold uppercase text-ink/50">Uploading &amp; sealing on-chain...</p>}
          {uploadError && <p className="mt-1 text-[10px] font-bold text-red-600">{uploadError}</p>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-[3px] border-ink p-3">
        <img src={previewSrc} alt="" className="h-20 w-36 shrink-0 border-[2px] border-ink object-cover" />
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">
          <p>{match.imageIsCustom ? 'Custom image' : 'Generated placeholder'}</p>
          {match.sealedSignature && (
            <a
              href={`https://explorer.solana.com/tx/${match.sealedSignature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block underline decoration-2 underline-offset-2"
            >
              Sealed on-chain ↗
            </a>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="border-[3px] border-ink bg-white px-4 py-2 text-xs font-black uppercase tracking-widest">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="border-[3px] border-ink bg-[color:var(--admin-neon)] px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#0a0a0a] disabled:opacity-50"
        >
          {saving ? 'Sealing on-chain...' : 'Save & Seal'}
        </button>
      </div>
      </form>

      {/* Own component, not nested inside the form above (nested <form> elements aren't
          valid HTML) -- only a live TxLINE-tracked match can take reported events, a
          historical result already has a real final score, see backend/src/adminMatches.ts. */}
      {match.source === 'live' && <EventPack match={match} onChange={onUpdate} />}
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-ink/40">{label}</p>
      <p className="text-xs font-black uppercase">{value}</p>
    </div>
  )
}
