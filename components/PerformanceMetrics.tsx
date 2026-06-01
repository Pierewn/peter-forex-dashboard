'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Metrics {
  sharpe:       number
  sortino:      number
  maxDrawdown:  number
  maxDrawdownPct: number
  calmar:       number
  avgWin:       number
  avgLoss:      number
  profitFactor: number
  expectancy:   number
  winStreak:    number
  lossStreak:   number
  currentStreak: { type: 'W'|'L', count: number }
}

function calcMetrics(trades: any[]): Metrics {
  const closed = trades.filter(t => t.result === 'WIN' || t.result === 'LOSS')
  if (closed.length < 5) return {} as Metrics

  const pnls = closed.map(t => Number(t.pnl) || 0)
  const wins  = pnls.filter(p => p > 0)
  const losses = pnls.filter(p => p < 0)

  // Running P&L and drawdown
  let running = 0, peak = 0, maxDD = 0
  const curve: number[] = []
  for (const p of pnls) {
    running += p
    curve.push(running)
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }

  const avgReturn = pnls.reduce((a,b)=>a+b,0) / pnls.length
  const variance  = pnls.reduce((a,b)=>a+(b-avgReturn)**2, 0) / pnls.length
  const stdDev    = Math.sqrt(variance)

  // Downside deviation (for Sortino)
  const downside  = pnls.filter(p => p < 0)
  const downVar   = downside.reduce((a,b)=>a+b**2,0) / Math.max(downside.length, 1)
  const downStd   = Math.sqrt(downVar)

  const sharpe  = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0
  const sortino = downStd > 0 ? (avgReturn / downStd) * Math.sqrt(252) : 0
  const calmar  = maxDD > 0 ? (running / maxDD) : 0

  // Win/loss streaks
  let maxWin = 0, maxLoss = 0, curW = 0, curL = 0
  let lastType: 'W'|'L' = 'W', lastCount = 0
  for (const t of closed) {
    if (t.result === 'WIN') {
      curW++; curL = 0
      if (curW > maxWin) maxWin = curW
      lastType = 'W'; lastCount = curW
    } else {
      curL++; curW = 0
      if (curL > maxLoss) maxLoss = curL
      lastType = 'L'; lastCount = curL
    }
  }

  const grossWin  = wins.reduce((a,b)=>a+b, 0)
  const grossLoss = Math.abs(losses.reduce((a,b)=>a+b, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0

  const avgWin  = wins.length  > 0 ? grossWin  / wins.length  : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
  const wr = closed.length > 0 ? wins.length / closed.length : 0
  const expectancy = wr * avgWin - (1 - wr) * avgLoss

  return {
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    maxDrawdownPct: peak > 0 ? Math.round(maxDD / peak * 1000) / 10 : 0,
    calmar: Math.round(calmar * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy * 1000) / 1000,
    winStreak: maxWin,
    lossStreak: maxLoss,
    currentStreak: { type: lastType, count: lastCount },
  }
}

const Stat = ({ label, value, sub, color = 'text-white' }: any) => (
  <div className="text-center">
    <div className="text-white/40 text-xs mb-1">{label}</div>
    <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    {sub && <div className="text-white/30 text-xs">{sub}</div>}
  </div>
)

export default function PerformanceMetrics() {
  const [m, setM] = useState<Partial<Metrics>>({})
  const [loading, setLoading] = useState(true)

  const [mode, setMode] = useState<'90d'|'all'>('90d')

  useEffect(() => {
    async function load() {
      // Default: post-$3-cap era (May 2026+) — excludes old Kelly $50-200 stake disasters
      // 'all' mode shows full history including early escalation losses
      const cutoff = mode === '90d' ? '2026-05-01' : '2020-01-01'
      const { data } = await supabase
        .from('trades')
        .select('result,pnl,ts')
        .in('result', ['WIN','LOSS'])
        .gte('ts', cutoff)
        .order('id', { ascending: true })
        .limit(5000)
      if (data) setM(calcMetrics(data))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="animate-pulse h-24 rounded-xl bg-white/5" />

  const sharpeColor = (m.sharpe ?? 0) > 1 ? 'text-green-400' : (m.sharpe ?? 0) > 0 ? 'text-yellow-400' : 'text-red-400'
  const sortinoColor = (m.sortino ?? 0) > 1 ? 'text-green-400' : (m.sortino ?? 0) > 0 ? 'text-yellow-400' : 'text-red-400'
  const pfColor = (m.profitFactor ?? 0) > 1.5 ? 'text-green-400' : (m.profitFactor ?? 0) > 1 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Risk-Adjusted Performance
        </h3>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setMode('90d')}
            className={`px-2 py-0.5 rounded ${mode==='90d' ? 'bg-indigo-600 text-white' : 'text-white/30 hover:text-white/60'}`}
          >
            Since May 2026
          </button>
          <button
            onClick={() => setMode('all')}
            className={`px-2 py-0.5 rounded ${mode==='all' ? 'bg-indigo-600 text-white' : 'text-white/30 hover:text-white/60'}`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
        <Stat
          label="Sharpe"
          value={m.sharpe?.toFixed(2) ?? '—'}
          sub="annualised"
          color={sharpeColor}
        />
        <Stat
          label="Sortino"
          value={m.sortino?.toFixed(2) ?? '—'}
          sub="downside-adj"
          color={sortinoColor}
        />
        <Stat
          label="Max DD"
          value={m.maxDrawdown !== undefined ? `-$${m.maxDrawdown}` : '—'}
          sub={m.maxDrawdownPct !== undefined ? `${m.maxDrawdownPct}% peak` : ''}
          color={m.maxDrawdownPct && m.maxDrawdownPct > 20 ? 'text-red-400' : 'text-orange-400'}
        />
        <Stat
          label="Calmar"
          value={m.calmar?.toFixed(2) ?? '—'}
          sub="return/drawdown"
          color={(m.calmar ?? 0) > 1 ? 'text-green-400' : 'text-white/60'}
        />
        <Stat
          label="Profit Factor"
          value={m.profitFactor?.toFixed(2) ?? '—'}
          sub="gross W / gross L"
          color={pfColor}
        />
        <Stat
          label="Expectancy"
          value={m.expectancy !== undefined ? `$${m.expectancy > 0 ? '+' : ''}${m.expectancy.toFixed(3)}` : '—'}
          sub="per trade"
          color={(m.expectancy ?? 0) > 0 ? 'text-green-400' : 'text-red-400'}
        />
        <Stat
          label="Best Streak"
          value={m.winStreak ?? '—'}
          sub="wins in a row"
          color="text-green-400"
        />
        <Stat
          label="Current"
          value={m.currentStreak ? `${m.currentStreak.count}${m.currentStreak.type}` : '—'}
          sub="streak"
          color={m.currentStreak?.type === 'W' ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* Sharpe benchmark guide */}
      <div className="mt-3 pt-2 border-t border-white/5 flex gap-4 text-xs text-white/25">
        <span>Sharpe: &lt;0 losing · 0-1 ok · 1-2 good · &gt;2 excellent</span>
        <span>Profit Factor: &gt;1.5 professional grade</span>
      </div>
    </div>
  )
}
