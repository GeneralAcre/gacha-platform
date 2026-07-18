// Client for the real admin matches API (backend/src/server.ts's /admin/* routes).
// Same backend/port as momentsApi.ts — this is the same Express app, not a separate service.
import type { AdminMatchView, MatchEventInput, MatchMetadataPatch } from './types'

const API_BASE = (import.meta.env.VITE_MOMENTS_API_URL as string | undefined) ?? 'http://localhost:8787'
const TOKEN_KEY = 'admin_token'

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

function authHeaders(): HeadersInit {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseOrThrow(res: Response): Promise<any> {
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY)
    throw new Error('Not authenticated — please sign in again')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Admin API error: HTTP ${res.status}`)
  }
  return res.json()
}

/** Checks `password` against the server's ADMIN_PASSWORD and stores the returned token. */
export async function login(password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const { token } = await parseOrThrow(res)
  sessionStorage.setItem(TOKEN_KEY, token)
}

export async function logout(): Promise<void> {
  const token = getStoredToken()
  sessionStorage.removeItem(TOKEN_KEY)
  if (!token) return
  await fetch(`${API_BASE}/admin/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
}

export async function fetchAdminMatches(): Promise<AdminMatchView[]> {
  const res = await fetch(`${API_BASE}/admin/matches`, { headers: authHeaders() })
  return parseOrThrow(res)
}

export async function updateAdminMatch(id: string, patch: MatchMetadataPatch): Promise<AdminMatchView> {
  const res = await fetch(`${API_BASE}/admin/matches/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  })
  return parseOrThrow(res)
}

export function matchImageUrl(imageUrl: string): string {
  return imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`
}

export async function addMatchEvent(id: string, input: MatchEventInput): Promise<AdminMatchView> {
  const res = await fetch(`${API_BASE}/admin/matches/${encodeURIComponent(id)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  })
  return parseOrThrow(res)
}

export async function removeMatchEvent(id: string, eventId: string): Promise<AdminMatchView> {
  const res = await fetch(`${API_BASE}/admin/matches/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseOrThrow(res)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the selected file'))
    reader.readAsDataURL(file)
  })
}

/** Uploads and stores an actual card image file (not a link to one) as this match's
 * cover image, then seals it on-chain the same way a pasted imageUrl is. */
export async function uploadMatchImage(id: string, file: File): Promise<AdminMatchView> {
  const imageData = await readFileAsDataUrl(file)
  const res = await fetch(`${API_BASE}/admin/matches/${encodeURIComponent(id)}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ imageData }),
  })
  return parseOrThrow(res)
}
