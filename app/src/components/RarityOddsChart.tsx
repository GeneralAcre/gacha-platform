import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from './ui/chart'

// Mirrors resolve_rarity() in programs/gacha-er/src/lib.rs: rolls 1-60 -> minor,
// 61-90 -> major, 91-100 -> grand. These are the real on-chain weights, not illustrative.
const ODDS_DATA = [
  { rarity: 'minor', label: 'Minor', chance: 60 },
  { rarity: 'major', label: 'Major', chance: 30 },
  { rarity: 'grand', label: 'Grand', chance: 10 },
]

const chartConfig: ChartConfig = {
  minor: { label: 'Minor Omen', color: '#5a5a66' },
  major: { label: 'Major Omen', color: '#5b4fe8' },
  grand: { label: 'Grand Revelation', color: '#f2c94c' },
}

export function RarityOddsChart({
  pitySinceGrand,
  pityThreshold,
}: {
  pitySinceGrand: number | null
  pityThreshold: number
}) {
  const pityPct = pitySinceGrand !== null ? Math.min(100, (pitySinceGrand / pityThreshold) * 100) : 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pull odds</CardTitle>
        <CardDescription>The real on-chain rarity weights behind every draw</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer id="rarity-odds" config={chartConfig} className="h-28">
          <BarChart data={ODDS_DATA} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: 'rgba(244,242,236,0.55)', fontSize: 11, fontWeight: 700 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="chance" radius={6} barSize={14}>
              {ODDS_DATA.map((entry) => (
                <Cell key={entry.rarity} fill={`var(--chart-color-${entry.rarity})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {pitySinceGrand !== null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-paper/45">
              <span>Pity progress</span>
              <span>
                {pitySinceGrand}/{pityThreshold}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper/10">
              <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${pityPct}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
