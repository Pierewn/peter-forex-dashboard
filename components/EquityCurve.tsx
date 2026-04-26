'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Trade } from '@/lib/supabase'
import { format } from 'date-fns'

interface Props { trades: Trade[] }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: '#64748b', marginBottom: 4 }}>{d.label}</div>
      <div style={{ color: '#6366f1', fontWeight: 700 }}>Balance: ${d.balance.toFixed(2)}</div>
      <div style={{ color: d.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
        Trade: {d.result} {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
      </div>
      <div style={{ color: '#94a3b8' }}>Score: {d.score}/20 · {d.direction}</div>
    </div>
  )
}

export default function EquityCurve({ trades }: Props) {
  if (!trades.length) return null

  const startBalance = trades[0].balance - trades[0].pnl
  const data = [
    { label: 'Start', balance: startBalance, pnl: 0, result: '', direction: '', score: 0, tradeNum: 0 },
    ...trades.map((t, i) => ({
      label:     `Trade #${i + 1} · ${format(new Date(t.ts), 'MMM d HH:mm')}`,
      balance:   t.balance,
      pnl:       t.pnl,
      result:    t.result,
      direction: t.direction,
      score:     t.score,
      tradeNum:  i + 1,
    }))
  ]

  const minBal = Math.min(...data.map(d => d.balance)) * 0.999
  const maxBal = Math.max(...data.map(d => d.balance)) * 1.001

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
        Equity Curve — Balance Over Every Trade
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis dataKey="tradeNum" tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={v => v === 0 ? 'Start' : `#${v}`} />
          <YAxis domain={[minBal, maxBal]} tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={v => `$${v.toFixed(0)}`} width={70} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={startBalance} stroke="#2a2d3a" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2.5}
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (!payload.result) return <circle key={cx} cx={cx} cy={cy} r={0} />
              const colour = payload.result === 'WIN' ? '#22c55e' : payload.result === 'LOSS' ? '#ef4444' : '#94a3b8'
              return <circle key={cx} cx={cx} cy={cy} r={5} fill={colour} stroke="#1a1d27" strokeWidth={2} />
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: '#64748b' }}>
        <span><span style={{ color: '#22c55e' }}>●</span> Win</span>
        <span><span style={{ color: '#ef4444' }}>●</span> Loss</span>
        <span><span style={{ color: '#6366f1' }}>─</span> Balance curve</span>
      </div>
    </div>
  )
}
