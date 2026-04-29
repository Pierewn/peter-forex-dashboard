'use client'
import { Trade } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'

interface Props { trades: Trade[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fmt = (v: any, n?: any, p?: any) => [string, string]

const TipStyle = {
  background: '#1a1d27', border: '1px solid #2a2d3a',
  borderRadius: 8, padding: '8px 12px', fontSize: 12,
}

function wr(trades: Trade[]) {
  if (!trades.length) return 0
  return Math.round(trades.filter(t => t.result === 'WIN').length / trades.length * 1000) / 10
}

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round(n / d * 1000) / 10
}

const colour = (v: number) =>
  v >= 60 ? '#22c55e' : v >= 50 ? '#6366f1' : v >= 40 ? '#eab308' : '#ef4444'

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: sub ? 4 : '1rem' }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginBottom: '1rem' }}>{sub}</div>}
      {children}
    </div>
  )
}

function MiniBar({ data, dataKey = 'wr' }: { data: { name: string; wr: number; count: number }[]; dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={32}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
        <Tooltip contentStyle={TipStyle}
          formatter={((v: any, _n: any, p: any) => [`${v}% (${p?.payload?.count ?? 0} trades)`, 'Win Rate']) as Fmt} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={colour(d.wr)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function SelfLearning({ trades }: Props) {
  // Only trades that have the new columns
  const enriched = trades.filter(t => t.regime !== null && t.regime !== undefined)
  const hasData  = enriched.length >= 3

  // ── 1. Win rate by regime ──────────────────────────────────────────────
  const regimeOrder = ['TRENDING_BULL', 'TRENDING_BEAR', 'TRENDING', 'RANGING', 'VOLATILE', 'QUIET']
  const regimeMap: Record<string, Trade[]> = {}
  enriched.forEach(t => {
    const k = t.regime || 'UNKNOWN'
    if (!regimeMap[k]) regimeMap[k] = []
    regimeMap[k].push(t)
  })
  const regimeData = regimeOrder
    .filter(r => regimeMap[r]?.length)
    .map(r => ({ name: r.replace('TRENDING_', 'T_'), wr: wr(regimeMap[r]), count: regimeMap[r].length }))

  // ── 2. HTF alignment — WITH vs AGAINST vs NEUTRAL ─────────────────────
  const withTrend: Trade[] = [], againstTrend: Trade[] = [], neutralTrades: Trade[] = []
  enriched.forEach(t => {
    const bias = t.trend_bias || 'NEUTRAL'
    const dir  = t.direction
    const isCallBull = dir === 'CALL' && bias === 'BULLISH'
    const isPutBear  = dir === 'PUT'  && bias === 'BEARISH'
    const isCallBear = dir === 'CALL' && bias === 'BEARISH'
    const isPutBull  = dir === 'PUT'  && bias === 'BULLISH'
    if (isCallBull || isPutBear) withTrend.push(t)
    else if (isCallBear || isPutBull) againstTrend.push(t)
    else neutralTrades.push(t)
  })
  const alignData = [
    { name: '✅ With Trend',    wr: wr(withTrend),    count: withTrend.length },
    { name: '⚠️ Against Trend', wr: wr(againstTrend), count: againstTrend.length },
    { name: '↔️ Neutral HTF',   wr: wr(neutralTrades), count: neutralTrades.length },
  ].filter(d => d.count > 0)

  // ── 3. SMC score impact (0 = no SMC, 1-2, 3-4, 5-6) ──────────────────
  const smcBands = [
    { label: '0 (none)', min: 0, max: 0 },
    { label: '1–2',      min: 1, max: 2 },
    { label: '3–4',      min: 3, max: 4 },
    { label: '5–6 (max)',min: 5, max: 6 },
  ]
  const smcData = smcBands.map(b => {
    const g = enriched.filter(t => (t.smc_score ?? 0) >= b.min && (t.smc_score ?? 0) <= b.max)
    return { name: b.label, wr: wr(g), count: g.length }
  }).filter(d => d.count > 0)

  // ── 4. P/D zone win rate ───────────────────────────────────────────────
  const pdOrder = ['DEEP_DISCOUNT', 'DISCOUNT', 'EQUILIBRIUM', 'PREMIUM', 'DEEP_PREMIUM']
  const pdMap: Record<string, Trade[]> = {}
  enriched.forEach(t => { const k = t.pd_zone || 'UNKNOWN'; if (!pdMap[k]) pdMap[k] = []; pdMap[k].push(t) })
  const pdData = pdOrder
    .filter(p => pdMap[p]?.length)
    .map(p => ({ name: p.replace('_', '\n'), wr: wr(pdMap[p]), count: pdMap[p].length }))

  // ── 5. SMC signal attribution (wins vs losses avg layer) ──────────────
  const wins   = enriched.filter(t => t.result === 'WIN')
  const losses = enriched.filter(t => t.result === 'LOSS')
  const avg    = (ts: Trade[], key: keyof Trade) =>
    ts.length ? +(ts.reduce((s, t) => s + ((t[key] as number) ?? 0), 0) / ts.length).toFixed(2) : 0

  const layerData = wins.length && losses.length ? [
    { layer: 'Technical', wins: avg(wins, 'tech_score'), losses: avg(losses, 'tech_score') },
    { layer: 'Box/S&R',   wins: avg(wins, 'box_score'),  losses: avg(losses, 'box_score')  },
    { layer: 'Deviation', wins: avg(wins, 'dev_score'),  losses: avg(losses, 'dev_score')  },
    { layer: 'SMC/ICT',   wins: avg(wins, 'smc_score'),  losses: avg(losses, 'smc_score')  },
  ] : []

  // ── 6. Individual SMC signal win rates ────────────────────────────────
  const smcSignals = [
    { label: 'FVG',          filter: (t: Trade) => t.fvg_hit === true },
    { label: 'Order Block',  filter: (t: Trade) => t.ob_hit === true },
    { label: 'BOS',          filter: (t: Trade) => t.bos !== 'none' && t.bos !== null },
    { label: 'Sweep',        filter: (t: Trade) => t.sweep !== 'none' && t.sweep !== null },
    { label: 'OTE',          filter: (t: Trade) => t.ote !== 'none' && t.ote !== null },
    { label: 'Displacement', filter: (t: Trade) => t.displacement !== 'none' && t.displacement !== null },
    { label: 'EQH/EQL',      filter: (t: Trade) => (t.eqh_hit || t.eql_hit) === true },
  ]
  const signalData = smcSignals
    .map(s => {
      const g = enriched.filter(s.filter)
      return { name: s.label, wr: wr(g), count: g.length }
    })
    .filter(d => d.count >= 2)
    .sort((a, b) => b.wr - a.wr)

  // ── 7. OTE accuracy ───────────────────────────────────────────────────
  const oteTrades    = enriched.filter(t => t.ote !== 'none' && t.ote !== null)
  const nonOteTrades = enriched.filter(t => !t.ote || t.ote === 'none')
  const oteData = [
    { name: 'OTE Entry',     wr: wr(oteTrades),    count: oteTrades.length },
    { name: 'Standard Entry',wr: wr(nonOteTrades), count: nonOteTrades.length },
  ].filter(d => d.count > 0)

  // ── Learning insights ─────────────────────────────────────────────────
  const insights: { icon: string; text: string; good: boolean }[] = []

  if (withTrend.length >= 3 && againstTrend.length >= 3) {
    const diff = wr(withTrend) - wr(againstTrend)
    if (diff > 10)
      insights.push({ icon: '✅', text: `Trading WITH the HTF trend wins ${wr(withTrend)}% vs ${wr(againstTrend)}% against it — trend alignment is a real edge (+${diff.toFixed(1)}%)`, good: true })
    else if (diff < -10)
      insights.push({ icon: '⚠️', text: `Counter-trend trades are surprisingly outperforming (${wr(againstTrend)}% vs ${wr(withTrend)}%) — worth monitoring`, good: false })
    else
      insights.push({ icon: 'ℹ️', text: `No significant difference between WITH and AGAINST trend yet (${wr(withTrend)}% vs ${wr(againstTrend)}%) — need more data`, good: true })
  }

  const smcTrades    = enriched.filter(t => (t.smc_score ?? 0) > 0)
  const nonSmcTrades = enriched.filter(t => (t.smc_score ?? 0) === 0)
  if (smcTrades.length >= 3 && nonSmcTrades.length >= 3) {
    const smcWr    = wr(smcTrades)
    const nonSmcWr = wr(nonSmcTrades)
    if (smcWr > nonSmcWr + 8)
      insights.push({ icon: '🧠', text: `SMC signals are working! Trades with SMC confluence: ${smcWr}% win rate vs ${nonSmcWr}% without. The institutional analysis is adding real edge.`, good: true })
    else if (smcWr < nonSmcWr - 8)
      insights.push({ icon: '⚠️', text: `SMC signals aren't helping yet — trades with SMC score ${smcWr}% vs ${nonSmcWr}% without. May need more data.`, good: false })
    else
      insights.push({ icon: 'ℹ️', text: `SMC and non-SMC trades performing similarly (${smcWr}% vs ${nonSmcWr}%) — edge not yet confirmed, keep collecting data.`, good: true })
  }

  const bestRegime = regimeData.sort((a, b) => b.wr - a.wr)[0]
  const worstRegime = [...regimeData].sort((a, b) => a.wr - b.wr)[0]
  if (bestRegime && worstRegime && bestRegime.name !== worstRegime.name && bestRegime.count >= 3)
    insights.push({ icon: '🎯', text: `Best regime: ${bestRegime.name} at ${bestRegime.wr}% win rate (${bestRegime.count} trades). Worst: ${worstRegime.name} at ${worstRegime.wr}%.`, good: bestRegime.wr >= 55 })

  if (oteTrades.length >= 3) {
    const oteWr = wr(oteTrades)
    insights.push({ icon: oteWr >= 60 ? '✅' : oteWr >= 50 ? 'ℹ️' : '⚠️', text: `OTE entries: ${oteWr}% win rate over ${oteTrades.length} trades — ${oteWr >= 60 ? 'high-precision entries confirmed' : oteWr >= 50 ? 'edge not yet clear' : 'underperforming — check OTE thresholds'}`, good: oteWr >= 55 })
  }

  const noDataMsg = (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Waiting for v5.11 trade data</div>
      <div style={{ fontSize: 13 }}>
        {trades.length > 0
          ? `${trades.length} historical trades exist but predate the new columns. New learning data starts from the next trade.`
          : 'No trades yet. The bot will populate this tab as it trades.'}
      </div>
    </div>
  )

  return (
    <div>
      {/* Learning insights */}
      {insights.length > 0 && (
        <Section title="🤖 What The Bot Is Learning">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
      )}

      {!hasData && noDataMsg}

      {hasData && (
        <>
          {/* Row 1: Regime + HTF alignment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <Section title="Win Rate by Market Regime" sub="Which market condition does the bot perform best in?">
              {regimeData.length < 2
                ? <div style={{ color: '#64748b', fontSize: 13 }}>Need more regime variety — keep running.</div>
                : <MiniBar data={regimeData} />}
            </Section>

            <Section title="HTF Trend Alignment" sub="Does trading WITH the 1H+4H trend actually improve results?">
              {alignData.length < 2
                ? <div style={{ color: '#64748b', fontSize: 13 }}>Need trades in multiple trend directions.</div>
                : <MiniBar data={alignData} />}
            </Section>
          </div>

          {/* Row 2: SMC score impact + P/D zone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <Section title="SMC Score Impact" sub="Does higher SMC confluence actually win more?">
              {smcData.length < 2
                ? <div style={{ color: '#64748b', fontSize: 13 }}>Need trades at different SMC levels.</div>
                : <MiniBar data={smcData} />}
            </Section>

            <Section title="Premium / Discount Zone" sub="Buying in discount, selling in premium — does ICT theory hold?">
              {pdData.length < 2
                ? <div style={{ color: '#64748b', fontSize: 13 }}>Need trades across different P/D zones.</div>
                : <MiniBar data={pdData} />}
            </Section>
          </div>

          {/* Row 3: Signal attribution (wins vs losses) + OTE */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <Section title="Score Layer — Avg Points on Wins vs Losses" sub="Which scoring layers actually differentiate winning trades?">
              {layerData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={layerData} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                    <XAxis dataKey="layer" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={TipStyle} />
                    <Bar dataKey="wins"   name="Wins"   fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: '#64748b', fontSize: 13 }}>Need wins and losses.</div>
              )}
            </Section>

            <Section title="OTE vs Standard Entry" sub="Is the 61.8-78.6% fib entry more accurate?">
              {oteData.length < 2
                ? <div style={{ color: '#64748b', fontSize: 13 }}>Need OTE + non-OTE data.</div>
                : <MiniBar data={oteData} />}
            </Section>
          </div>

          {/* Row 4: Individual SMC signal win rates */}
          {signalData.length >= 2 && (
            <Section title="Individual SMC Signal Win Rate" sub="Which Smart Money signal is most accurate when it fires? (min 2 trades shown)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={signalData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                  <Tooltip contentStyle={TipStyle}
                    formatter={((v: any, _n: any, p: any) => [`${v}% (${p?.payload?.count ?? 0} trades)`, 'Win Rate']) as Fmt} />
                  <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
                    {signalData.map((d, i) => <Cell key={i} fill={colour(d.wr)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>
                Signals above 60% are proving their edge. Below 50% need investigation — the bot will naturally use them less as Kelly adjusts.
              </div>
            </Section>
          )}

          {/* Data coverage notice */}
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '1rem 1.25rem', fontSize: 12, color: '#94a3b8' }}>
            📊 <strong style={{ color: '#e2e8f0' }}>Self-learning data:</strong> {enriched.length} of {trades.length} trades have full v5.11 analytics.
            {trades.length > enriched.length && ` ${trades.length - enriched.length} earlier trades are pre-v5.11 and show as legacy data in other tabs.`}
            {' '}Charts become statistically meaningful at 20+ trades per category.
          </div>
        </>
      )}
    </div>
  )
}
