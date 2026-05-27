'use client'
import { Trade } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Zap, DollarSign, Percent, Target, Award, BarChart3 } from 'lucide-react'

interface Props { trades: Trade[] }

export default function StatsRow({ trades }: Props) {
  if (!trades.length) return null

  const wins = trades.filter(t => t.result === 'WIN').length
  const losses = trades.filter(t => t.result === 'LOSS').length
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const winRate = Math.round((wins / trades.length) * 1000) / 10
  const lastBal = [...trades].reverse().find(t => t.balance != null)?.balance ?? 0
  const scoredTrades = trades.filter(t => t.score != null)
  const avgScore = scoredTrades.length
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

  const cards = [
    { 
      label: 'Total Trades', 
      value: trades.length.toLocaleString(), 
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      label: 'Win Rate', 
      value: `${winRate}%`, 
      icon: Target,
      color: winRate >= 55 ? 'text-success' : winRate >= 45 ? 'text-warning' : 'text-destructive',
      bgColor: winRate >= 55 ? 'bg-success/10' : winRate >= 45 ? 'bg-warning/10' : 'bg-destructive/10'
    },
    { 
      label: 'Wins / Losses', 
      value: `${wins} / ${losses}`, 
      icon: winRate >= 50 ? TrendingUp : TrendingDown,
      color: 'text-muted-foreground',
      bgColor: 'bg-secondary'
    },
    { 
      label: 'Total P&L', 
      value: `$${totalPnl.toFixed(2)}`, 
      icon: DollarSign,
      color: totalPnl >= 0 ? 'text-success' : 'text-destructive',
      bgColor: totalPnl >= 0 ? 'bg-success/10' : 'bg-destructive/10'
    },
    { 
      label: 'Balance', 
      value: `$${lastBal.toFixed(2)}`, 
      icon: DollarSign,
      color: 'text-foreground',
      bgColor: 'bg-secondary'
    },
    { 
      label: 'Avg Score', 
      value: `${avgScore}/32`, 
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    { 
      label: 'Avg Payout', 
      value: `${avgPayout}%`, 
      icon: Percent,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    },
    { 
      label: 'Best Session', 
      value: bestSessionLabel, 
      icon: Award,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(c => {
        const Icon = c.icon
        return (
          <div 
            key={c.label}
            className="bg-card border border-border rounded-xl p-4 card-hover"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {c.label}
              </span>
              <div className={`w-7 h-7 rounded-lg ${c.bgColor} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${c.color}`} />
              </div>
            </div>
            <div className={`text-xl font-bold ${c.color}`}>
              {c.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
