'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

export default function StatsRow({ trades }: Props) {
  if (!trades.length) return null

  const wins      = trades.filter(t => t.result === 'WIN').length
  const losses    = trades.filter(t => t.result === 'LOSS').length
  const totalPnl  = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const winRate   = Math.round((wins / trades.length) * 1000) / 10
  const lastBal   = trades[trades.length - 1]?.balance ?? 0
  const avgScore  = Math.round(trades.reduce((s,t) => s + t.score, 0) / trades.length * 10) / 10
  const avgPayout = Math.round(trades.reduce((s,t) => s + ((t.payout / t.stake - 1) * 100), 0) / trades.length * 10) / 10

  const pnlColour = totalPnl >= 0 ? '#22c55e' : '#ef4444'
  const wrColour  = winRate >= 55  ? '#22c55e' : winRate >= 45 ? '#eab308' : '#ef4444'

  const cards = [
    { label: 'Total Trades',    value: trades.length,          unit: '',   colour: '#6366f1' },
    { label: 'Win Rate',        value: `${winRate}%`,          unit: '',   colour: wrColour  },
    { label: 'Wins / Losses',   value: `${wins} / ${losses}`,  unit: '',   colour: '#94a3b8' },
    { label: 'Total P&L',       value: `$${totalPnl.toFixed(2)}`, unit: '', colour: pnlColour },
    { label: 'Balance',         value: `$${lastBal.toFixed(2)}`,  unit: '', colour: '#e2e8f0' },
    { label: 'Avg Score',       value: `${avgScore}/20`,        unit: '',   colour: '#a78bfa' },
    { label: 'Avg Payout',      value: `${avgPayout}%`,         unit: '',   colour: '#38bdf8' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label}
          style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {c.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.colour }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  )
}
