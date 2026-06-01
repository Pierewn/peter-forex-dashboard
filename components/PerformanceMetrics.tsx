'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Metrics {
  sharpe:        number
  sortino:       number
  maxDrawdown:   number
  maxDrawdownPct: number
  calmar:        number
  avgWin:        number
  avgLoss:       number
  profitFactor:  number
  expectancy:    number
  winStreak:     number
  lossStreak:    number
  currentStreak: { type: 'W' | 'L'; count: number }
}

function calcMetrics(trades: any[]): Metrics {
  const closed = trades.filter(t => t.result === 'WIN' || t.result === 'LOSS')
  if (closed.length < 5) return {} as Metrics

  const pnls   = closed.map(t => Number(t.pnl) || 0)
  const wins   = pnls.filter(p => p > 0)
  const losses = pnls.filter(p => p < 0)

  let running = 0, peak = 0, maxDD = 0
  for (const p of pnls) {
    running += p
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }

  const avgReturn = pnls.reduce((a, b) => a + b, 0) / pnls.length
  const variance  = pnls.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / pnls.length
  const stdDev    = Math.sqrt(variance)

  const downside = pnls.filter(p => p < 0)
  const downVar  = downside.reduce((a, b) => a + b ** 2, 0) / Math.max(downside.length, 1)
  const downStd  = Math.sqrt(downVar)

  const sharpe  = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0
  const sortino = downStd > 0 ? (avgReturn / downStd) * Math.sqrt(252) : 0
  const calmar  = maxDD > 0 ? (running / maxDD) : 0

  let maxWin = 0, maxLoss = 0, curW = 0, curL = 0
  let lastType: 'W' | 'L' = 'W', lastCount = 0
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

  const grossWin  = wins.reduce((a, b) => a + b, 0)
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0

  const avgW   = wins.length   > 0 ? grossWin  / wins.length   : 0
  const avgL   = losses.length > 0 ? grossLoss / losses.length : 0
  const wr     = closed.length > 0 ? wins.length / closed.length : 0
  const expect = wr * avgW - (1 - wr) * avgL

  return {
    sharpe:         Math.round(sharpe * 100) / 100,
    sortino:        Math.round(sortino * 100) / 100,
    maxDrawdown:    Math.round(maxDD * 100) / 100,
    maxDrawdownPct: peak > 0 ? Math.round(maxDD / peak * 1000) / 10 : 0,
    calmar:         Math.round(calmar * 100) / 100,
    avgWin:         Math.round(avgW * 100) / 100,
    avgLoss:        Math.round(avgL * 100) / 100,
    profitFactor:   Math.round(profitFactor * 100) / 100,
    expectancy:     Math.round(expect * 1000) / 1000,
    winStreak:      maxWin,
    lossStreak:     maxLoss,
    currentStreak:  { type: lastType, count: lastCount },
  }
}

interface StatProps {
  label: string
  value: string
  sub?: string
  color?: string
}

const Stat = ({ label, value, sub, color = '#F1F5F9' }: StatProps) => (
  <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
    <div className="text-xs font-bold tracking-widest mb-1" style={{ color: '#64748B' }}>{label}</div>
    <div className="text-base font-bold font-mono" style={{ color }}>{value}</div>
    {sub && <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</div>}
  </div>
)

export default function PerformanceMetrics() {
  const [m, setM]       = useState<Partial<Metrics>>({})
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'90d' | 'all'>('90d')

  useEffect(() => {
    async function load() {
      const cutoff = mode === '90d' ? '2026-05-01' : '2020-01-01'
      const { data } = await supabase
        .from('trades')
        .select('result,pnl,ts')
        .in('result', ['WIN', 'LOSS'])
        .gte('ts', cutoff)
        .order('id', { ascending: true })
        .limit(5000)
      if (data) setM(calcMetrics(data))
      setLoading(false)
    }
    load()
  }, [mode])

  if (loading) return (
    <div
      className="rounded-xl h-24 mb-5 animate-pulse"
      style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.06)' }}
    />
  )

  const sharpeColor = (m.sharpe ?? 0) > 1 ? '#00D4AA' : (m.sharpe ?? 0) > 0 ? '#F59E0B' : '#EF4444'
  const pfColor     = (m.profitFactor ?? 0) > 1.5 ? '#00D4AA' : (m.profitFactor ?? 0) > 1 ? '#F59E0B' : '#EF4444'
  const expectColor = (m.expectancy ?? 0) > 0 ? '#00D4AA' : '#EF4444'
  const sortinoColor = (m.sortino ?? 0) > 1 ? '#00D4AA' : (m.sortino ?? 0) > 0 ? '#F59E0B' : '#EF4444'

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold tracking-widest" style={{ color: '#64748B' }}>
          RISK-ADJUSTED PERFORMANCE
        </div>
        <div className="flex gap-1 text-xs">
          {(['90d', 'all'] as const).map(m2 => (
            <button
              key={m2}
              onClick={() => setMode(m2)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: mode === m2 ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: mode === m2 ? '#00D4AA' : '#64748B',
                border: `1px solid ${mode === m2 ? 'rgba(0,212,170,0.3)' : 'transparent'}`,
              }}
            >
              {m2 === '90d' ? 'Since May 2026' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        <Stat label="SHARPE"        value={m.sharpe?.toFixed(2) ?? '—'}          sub="annualised"       color={sharpeColor} />
        <Stat label="SORTINO"       value={m.sortino?.toFixed(2) ?? '—'}         sub="downside-adj"     color={sortinoColor} />
        <Stat label="MAX DD"        value={m.maxDrawdown != null ? `-$${m.maxDrawdown}` : '—'} sub={m.maxDrawdownPct != null ? `${m.maxDrawdownPct}% peak` : ''} color={m.maxDrawdownPct && m.maxDrawdownPct > 20 ? '#EF4444' : '#F59E0B'} />
        <Stat label="CALMAR"        value={m.calmar?.toFixed(2) ?? '—'}          sub="ret/drawdown"     color={(m.calmar ?? 0) > 1 ? '#00D4AA' : '#64748B'} />
        <Stat label="PROFIT FACTOR" value={m.profitFactor?.toFixed(2) ?? '—'}   sub="gross W / L"      color={pfColor} />
        <Stat label="EXPECTANCY"    value={m.expectancy != null ? `${m.expectancy > 0 ? '+' : ''}$${m.expectancy.toFixed(3)}` : '—'} sub="per trade" color={expectColor} />
        <Stat label="BEST STREAK"   value={String(m.winStreak ?? '—')}           sub="wins in a row"    color="#00D4AA" />
        <Stat label="CURRENT"       value={m.currentStreak ? `${m.currentStreak.count}${m.currentStreak.type}` : '—'} sub="streak" color={m.currentStreak?.type === 'W' ? '#00D4AA' : '#EF4444'} />
      </div>

      <div
        className="mt-4 pt-3 flex flex-wrap gap-4 text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#475569' }}
      >
        <span>Sharpe: &lt;0 losing · 0-1 ok · 1-2 good · &gt;2 excellent</span>
        <span>Profit Factor: &gt;1.5 professional grade</span>
      </div>
    </div>
  )
}
