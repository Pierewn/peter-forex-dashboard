'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

export default function StatsRow({ trades }: Props) {
  if (!trades.length) return null

  const wins      = trades.filter(t => t.result === 'WIN').length
  const losses    = trades.filter(t => t.result === 'LOSS').length
  const totalPnl  = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const winRate   = Math.round((wins / trades.length) * 1000) / 10
  // Walk backwards to find last trade with a real balance
  // (reconciled_from_deriv rows have balance=null — skip them)
  const lastBal = [...trades].reverse().find(t => t.balance != null)?.balance ?? 0
  const scoredTrades = trades.filter(t => t.score != null)
  const avgScore  = scoredTrades.length
    ? Math.round(scoredTrades.reduce((s,t) => s + t.score, 0) / scoredTrades.length * 10) / 10
    : 0
  // Prefer stored payout_pct (v6.1+); fall back to computed for legacy trades
  const payoutSamples = trades.filter(t => t.payout_pct != null)
  const avgPayout = payoutSamples.length
    ? Math.round(payoutSamples.reduce((s,t) => s + (t.payout_pct!), 0) / payoutSamples.length * 10) / 10
    : Math.round(trades.reduce((s,t) => s + ((t.payout / t.stake - 1) * 100), 0) / trades.length * 10) / 10

  // Best session (most wins)
  const sessionMap: Record<string, { w: number; t: number }> = {}
  trades.forEach(t => {
    const s = t.session_name ?? 'R75'
    if (!sessionMap[s]) sessionMap[s] = { w: 0, t: 0 }
    sessionMap[s].t++
    if (t.result === 'WIN') sessionMap[s].w++
  })
  const bestSession = Object.entries(sessionMap)
    .filter(([, v]) => v.t >= 3)
    .sort(([, a], [, b]) => (b.w / b.t) - (a.w / a.t))[0]
  const bestSessionLabel = bestSession
    ? `${bestSession[0].replace('_', ' ')} ${Math.round(bestSession[1].w / bestSession[1].t * 100)}%`
    : '—'

  const pnlColour = totalPnl >= 0 ? '#22c55e' : '#ef4444'
  const wrColour  = winRate >= 55  ? '#22c55e' : winRate >= 45 ? '#eab308' : '#ef4444'

  const cards = [
    { label: 'Total Trades',    value: trades.length,             colour: '#6366f1' },
    { label: 'Win Rate',        value: `${winRate}%`,             colour: wrColour  },
    { label: 'Wins / Losses',   value: `${wins} / ${losses}`,     colour: '#94a3b8' },
    { label: 'Total P&L',       value: `$${totalPnl.toFixed(2)}`, colour: pnlColour },
    { label: 'Balance',         value: `$${lastBal.toFixed(2)}`,  colour: '#e2e8f0' },
    { label: 'Avg Score',       value: `${avgScore}/32`,          colour: '#a78bfa' },
    { label: 'Avg Payout',      value: `${avgPayout}%`,           colour: '#38bdf8' },
    { label: 'Best Session',    value: bestSessionLabel,           colour: '#22c55e' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label}
          style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {c.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: c.colour }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  )
}
