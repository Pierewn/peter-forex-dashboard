'use client'
import { Trade } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fmt = (v: any, n?: any, p?: any) => [string, string]

interface Props { trades: Trade[] }

const TipStyle = {
  background: '#1a1d27', border: '1px solid #2a2d3a',
  borderRadius: 8, padding: '8px 12px', fontSize: 12,
}

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round(n / d * 1000) / 10
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function LosingPatterns({ trades }: Props) {
  const wins  = trades.filter(t => t.result === 'WIN')
  const losses = trades.filter(t => t.result === 'LOSS')

  if (trades.length < 3) {
    return (
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Need at least 3 trades to detect patterns.
      </div>
    )
  }

  // ── 1. Direction breakdown ──────────────────────────────
  const calls = trades.filter(t => t.direction === 'CALL')
  const puts  = trades.filter(t => t.direction === 'PUT')
  const dirData = [
    { name: 'CALL (BUY)',  wr: pct(calls.filter(t => t.result === 'WIN').length, calls.length), trades: calls.length },
    { name: 'PUT (SELL)', wr: pct(puts.filter(t => t.result === 'WIN').length,  puts.length),  trades: puts.length  },
  ]

  // ── 2. Score band P&L ──────────────────────────────────
  const scoreBands = [
    { range: '5', min: 5, max: 5 },
    { range: '6', min: 6, max: 6 },
    { range: '7', min: 7, max: 7 },
    { range: '8+', min: 8, max: 99 },
  ]
  const scorePnl = scoreBands.map(b => {
    const group = trades.filter(t => t.score !== null && t.score >= b.min && t.score <= b.max)
    const pnl   = group.reduce((s, t) => s + (t.pnl ?? 0), 0)
    return { name: `Score ${b.range}`, pnl: Math.round(pnl * 100) / 100, trades: group.length }
  }).filter(b => b.trades > 0)

  // ── 3. ADX zones ────────────────────────────────────────
  const adxZones = [
    { label: '18–24 (weak)',    min: 18, max: 24 },
    { label: '25–34 (moderate)', min: 25, max: 34 },
    { label: '35+ (strong)',    min: 35, max: 999 },
  ]
  const adxData = adxZones.map(z => {
    const group = trades.filter(t => t.adx !== null && t.adx >= z.min && t.adx < z.max)
    return {
      name: z.label,
      wr: pct(group.filter(t => t.result === 'WIN').length, group.length),
      trades: group.length,
    }
  }).filter(d => d.trades > 0)

  // ── 4. Z-Score zones ─────────────────────────────────
  const zZones = [
    { label: '≤ -2.0 (extreme low)',  filter: (t: Trade) => (t.z_score ?? 0) <= -2.0 },
    { label: '-2 to -1',              filter: (t: Trade) => (t.z_score ?? 0) > -2.0 && (t.z_score ?? 0) <= -1.0 },
    { label: '-1 to +1 (neutral)',    filter: (t: Trade) => Math.abs(t.z_score ?? 0) < 1.0 },
    { label: '+1 to +2',              filter: (t: Trade) => (t.z_score ?? 0) >= 1.0 && (t.z_score ?? 0) < 2.0 },
    { label: '≥ +2.0 (extreme high)', filter: (t: Trade) => (t.z_score ?? 0) >= 2.0 },
  ]
  const zData = zZones.map(z => {
    const group = trades.filter(z.filter)
    return {
      name: z.label,
      wr: pct(group.filter(t => t.result === 'WIN').length, group.length),
      trades: group.length,
    }
  }).filter(d => d.trades > 0)

  // ── 5. Consecutive loss streaks ────────────────────────
  let maxStreak = 0, curStreak = 0, currentStreak = 0
  trades.forEach((t, i) => {
    if (t.result === 'LOSS') {
      curStreak++
      if (curStreak > maxStreak) maxStreak = curStreak
      if (i === trades.length - 1 || trades.slice(i + 1).every(x => x.result === 'LOSS'))
        currentStreak = curStreak
    } else {
      if (i === trades.length - 1) currentStreak = 0
      curStreak = 0
    }
  })
  // recalculate currentStreak properly
  currentStreak = 0
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].result === 'LOSS') currentStreak++
    else break
  }

  // ── 6. Plain-English insights ──────────────────────────
  const insights: { icon: string; text: string; good: boolean }[] = []

  const callWr = pct(calls.filter(t => t.result === 'WIN').length, calls.length)
  const putWr  = pct(puts.filter(t => t.result === 'WIN').length,  puts.length)
  if (calls.length > 0 && puts.length > 0) {
    if (callWr > putWr + 10)
      insights.push({ icon: '📈', text: `CALL trades win ${callWr}% vs PUT ${putWr}% — bot performs better buying`, good: true })
    else if (putWr > callWr + 10)
      insights.push({ icon: '📉', text: `PUT trades win ${putWr}% vs CALL ${callWr}% — bot performs better selling`, good: true })
    else
      insights.push({ icon: '↔️', text: `CALL and PUT win rates are similar (${callWr}% vs ${putWr}%) — no directional bias`, good: true })
  }

  const highAdx = trades.filter(t => (t.adx ?? 0) >= 35)
  const highAdxWr = pct(highAdx.filter(t => t.result === 'WIN').length, highAdx.length)
  if (highAdx.length >= 2)
    insights.push({
      icon: highAdxWr >= 55 ? '✅' : '⚠️',
      text: `Strong trend trades (ADX 35+): ${highAdxWr}% win rate over ${highAdx.length} trades`,
      good: highAdxWr >= 55,
    })

  const extremeZ = trades.filter(t => Math.abs(t.z_score ?? 0) >= 2)
  const extremeZWr = pct(extremeZ.filter(t => t.result === 'WIN').length, extremeZ.length)
  if (extremeZ.length >= 2)
    insights.push({
      icon: extremeZWr >= 55 ? '✅' : '⚠️',
      text: `Extreme Z-Score trades (|Z| ≥ 2.0): ${extremeZWr}% win rate — ${extremeZWr >= 55 ? 'mean reversion is working' : 'mean reversion not confirmed yet'}`,
      good: extremeZWr >= 55,
    })

  const overallWr = pct(wins.length, trades.length)
  if (currentStreak >= 2)
    insights.push({ icon: '🔴', text: `Currently on a ${currentStreak}-loss streak — bot is in a drawdown phase`, good: false })
  if (currentStreak === 0 && wins[wins.length - 1])
    insights.push({ icon: '🟢', text: `Last trade was a WIN — positive momentum`, good: true })

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  if (totalPnl < 0)
    insights.push({ icon: '💡', text: `Overall P&L is negative ($${totalPnl.toFixed(2)}) — the strategy needs more data to prove its edge`, good: false })

  const wrColour = (wr: number) => wr >= 60 ? '#22c55e' : wr >= 50 ? '#6366f1' : wr >= 40 ? '#eab308' : '#ef4444'

  return (
    <div>
      {/* Plain-English Insights */}
      <Section title="🔍 What The Data Is Telling You">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 13 }}>Not enough trades yet for pattern detection. Keep running!</div>
          )}
          {insights.map((ins, i) => (
            <div key={i} style={{
              background: ins.good ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
              border: `1px solid ${ins.good ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e2e8f0',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.icon}</span>
              <span>{ins.text}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Direction + Streak side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Win Rate by Direction
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dirData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={TipStyle} formatter={((v: any) => [`${v ?? 0}%`, 'Win Rate']) as Fmt} />
              <Bar dataKey="wr" radius={[6, 6, 0, 0]}>
                {dirData.map((d, i) => <Cell key={i} fill={wrColour(d.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Streak Tracker
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            {[
              { label: 'Total Trades', value: trades.length, color: '#6366f1' },
              { label: 'Overall Win Rate', value: `${overallWr}%`, color: wrColour(overallWr) },
              { label: 'Max Losing Streak', value: `${maxStreak} losses`, color: '#ef4444' },
              { label: 'Current Streak', value: currentStreak > 0 ? `${currentStreak} losses` : 'Last was WIN ✅', color: currentStreak > 0 ? '#ef4444' : '#22c55e' },
              { label: 'Total P&L', value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score P&L + ADX */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            P&L by Confidence Score
          </div>
          {scorePnl.length < 2 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Need more score variety</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scorePnl} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="$" />
                <Tooltip contentStyle={TipStyle} formatter={((v: any) => [`$${v ?? 0}`, 'P&L']) as Fmt} />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {scorePnl.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Win Rate by ADX Strength
          </div>
          {adxData.length < 2 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Need more ADX variety</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={adxData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={TipStyle} formatter={((v: any, _n: any, p: any) => [`${v ?? 0}% (${p?.payload?.trades ?? 0} trades)`, 'Win Rate']) as Fmt} />
                <Bar dataKey="wr" radius={[6, 6, 0, 0]}>
                  {adxData.map((d, i) => <Cell key={i} fill={wrColour(d.wr)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Z-Score zones */}
      <Section title="Mean Reversion Quality — Win Rate by Z-Score Zone">
        {zData.length < 2 ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>Need more Z-Score variety</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={TipStyle} formatter={((v: any, _n: any, p: any) => [`${v ?? 0}% (${p?.payload?.trades ?? 0} trades)`, 'Win Rate']) as Fmt} />
              <Bar dataKey="wr" radius={[6, 6, 0, 0]}>
                {zData.map((d, i) => <Cell key={i} fill={wrColour(d.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>
          Your philosophy: "History always tells a story — and the deviation is normally not that far off."
          Extreme Z-Scores (|Z| ≥ 2.0) are your highest-conviction mean reversion signals.
        </div>
      </Section>
    </div>
  )
}
