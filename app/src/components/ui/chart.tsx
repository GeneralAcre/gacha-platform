import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

export type ChartConfig = Record<string, { label: string; color: string }>

type ChartContextValue = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('Chart sub-components must be rendered inside a <ChartContainer>')
  return context
}

/** Scopes each config entry's color to a `--chart-color-<key>` custom property on this
 * chart instance, so series can reference `var(--chart-color-<key>)` instead of hardcoding. */
function ChartContainer({
  id,
  config,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  id: string
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
}) {
  const style = Object.entries(config).reduce<React.CSSProperties>((acc, [key, cfg]) => {
    ;(acc as Record<string, string>)[`--chart-color-${key}`] = cfg.color
    return acc
  }, {})

  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={id} style={style} className={cn('h-full w-full text-xs', className)} {...props}>
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: number | string; color?: string }>
  label?: string
  className?: string
}) {
  const { config } = useChart()
  if (!active || !payload?.length) return null

  return (
    <div className={cn('rounded-xl border border-paper/10 bg-ink px-3 py-2 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)]', className)}>
      {label && <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-paper/50">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? '')
          const itemConfig = config[key]
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              <span className="text-paper/70">{itemConfig?.label ?? key}</span>
              <span className="ml-auto font-bold text-paper">{item.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, useChart }
