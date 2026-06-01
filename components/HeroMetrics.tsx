'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

interface MetricCard {
  label: string
  value: string
  sub: string
  color: string
  borderColor: string
}

export default function HeroMetrics({ trades }: Props) {
  if (!trades.length) return null

  const wins   = trades.filter(t => t.result === 'WIN').length
  const losses = trades.filter(t => t.result === 'LOSS').length
  const wr     = trades.length ? Math.round(wins / trades.length * 1000) / 10 : 0

  const lastBal = [...trades].reverse().find(t => t.balance != null)?.balance ?? 0

  const pnls = trades.filter(t => t.result === 'WIN' || t.result === 'LOSS').map(t => t.pnl || 0)
  const avgReturn = pnls.length ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0
  const variance  = pnls.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / Math.max(pnls.length, 1)
  const stdDev    = Math.sqrt(variance)
  const sharpe    = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0

  let running = 0, peak = 0, maxDD = 0
  for (const p of pnls) {
    running += p
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }

  // Current win streak
  let streak = 0
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].result === 'WIN') streak++
    else break
  }

  // Today's P&L (UTC date match)
  const today = new Date().toISOString().slice(0, 10)
  const todayPnl = trades
    .filter(t => t.ts?.slice(0, 10) === today)
    .reduce((s, t) => s + (t.pnl || 0), 0)

  const binaryTrades = trades.filter(t => !t.instrument || t.instrument !== 'MULTIPLIER')

  const wrColor   = wr >= 55 ? '#00D4AA' : wr >= 52.1 ? '#86efac' : wr >= 48 ? '#F59E0B' : '#EF4444'
  const pnlColor  = todayPnl >= 0 ? '#00D4AA' : '#EF4444'
  const ddColor   = maxDD < 200 ? '#F59E0B' : '#EF4444'
  const streakColor = streak > 0 ? '#00D4AA' : '#EF4444'

  const cards: MetricCard[] = [
    {
      label: 'BALANCE',
      value: `$${lastBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${trades.length} total trades`,
      color: '#F1F5F9',
      borderColor: 'rgba(255,255,255,0.06)',
    },
    {
      label: 'WIN RATE',
      value: `${wr}%`,
      sub: `${wins}W / ${losses}L · BE 52.1%`,
      color: wrColor,
      borderColor: wr >= 52.1 ? 'rgba(0,212,170,0.2)' : 'rgba(239,68,68,0.2)',
    },
    {
      label: 'TODAY P&L',
      value: `${todayPnl >= 0 ? '+' : ''}$${todayPnl.toFixed(2)}`,
      sub: `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} UTC`,
      color: pnlColor,
      borderColor: todayPnl >= 0 ? 'rgba(0,212,170,0.2)' : 'rgba(239,68,68,0.2)',
    },
    {
      label: 'SHARPE',
      value: sharpe.toFixed(2),
      sub: 'annualised · >1 = good',
      color: sharpe > 1 ? '#00D4AA' : sharpe > 0 ? '#F59E0B' : '#EF4444',
      borderColor: sharpe > 1 ? 'rgba(0,212,170,0.2)' : 'rgba(245,158,11,0.2)',
    },
    {
      label: 'MAX DRAWDOWN',
      value: `-$${maxDD.toFixed(2)}`,
      sub: peak > 0 ? `${((maxDD / peak) * 100).toFixed(1)}% from peak` : 'from peak',
      color: ddColor,
      borderColor: 'rgba(239,68,68,0.15)',
    },
    {
      label: 'WIN STREAK',
      value: streak > 0 ? `${streak}W` : `0`,
      sub: `${binaryTrades.length} binary trades`,
      color: streakColor,
      borderColor: streak > 0 ? 'rgba(0,212,170,0.2)' : 'rgba(100,116,139,0.2)',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-xl p-4 relative overflow-hidden"
          style={{
            background: '#0B1120',
            border: `1px solid ${c.borderColor}`,
          }}
        >
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#64748B' }}>
            {c.label}
          </div>
          <div className="font-mono text-2xl font-bold leading-none mb-1" style={{ color: c.color }}>
            {c.value}
          </div>
          <div className="text-xs" style={{ color: '#64748B' }}>
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  )
}
