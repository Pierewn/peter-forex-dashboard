'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { Trade } from '@/lib/supabase'
import { format } from 'date-fns'

interface Props { trades: Trade[] }

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { label: string; balance: number; pnl: number; result: string; direction: string; score: number } }[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-2">{d.label}</p>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary">
          Balance: ${d.balance.toFixed(2)}
        </p>
        <p className={`text-sm ${d.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
          Trade: {d.result} {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">
          Score: {d.score}/20 &middot; {d.direction}
        </p>
      </div>
    </div>
  )
}

export default function EquityCurve({ trades }: Props) {
  if (!trades.length) return null

  const startBalance = trades[0].balance - trades[0].pnl
  const data = [
    { label: 'Start', balance: startBalance, pnl: 0, result: '', direction: '', score: 0, tradeNum: 0 },
    ...trades.map((t, i) => ({
      label: `Trade #${i + 1} · ${format(new Date(t.ts), 'MMM d HH:mm')}`,
      balance: t.balance,
      pnl: t.pnl,
      result: t.result,
      direction: t.direction,
      score: t.score,
      tradeNum: i + 1,
    }))
  ]

  const minBal = Math.min(...data.map(d => d.balance)) * 0.998
  const maxBal = Math.max(...data.map(d => d.balance)) * 1.002
  const currentBal = data[data.length - 1].balance
  const balChange = currentBal - startBalance
  const balChangePercent = ((currentBal - startBalance) / startBalance * 100).toFixed(2)

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Equity Curve
          </h3>
          <p className="text-2xl font-bold text-foreground">${currentBal.toFixed(2)}</p>
        </div>
        <div className={`text-right ${balChange >= 0 ? 'text-success' : 'text-destructive'}`}>
          <p className="text-lg font-semibold">
            {balChange >= 0 ? '+' : ''}{balChangePercent}%
          </p>
          <p className="text-sm">
            {balChange >= 0 ? '+' : ''}${balChange.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="tradeNum" 
              tick={{ fill: '#71717a', fontSize: 11 }}
              tickFormatter={v => v === 0 ? 'Start' : `#${v}`}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis 
              domain={[minBal, maxBal]} 
              tick={{ fill: '#71717a', fontSize: 11 }}
              tickFormatter={v => `$${v.toFixed(0)}`}
              width={65}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={startBalance} stroke="#27272a" strokeDasharray="4 4" />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="#3b82f6" 
              strokeWidth={2.5}
              fill="url(#balanceGradient)"
              dot={(props) => {
                const { cx, cy, payload } = props
                if (!payload.result) return <circle key={cx} cx={cx} cy={cy} r={0} />
                const colour = payload.result === 'WIN' ? '#10b981' : payload.result === 'LOSS' ? '#ef4444' : '#71717a'
                return (
                  <circle 
                    key={cx} 
                    cx={cx} 
                    cy={cy} 
                    r={4} 
                    fill={colour} 
                    stroke="#18181b" 
                    strokeWidth={2}
                  />
                )
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">Win</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-0.5 bg-primary rounded" />
          <span className="text-xs text-muted-foreground">Balance</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="w-6 h-0.5 border-b-2 border-dashed border-muted" />
          <span className="text-xs text-muted-foreground">Starting Balance</span>
        </div>
      </div>
    </div>
  )
}
