'use client'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Trade } from '@/lib/supabase'
import { format } from 'date-fns'

interface Props { trades: Trade[] }

const VERSION_MILESTONES: Record<string, string> = {
  'v12.0': '2025-09-01',
  'v15.0': '2026-01-01',
  'v16.0': '2026-04-01',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg p-3 text-xs font-mono"
      style={{
        background: '#0B1120',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: 180,
      }}
    >
      <div className="mb-1" style={{ color: '#64748B' }}>{d.label}</div>
      <div className="font-bold" style={{ color: '#00D4AA' }}>
        Balance: ${d.balance.toFixed(2)}
      </div>
      <div style={{ color: d.pnl >= 0 ? '#00D4AA' : '#EF4444' }}>
        {d.result} {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
      </div>
      {d.score > 0 && (
        <div style={{ color: '#64748B' }}>Score: {d.score}/20 · {d.direction}</div>
      )}
    </div>
  )
}

export default function EquityCurve({ trades }: Props) {
  if (!trades.length) return null

  const startBalance = trades[0].balance - trades[0].pnl
  const data = [
    { label: 'Start', balance: startBalance, drawdown: 0, pnl: 0, result: '', direction: '', score: 0, tradeNum: 0 },
    ...trades.map((t, i) => ({
      label:     `#${i + 1} · ${format(new Date(t.ts), 'MMM d HH:mm')}`,
      balance:   t.balance,
      pnl:       t.pnl,
      result:    t.result,
      direction: t.direction,
      score:     t.score,
      tradeNum:  i + 1,
      drawdown:  0,
    }))
  ]

  // Compute drawdown for each point
  let peak = startBalance
  for (const d of data) {
    if (d.balance > peak) peak = d.balance
    d.drawdown = peak > 0 ? ((peak - d.balance) / peak) * 100 : 0
  }

  const minBal = Math.min(...data.map(d => d.balance)) * 0.9985
  const maxBal = Math.max(...data.map(d => d.balance)) * 1.001

  // Find milestone trade indices
  const milestones = Object.entries(VERSION_MILESTONES).map(([ver, date]) => {
    const idx = trades.findIndex(t => t.ts >= date)
    return idx > 0 ? { tradeNum: idx, label: ver } : null
  }).filter(Boolean) as { tradeNum: number; label: string }[]

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold tracking-widest" style={{ color: '#64748B' }}>
          EQUITY CURVE — {trades.length.toLocaleString()} TRADES
        </div>
        <div className="flex gap-4 text-xs font-mono" style={{ color: '#64748B' }}>
          <span><span style={{ color: '#00D4AA' }}>●</span> Win</span>
          <span><span style={{ color: '#EF4444' }}>●</span> Loss</span>
          <span><span style={{ color: '#00D4AA', opacity: 0.4 }}>■</span> Drawdown</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.06} />
              <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" />

          <XAxis
            dataKey="tradeNum"
            tick={{ fill: '#64748B', fontSize: 10 }}
            tickFormatter={v => v === 0 ? 'Start' : `#${v}`}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="balance"
            domain={[minBal, maxBal]}
            tick={{ fill: '#64748B', fontSize: 10 }}
            tickFormatter={v => `$${v.toFixed(0)}`}
            width={72}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="dd"
            orientation="right"
            domain={[0, 20]}
            tick={{ fill: '#64748B', fontSize: 10 }}
            tickFormatter={v => `${v.toFixed(0)}%`}
            width={40}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            yAxisId="balance"
            y={startBalance}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="4 4"
          />

          {milestones.map(m => (
            <ReferenceLine
              key={m.label}
              yAxisId="balance"
              x={m.tradeNum}
              stroke="rgba(245,158,11,0.4)"
              strokeDasharray="3 3"
              label={{ value: m.label, fill: '#F59E0B', fontSize: 9, position: 'top' }}
            />
          ))}

          {/* Drawdown area */}
          <Area
            yAxisId="dd"
            type="monotone"
            dataKey="drawdown"
            fill="url(#ddGradient)"
            stroke="rgba(239,68,68,0.2)"
            strokeWidth={1}
            dot={false}
          />

          {/* Equity line */}
          <Line
            yAxisId="balance"
            type="monotone"
            dataKey="balance"
            stroke="#00D4AA"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (!payload.result) return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={0} />
              if (trades.length > 500) return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={0} />
              const colour = payload.result === 'WIN' ? '#00D4AA' : payload.result === 'LOSS' ? '#EF4444' : '#64748B'
              return (
                <circle
                  key={`dot-${cx}`}
                  cx={cx} cy={cy} r={3}
                  fill={colour}
                  stroke="#0B1120"
                  strokeWidth={1}
                />
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 pt-3 flex flex-wrap gap-4 text-xs font-mono" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#64748B' }}>
        <span>Start: <span style={{ color: '#F1F5F9' }}>${startBalance.toFixed(2)}</span></span>
        <span>Current: <span style={{ color: '#00D4AA' }}>${trades[trades.length - 1]?.balance?.toFixed(2) ?? '—'}</span></span>
        <span>Max DD: <span style={{ color: '#EF4444' }}>{Math.max(...data.map(d => d.drawdown)).toFixed(1)}%</span></span>
        <span>v12 · v15 · v16 milestones marked</span>
      </div>
    </div>
  )
}
