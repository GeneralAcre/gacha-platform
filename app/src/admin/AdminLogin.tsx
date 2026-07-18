import { useState, type FormEvent } from 'react'
import { login } from './adminApi'

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(password)
      onSuccess()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-scope flex min-h-svh items-center justify-center bg-[#f4f2ec] font-mono text-ink">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs border-[3px] border-ink bg-white p-6 shadow-[8px_8px_0_0_#0a0a0a]"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-ink/50">Moment</p>
        <p className="mb-5 text-lg font-black uppercase leading-tight">Match Admin</p>
        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-ink/70">Password</label>
        <input
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-[3px] border-ink bg-white px-3 py-2 text-sm font-bold outline-none focus:bg-[color:var(--admin-neon)]/25"
        />
        {error && <p className="mt-3 border-[3px] border-red-600 bg-red-50 p-2 text-xs font-bold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full border-[3px] border-ink bg-[color:var(--admin-neon)] px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#0a0a0a] disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
