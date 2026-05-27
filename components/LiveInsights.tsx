'use client'
import { Trade } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Target, DollarSign, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props { trades: Trade[] }

function wr(trades: Trade[]) {
  if (!trades.length) return 0
  return Math.round(trades.filter(t => t.result === 'WIN').length / trades.length * 1000) / 10
}

function sessionLabel(code: string): { label: string; body: string } | null {
  if (code === 'GOLD_LONDON')
    return {
      label: 'London/NY overlap — Gold (6pm–7pm Kenya)',
      body: 'The London/NY overlap is when both European commodity desks and American traders are active — Gold sees its highest daily volume here.',
    }
  if (code === 'LONDON_GBPUSD')
    return {
      label: 'London session — GBP/USD (11am–6pm Kenya)',
      body: 'The London session is the highest-volume window for GBP/USD — the Bank of England and major European banks are fully active.',
    }
  if (code === 'NEW_YORK_GBPUSD')
    return {
      label: 'New York session — GBP/USD (8pm–1am Kenya)',
      body: 'The NY session adds US institutional flow on GBP/USD — dollar strength/weakness dominates this window.',
    }
  if (code.startsWith('LONDON_'))
    return {
      label: `London morning — ${code.replace('LONDON_', '')} (11am–5pm Kenya)`,
      body: 'The London morning session is the most liquid window for synthetics. European desks are fully active.',
    }
  if (code.startsWith('NEW_YORK_'))
    return {
      label: `New York session — ${code.replace('NEW_YORK_', '')} (8pm–1am Kenya)`,
      body: 'The New York session adds US institutional flow on top of the European close.',
    }
  return null
}

