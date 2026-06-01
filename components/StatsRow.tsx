'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

export default function StatsRow({ trades }: Props) {
  if (!trades.length) return null

  const wins      = trades.filter(t => t.result === 'WIN').length
  const losses    = trades.filter(t => t.result === 'LOSS').length
  const totalPnl  = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const winRate   = Math.round((wins / trades.length) * 1000) / 10
  const lastBal   = [...trades].reverse().find(t => t.balance != null)?.balance ?? 0

  const scoredTrades = trades.filter(t => t.score != null)
  const avgScore  = scoredTrades.length
    ? Math.round(scoredTrades.reduce((s, t) => s + t.score, 0) / scoredTrades.length * 10) / 10
    : 0

  const payoutSamples = trades.filter(t => t.payout_pct != null)
  const avgPayout = payoutSamples.length
    ? Math.round(payoutSamples.reduce((s, t) => s + (t.payout_pct!), 0) / payoutSamples.length * 10) / 10
    : Math.round(trades.reduce((s, t) => s + ((t.payout / t.stake - 1) * 100), 0) / trades.length * 10) / 10

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

  const binaryTrades     = trades.filter(t => !t.instrument || t.instrument !== 'MULTIPLIER')
  const multiplierTrades = trades.filter(t => t.instrument === 'MULTIPLIER')
  const binaryWins       = binaryTrades.filter(t => t.result === 'WIN').length
  const binaryWr         = binaryTrades.length ? Math.round(binaryWins / binaryTrades.length * 1000) / 10 : 0

  const recent20   = [...trades].reverse().slice(0, 20)
  const recent20W  = recent20.filter(t => t.result === 'WIN').length
  const recent20Wr = recent20.length ? Math.round(recent20W / recent20.length * 1000) / 10 : 0

  const pnlColor     = totalPnl >= 0 ? '#00D4AA' : '#EF4444'
  const wrColor      = winRate >= 55 ? '#00D4AA' : winRate >= 52.1 ? '#86efac' : winRate >= 48 ? '#F59E0B' : '#EF4444'
  const binaryWrColor = binaryWr >= 52.1 ? '#00D4AA' : '#F59E0B'
  const recent20Color = recent20Wr >= 52.1 ? '#00D4AA' : '#EF4444'

  const cards = [
    { label: 'TOTAL TRADES',   value: trades.length.toLocaleString(),                        color: '#818CF8' },
    { label: 'WIN RATE',       value: `${winRate}%`,                                          color: wrColor },
    { label: 'BINARY WR',      value: `${binaryTrades.length} · ${binaryWr}%`,               color: binaryWrColor },
    { label: 'MULTIPLIER',     value: multiplierTrades.length > 0 ? String(multiplierTrades.length) : '—', color: '#F59E0B' },
    { label: 'LAST 20 WR',     value: `${recent20Wr}%`,                                       color: recent20Color },
    { label: 'BALANCE',        value: `$${lastBal.toFixed(2)}`,                               color: '#F1F5F9' },
    { label: 'TOTAL P&L',      value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`,  color: pnlColor },
    { label: 'BEST SESSION',   value: bestSessionLabel,                                        color: '#00D4AA' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-xl p-4"
          style={{
            background: '#0B1120',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#64748B' }}>
            {c.label}
          </div>
          <div className="font-mono text-lg font-bold leading-none" style={{ color: c.color }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  )
}
