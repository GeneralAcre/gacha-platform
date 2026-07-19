import { useEffect, useState } from 'react'
import { fetchFixtures, type FixtureSummary } from './momentsApi'

const POLL_INTERVAL_MS = 15000

function TickerEntry({ fixture }: { fixture: FixtureSummary }) {
  const wp = fixture.winProbability
  return (
    <div className="flex shrink-0 items-center gap-2 px-5 py-2">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          fixture.status === 'live' ? 'bg-[#8fe3b0] shadow-[0_0_6px_1px_rgba(143,227,176,0.7)]' : 'bg-white/25'
        }`}
      />
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{fixture.status}</span>
      <span className="text-xs font-bold text-white">
        {fixture.participant1} <span className="text-white/30">vs</span> {fixture.participant2}
      </span>
      {wp && (
        <span className="text-xs font-black text-[#ffd447]">
          {Math.round(wp.participant1)}% – {Math.round(wp.participant2)}%
        </span>
      )}
    </div>
  )
}

/** Real, live TxLINE fixture data — never fabricated. Ticker only plays its scroll
 * animation once there's enough content to actually loop; a couple of fixtures just
 * sit still rather than jittering back and forth. */
export function LiveMatchTicker({ competition }: { competition: string }) {
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = (await fetchFixtures()).filter((f) => f.competition === competition)
        if (cancelled) return
        const live = data.filter((f) => f.status === 'live')
        const upcoming = data.filter((f) => f.status === 'upcoming')
        const past = data.filter((f) => f.status === 'past')
        setFixtures([...live, ...upcoming, ...past].slice(0, 12))
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    poll()
    const id = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [competition])

  if (error || fixtures.length === 0) return null

  const shouldLoop = fixtures.length >= 3

  return (
    <div className="relative w-full overflow-hidden rounded-full border border-white/10 bg-[#0a0a0a]">
      <div
        className={`flex items-center whitespace-nowrap ${shouldLoop ? 'w-max animate-[ticker-scroll_28s_linear_infinite]' : 'justify-center'}`}
      >
        {(shouldLoop ? [...fixtures, ...fixtures] : fixtures).map((f, i) => (
          <TickerEntry key={`${f.fixtureId}-${i}`} fixture={f} />
        ))}
      </div>
    </div>
  )
}
