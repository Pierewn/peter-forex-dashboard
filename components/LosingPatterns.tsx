'use client'
import { Trade } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Zap } from 'lucide-react'

interface Props { trades: Trade[] }

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px'
}

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round(n / d * 1000) / 10
}

const wrColour = (wr: number) => wr >= 60 ? '#10b981' : wr >= 50 ? '#3b82f6' : wr >= 40 ? '#f59e0b' : '#ef4444'

export default function LosingPatterns({ trades }: Props) {
  const wins = trades.filter(t => t.result === 'WIN')
  const losses = trades.filter(t => t.result === 'LOSS')

  if (trades.length < 3) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground">Need at least 3 trades to detect patterns.</p>
      </div>
    )
  }

  const calls = trades.filter(t => t.direction === 'CALL')
  const puts = trades.filter(t => t.direction === 'PUT')
  const dirData = [
    { name: 'CALL (BUY)', wr: pct(calls.filter(t => t.result === 'WIN').length, calls.length), trades: calls.length },
    { name: 'PUT (SELL)', wr: pct(puts.filter(t => t.result === 'WIN').length, puts.length), trades: puts.length },
  ]

  const scoreBands = [
    { range: '5', min: 5, max: 5 },
    { range: '6', min: 6, max: 6 },
    { range: '7', min: 7, max: 7 },
    { range: '8+', min: 8, max: 99 },
  ]
  const scorePnl = scoreBands.map(b => {
    const group = trades.filter(t => t.score !== null && t.score >= b.min && t.score <= b.max)
    const pnl = group.reduce((s, t) => s + (t.pnl ?? 0), 0)
    return { name: `Score ${b.range}`, pnl: Math.round(pnl * 100) / 100, trades: group.length }
  }).filter(b => b.trades > 0)

  const adxZones = [
    { label: '18–24', min: 18, max: 24 },
    { label: '25–34', min: 25, max: 34 },
    { label: '35+', min: 35, max: 999 },
  ]
  const adxData = adxZones.map(z => {
    const group = trades.filter(t => t.adx !== null && t.adx >= z.min && t.adx < z.max)
    return { name: z.label, wr: pct(group.filter(t => t.result === 'WIN').length, group.length), trades: group.length }
  }).filter(d => d.trades > 0)

  const zZones = [
    { label: '≤ -2.0', filter: (t: Trade) => (t.z_score ?? 0) <= -2.0 },
    { label: '-2 to -1', filter: (t: Trade) => (t.z_score ?? 0) > -2.0 && (t.z_score ?? 0) <= -1.0 },
    { label: '-1 to +1', filter: (t: Trade) => Math.abs(t.z_score ?? 0) < 1.0 },
    { label: '+1 to +2', filter: (t: Trade) => (t.z_score ?? 0) >= 1.0 && (t.z_score ?? 0) < 2.0 },
    { label: '≥ +2.0', filter: (t: Trade) => (t.z_score ?? 0) >= 2.0 },
  ]
  const zData = zZones.map(z => {
    const group = trades.filter(z.filter)
    return { name: z.label, wr: pct(group.filter(t => t.result === 'WIN').length, group.length), trades: group.length }
  }).filter(d => d.trades > 0)

  let maxStreak = 0, curStreak = 0, currentStreak = 0
  trades.forEach((t, i) => {
    if (t.result === 'LOSS') {
      curStreak++
      if (curStreak > maxStreak) maxStreak = curStreak
      if (i === trades.length - 1) currentStreak = curStreak
    } else {
      curStreak = 0
    }
  })
  currentStreak = 0
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].result === 'LOSS') currentStreak++
    else break
  }

  const overallWr = pct(wins.length, trades.length)
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)

  const insights: { icon: React.ReactNode; text: string; good: boolean }[] = []

  const callWr = pct(calls.filter(t => t.result === 'WIN').length, calls.length)
  const putWr = pct(puts.filter(t => t.result === 'WIN').length, puts.length)
  if (calls.length > 0 && puts.length > 0) {
    if (callWr > putWr + 10)
      insights.push({ icon: <TrendingUp className="w-4 h-4 text-success" />, text: `CALL trades win ${callWr}% vs PUT ${putWr}% — bot performs better buying`, good: true })
    else if (putWr > callWr + 10)
      insights.push({ icon: <TrendingDown className="w-4 h-4 text-success" />, text: `PUT trades win ${putWr}% vs CALL ${callWr}% — bot performs better selling`, good: true })
    else
      insights.push({ icon: <Target className="w-4 h-4 text-primary" />, text: `CALL and PUT win rates are similar (${callWr}% vs ${putWr}%) — no directional bias`, good: true })
  }

  const highAdx = trades.filter(t => (t.adx ?? 0) >= 35)
  const highAdxWr = pct(highAdx.filter(t => t.result === 'WIN').length, highAdx.length)
  if (highAdx.length >= 2)
    insights.push({
      icon: highAdxWr >= 55 ? <CheckCircle className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />,
      text: `Strong trend trades (ADX 35+): ${highAdxWr}% win rate over ${highAdx.length} trades`,
      good: highAdxWr >= 55,
    })

  const extremeZ = trades.filter(t => Math.abs(t.z_score ?? 0) >= 2)
  const extremeZWr = pct(extremeZ.filter(t => t.result === 'WIN').length, extremeZ.length)
  if (extremeZ.length >= 2)
    insights.push({
      icon: extremeZWr >= 55 ? <CheckCircle className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />,
      text: `Extreme Z-Score trades (|Z| ≥ 2.0): ${extremeZWr}% win rate — ${extremeZWr >= 55 ? 'mean reversion working' : 'not yet confirmed'}`,
      good: extremeZWr >= 55,
    })

  if (currentStreak >= 2)
    insights.push({ icon: <AlertTriangle className="w-4 h-4 text-destructive" />, text: `Currently on a ${currentStreak}-loss streak — bot is in a drawdown phase`, good: false })
  if (currentStreak === 0 && wins[wins.length - 1])
    insights.push({ icon: <Zap className="w-4 h-4 text-success" />, text: `Last trade was a WIN — positive momentum`, good: true })

  return (
    <div className="space-y-6">
      {/* Insights */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          What The Data Is Telling You
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-2">Not enough trades yet for pattern detection.</p>
          ) : (
            insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  ins.good ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
                }`}
              >
                {ins.icon}
                <span className="text-sm text-foreground">{ins.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Direction + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Win Rate by Direction
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dirData} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Win Rate']} />
              <Bar dataKey="wr" radius={[6, 6, 0, 0]}>
                {dirData.map((d, i) => <Cell key={i} fill={wrColour(d.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Streak Tracker
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Total Trades', value: trades.length, color: 'text-primary' },
              { label: 'Overall Win Rate', value: `${overallWr}%`, color: overallWr >= 55 ? 'text-success' : overallWr >= 50 ? 'text-warning' : 'text-destructive' },
              { label: 'Max Losing Streak', value: `${maxStreak} losses`, color: 'text-destructive' },
              { label: 'Current Streak', value: currentStreak > 0 ? `${currentStreak} losses` : 'Last was WIN', color: currentStreak > 0 ? 'text-destructive' : 'text-success' },
              { label: 'Total P&L', value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'text-success' : 'text-destructive' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score P&L + ADX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            P&L by Confidence Score
          </h3>
          {scorePnl.length < 2 ? (
            <p className="text-sm text-muted-foreground">Need more score variety</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scorePnl} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} unit="$" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v}`, 'P&L']} />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {scorePnl.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#10b981' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Win Rate by ADX Strength
          </h3>
          {adxData.length < 2 ? (
            <p className="text-sm text-muted-foreground">Need more ADX variety</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={adxData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { trades: number } }) => [`${v}% (${p.payload.trades} trades)`, 'Win Rate']} />
                <Bar dataKey="wr" radius={[6, 6, 0, 0]}>
                  {adxData.map((d, i) => <Cell key={i} fill={wrColour(d.wr)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Z-Score */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Mean Reversion Quality — Win Rate by Z-Score Zone
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Your philosophy: &quot;History always tells a story — and the deviation is normally not that far off.&quot;
        </p>
        {zData.length < 2 ? (
          <p className="text-sm text-muted-foreground">Need more Z-Score variety</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zData} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { trades: number } }) => [`${v}% (${p.payload.trades} trades)`, 'Win Rate']} />
              <Bar dataKey="wr" radius={[6, 6, 0, 0]}>
                {zData.map((d, i) => <Cell key={i} fill={wrColour(d.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