export default function LiveInsights({ trades }: Props) {
  if (trades.length < 5) return null

  const wins = trades.filter(t => t.result === 'WIN').length
  const losses = trades.filter(t => t.result === 'LOSS').length
  const winRate = wr(trades)

  const payoutSamples = trades.filter(t => t.payout_pct != null)
  const avgPayout = payoutSamples.length
    ? payoutSamples.reduce((s, t) => s + t.payout_pct!, 0) / payoutSamples.length
    : (() => {
        const winTrades = trades.filter(t => t.result === 'WIN' && t.payout > 0 && t.stake > 0)
        return winTrades.length
          ? winTrades.reduce((s, t) => s + (t.payout / t.stake - 1) * 100, 0) / winTrades.length
          : 85
      })()
  const breakeven = Math.round(100 / (1 + avgPayout / 100) * 10) / 10

  const regimeTrades = trades.filter(t => t.regime)
  const regimeMap: Record<string, Trade[]> = {}
  regimeTrades.forEach(t => {
    const r = t.regime!
    if (!regimeMap[r]) regimeMap[r] = []
    regimeMap[r].push(t)
  })
  const bestRegime = Object.entries(regimeMap)
    .filter(([, ts]) => ts.length >= 3)
    .sort(([, a], [, b]) => wr(b) - wr(a))[0]

  const sessionMap: Record<string, Trade[]> = {}
  trades.forEach(t => {
    const s = t.session_name ?? 'R75'
    if (!sessionMap[s]) sessionMap[s] = []
    sessionMap[s].push(t)
  })
  const bestSession = Object.entries(sessionMap)
    .filter(([code, ts]) => ts.length >= 3 && sessionLabel(code) !== null)
    .sort(([, a], [, b]) => wr(b) - wr(a))[0]

  const recent10 = trades.slice(-10)
  const recentWr = wr(recent10)
  const trend = recentWr > winRate + 5 ? 'improving' : recentWr < winRate - 5 ? 'declining' : 'stable'

  const balTrades = trades.filter(t => t.balance != null && t.balance > 0)
  const firstBal = balTrades[0]?.balance ?? 0
  const lastBal = balTrades[balTrades.length - 1]?.balance ?? 0
  const balChange = lastBal - firstBal

  const insights: { icon: React.ReactNode; title: string; body: string; type: 'success' | 'warning' | 'info' }[] = []

  if (winRate >= breakeven) {
    insights.push({
      icon: <CheckCircle className="w-5 h-5 text-success" />,
      title: `Above breakeven (${winRate}% vs ${breakeven}% needed)`,
      body: `At an average payout of ${avgPayout.toFixed(1)}%, you need to win at least ${breakeven}% of trades to make money. You're currently at ${winRate}% — that's profitable territory.`,
      type: 'success',
    })
  } else {
    insights.push({
      icon: <AlertTriangle className="w-5 h-5 text-warning" />,
      title: `Below breakeven — ${winRate}% vs ${breakeven}% needed`,
      body: `At ${avgPayout.toFixed(1)}% average payout, you need to win ${breakeven}% of trades just to break even. You're at ${winRate}% right now. The bot is still calibrating.`,
      type: 'warning',
    })
  }

  if (bestRegime) {
    const [name, ts] = bestRegime
    const label = name === 'RANGING' ? 'Ranging (sideways) markets'
      : name === 'TRENDING_BULL' ? 'Bullish trending markets'
      : name === 'TRENDING_BEAR' ? 'Bearish trending markets'
      : name
    insights.push({
      icon: <Target className="w-5 h-5 text-primary" />,
      title: `Sweet spot: ${label} (${wr(ts)}% win rate)`,
      body: name === 'RANGING'
        ? `Ranging means price bouncing between ceiling and floor. RSI, Bollinger Bands, Z-Score catch these bounces. ${wr(ts)}% win rate here is real edge.`
        : `Bot wins ${wr(ts)}% in ${label.toLowerCase()}. It uses ADX and HTF Bias to detect and align with the trend.`,
      type: 'info',
    })
  }

  if (bestSession) {
    const [code, ts] = bestSession
    const info = sessionLabel(code)!
    insights.push({
      icon: <Clock className="w-5 h-5 text-cyan-400" />,
      title: `Best window: ${info.label.split('—')[0]} at ${wr(ts)}% win rate`,
      body: info.body,
      type: 'info',
    })
  }

  if (trend === 'improving') {
    insights.push({
      icon: <TrendingUp className="w-5 h-5 text-success" />,
      title: `Recent form improving (last 10: ${recentWr}%)`,
      body: `Your last 10 trades are winning at ${recentWr}% vs your overall ${winRate}%. The bot is in a good patch — Kelly is sizing stakes larger.`,
      type: 'success',
    })
  } else if (trend === 'declining') {
    insights.push({
      icon: <TrendingDown className="w-5 h-5 text-destructive" />,
      title: `Recent form weaker (last 10: ${recentWr}%)`,
      body: `Your last 10 trades are at ${recentWr}% vs your overall ${winRate}%. Kelly is sizing down stakes automatically.`,
      type: 'warning',
    })
  }

  if (balTrades.length >= 2) {
    insights.push({
      icon: <DollarSign className={`w-5 h-5 ${balChange >= 0 ? 'text-success' : 'text-muted-foreground'}`} />,
      title: balChange >= 0
        ? `Account up $${balChange.toFixed(2)} across ${trades.length} trades`
        : `Account down $${Math.abs(balChange).toFixed(2)} — demo mode, keep learning`,
      body: balChange >= 0
        ? `Starting from $${firstBal.toFixed(2)}, now at $${lastBal.toFixed(2)}. The bot is compounding.`
        : `Currently at $${lastBal.toFixed(2)} from $${firstBal.toFixed(2)}. This is what demo mode is for.`,
      type: balChange >= 0 ? 'success' : 'info',
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Live Insights
          </h3>
          <p className="text-sm text-muted-foreground">What your data is telling you right now</p>
        </div>
        <span className="text-xs text-muted-foreground">Based on {trades.length} trades</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((ins, i) => (
          <div 
            key={i} 
            className={`rounded-xl p-4 border-l-4 ${
              ins.type === 'success' ? 'bg-success/5 border-l-success' :
              ins.type === 'warning' ? 'bg-warning/5 border-l-warning' :
              'bg-primary/5 border-l-primary'
            }`}
          >
            <div className="flex items-start gap-3">
              {ins.icon}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm mb-1 leading-tight">
                  {ins.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {ins.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
