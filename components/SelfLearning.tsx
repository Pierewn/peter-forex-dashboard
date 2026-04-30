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

function wr(ts: Trade[]) {
  if (!ts.length) return 0
  return Math.round(ts.filter(t => t.result === 'WIN').length / ts.length * 1000) / 10
}

const colour = (v: number) =>
  v >= 60 ? '#22c55e' : v >= 50 ? '#6366f1' : v >= 40 ? '#eab308' : '#ef4444'

function Section({ title, sub, badge, children }: {
  title: string; sub?: string; badge?: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sub ? 4 : '1rem' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {title}
        </div>
        {badge && (
          <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#a78bfa', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
            {badge}
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginBottom: '1rem' }}>{sub}</div>}
      {children}
    </div>
  )
}

function MiniBar({ data }: { data: { name: string; wr: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={32}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
        <Tooltip contentStyle={TipStyle}
          formatter={((v: any, _n: any, p: any) => [`${v}% (${p?.payload?.count ?? 0} trades)`, 'Win Rate']) as Fmt} />
        <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={colour(d.wr)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function Pending({ msg }: { msg: string }) {
  return (
    <div style={{ color: '#64748b', fontSize: 13, padding: '1.5rem 0', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
      {msg}
    </div>
  )
}

// ── Time-of-day heatmap ────────────────────────────────────────────────────
function TimeOfDayChart({ trades }: { trades: Trade[] }) {
  const withHour = trades.filter(t => t.hour !== null && t.hour !== undefined)
  if (withHour.length < 5) return (
    <Section title="⏰ Win Rate by Hour (UTC)" badge="v5.12+" sub="Which time windows does the bot perform best in?">
      <Pending msg="Needs v5.12+ trades with hour data — building up..." />
    </Section>
  )
  const buckets: Record<string, Trade[]> = {
    '00–04': [], '04–08': [], '08–12': [],
    '12–16': [], '16–20': [], '20–24': [],
  }
  withHour.forEach(t => {
    const h = t.hour as number
    if (h < 4) buckets['00–04'].push(t)
    else if (h < 8)  buckets['04–08'].push(t)
    else if (h < 12) buckets['08–12'].push(t)
    else if (h < 16) buckets['12–16'].push(t)
    else if (h < 20) buckets['16–20'].push(t)
    else buckets['20–24'].push(t)
  })
  const data = Object.entries(buckets).filter(([, ts]) => ts.length > 0)
    .map(([b, ts]) => ({ name: b, wr: wr(ts), count: ts.length }))
  return (
    <Section title="⏰ Win Rate by Hour (UTC)" badge="v5.12+" sub="Which time windows does the bot perform best in?">
      <MiniBar data={data} />
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
        London: 08–17 UTC · NY: 13–22 UTC · Forex session filter auto-activates at v6.0
      </div>
    </Section>
  )
}

// ── Stake efficiency ───────────────────────────────────────────────────────
function StakeEfficiencyChart({ trades }: { trades: Trade[] }) {
  if (trades.length < 5) return (
    <Section title="💰 Stake Efficiency" sub="Does Kelly sizing higher-confidence trades actually win more?">
      <Pending msg="Need more trades." />
    </Section>
  )
  const stakes = trades.map(t => t.stake).filter(Boolean).sort((a, b) => a - b)
  const p25 = stakes[Math.floor(stakes.length * 0.25)]
  const p75 = stakes[Math.floor(stakes.length * 0.75)]
  const bands = [
    { label: `Low  ≤$${p25.toFixed(2)}`,  filter: (t: Trade) => t.stake <= p25 },
    { label: `Mid  $${p25.toFixed(2)}–$${p75.toFixed(2)}`, filter: (t: Trade) => t.stake > p25 && t.stake <= p75 },
    { label: `High >$${p75.toFixed(2)}`,  filter: (t: Trade) => t.stake > p75 },
  ]
  const data = bands.map(b => {
    const g = trades.filter(b.filter)
    return { name: b.label, wr: wr(g), count: g.length }
  }).filter(d => d.count > 0)
  return (
    <Section title="💰 Stake Efficiency" sub="Does Kelly sizing higher-confidence trades actually win more?">
      <MiniBar data={data} />
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
        If high-stake trades win less, Kelly is over-sizing — confidence thresholds may need tuning.
      </div>
    </Section>
  )
}

export default function SelfLearning({ trades }: Props) {
  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
      <div style={{ fontWeight: 700 }}>No trades yet — the bot will populate this tab as it trades.</div>
    </div>
  )

  // Split into enriched (v5.11+ columns present) vs legacy
  const enriched = trades.filter(t => t.regime !== null && t.regime !== undefined)
  const legacy   = trades.filter(t => t.regime === null  || t.regime === undefined)

  // ── All-trades data (works with every row) ────────────────────────────
  const allWins   = trades.filter(t => t.result === 'WIN')
  const allLosses = trades.filter(t => t.result === 'LOSS')

  const avg = (ts: Trade[], key: keyof Trade) =>
    ts.length ? +(ts.reduce((s, t) => s + ((t[key] as number) ?? 0), 0) / ts.length).toFixed(2) : 0

  // Layer chart — tech/box/dev work on ALL trades; SMC is 0 for legacy (correct)
  const layerData = allWins.length >= 2 && allLosses.length >= 2 ? [
    { layer: 'Technical', wins: avg(allWins, 'tech_score'), losses: avg(allLosses, 'tech_score') },
    { layer: 'Box/S&R',   wins: avg(allWins, 'box_score'),  losses: avg(allLosses, 'box_score')  },
    { layer: 'Deviation', wins: avg(allWins, 'dev_score'),  losses: avg(allLosses, 'dev_score')  },
    { layer: 'SMC/ICT',   wins: avg(allWins, 'smc_score'),  losses: avg(allLosses, 'smc_score')  },
  ] : []

  // ADX-estimated regime for ALL trades (best-effort for legacy rows)
  const adxRegimeData = (() => {
    const buckets = [
      { name: 'Quiet\n<20',    filter: (t: Trade) => t.adx < 20 },
      { name: 'Ranging\n20–25', filter: (t: Trade) => t.adx >= 20 && t.adx < 25 },
      { name: 'Trending\n25–30',filter: (t: Trade) => t.adx >= 25 && t.adx < 30 },
      { name: 'Strong\n30+',   filter: (t: Trade) => t.adx >= 30 },
    ]
    return buckets.map(b => {
      const g = trades.filter(b.filter)
      return { name: b.name, wr: wr(g), count: g.length }
    }).filter(d => d.count > 0)
  })()

  // ── Enriched-only data ────────────────────────────────────────────────
  const eWins   = enriched.filter(t => t.result === 'WIN')
  const eLosses = enriched.filter(t => t.result === 'LOSS')

  const regimeOrder = ['TRENDING_BULL', 'TRENDING_BEAR', 'TRENDING', 'RANGING', 'VOLATILE', 'QUIET']
  const regimeMap: Record<string, Trade[]> = {}
  enriched.forEach(t => { const k = t.regime!; if (!regimeMap[k]) regimeMap[k] = []; regimeMap[k].push(t) })
  const regimeData = regimeOrder.filter(r => regimeMap[r]?.length)
    .map(r => ({ name: r.replace('TRENDING_', 'T_'), wr: wr(regimeMap[r]), count: regimeMap[r].length }))

  const withTrend: Trade[] = [], againstTrend: Trade[] = [], neutralTrades: Trade[] = []
  enriched.forEach(t => {
    const bias = t.trend_bias || 'NEUTRAL'
    const dir  = t.direction
    if ((dir === 'CALL' && bias === 'BULLISH') || (dir === 'PUT' && bias === 'BEARISH')) withTrend.push(t)
    else if ((dir === 'CALL' && bias === 'BEARISH') || (dir === 'PUT' && bias === 'BULLISH')) againstTrend.push(t)
    else neutralTrades.push(t)
  })
  const alignData = [
    { name: '✅ With Trend',    wr: wr(withTrend),     count: withTrend.length },
    { name: '⚠️ Against',       wr: wr(againstTrend),  count: againstTrend.length },
    { name: '↔️ Neutral',       wr: wr(neutralTrades), count: neutralTrades.length },
  ].filter(d => d.count > 0)

  const smcBands = [
    { label: '0 pts',    min: 0, max: 0 },
    { label: '1–2 pts',  min: 1, max: 2 },
    { label: '3–4 pts',  min: 3, max: 4 },
    { label: '5–6 pts',  min: 5, max: 6 },
  ]
  const smcData = smcBands.map(b => {
    const g = enriched.filter(t => (t.smc_score ?? 0) >= b.min && (t.smc_score ?? 0) <= b.max)
    return { name: b.label, wr: wr(g), count: g.length }
  }).filter(d => d.count > 0)

  const pdOrder = ['DEEP_DISCOUNT', 'DISCOUNT', 'EQUILIBRIUM', 'PREMIUM', 'DEEP_PREMIUM']
  const pdMap: Record<string, Trade[]> = {}
  enriched.forEach(t => { const k = t.pd_zone || 'UNKNOWN'; if (!pdMap[k]) pdMap[k] = []; pdMap[k].push(t) })
  const pdData = pdOrder.filter(p => pdMap[p]?.length)
    .map(p => ({ name: p.replace('DEEP_', 'D.').replace('_', '\n'), wr: wr(pdMap[p]), count: pdMap[p].length }))

  const oteTrades    = enriched.filter(t => t.ote && t.ote !== 'none')
  const nonOteTrades = enriched.filter(t => !t.ote || t.ote === 'none')
  const oteData = [
    { name: 'OTE Entry',      wr: wr(oteTrades),    count: oteTrades.length },
    { name: 'Standard Entry', wr: wr(nonOteTrades), count: nonOteTrades.length },
  ].filter(d => d.count > 0)

  const smcSignals = [
    { label: 'FVG',          f: (t: Trade) => t.fvg_hit === true },
    { label: 'Order Block',  f: (t: Trade) => t.ob_hit  === true },
    { label: 'BOS',          f: (t: Trade) => !!t.bos  && t.bos  !== 'none' },
    { label: 'Sweep',        f: (t: Trade) => !!t.sweep && t.sweep !== 'none' },
    { label: 'OTE',          f: (t: Trade) => !!t.ote  && t.ote  !== 'none' },
    { label: 'Displacement', f: (t: Trade) => !!t.displacement && t.displacement !== 'none' },
    { label: 'EQH/EQL',      f: (t: Trade) => !!(t.eqh_hit || t.eql_hit) },
  ]
  const signalData = smcSignals
    .map(s => { const g = enriched.filter(s.f); return { name: s.label, wr: wr(g), count: g.length } })
    .filter(d => d.count >= 2).sort((a, b) => b.wr - a.wr)

  // ── Duration analytics (v6.2+) ────────────────────────────────────────
  const withDuration = trades.filter(t => t.duration !== null && t.duration !== undefined)
  const durationData = [5, 7, 10]
    .map(d => {
      const g = withDuration.filter(t => t.duration === d)
      return { name: `${d} min`, wr: wr(g), count: g.length }
    })
    .filter(d => d.count > 0)

  // Duration split by regime — does 10-min help in trending markets?
  const enrichedWithDur = enriched.filter(t => t.duration !== null && t.duration !== undefined)
  const durRegimeData = regimeOrder
    .filter(r => regimeMap[r]?.length >= 2)
    .map(r => {
      const rt = regimeMap[r].filter(t => t.duration !== null && t.duration !== undefined)
      const d5  = rt.filter(t => t.duration === 5)
      const d10 = rt.filter(t => t.duration === 10)
      return {
        regime: r.replace('TRENDING_', 'T_').replace('TRENDING', 'TREND'),
        '5min':  d5.length  >= 2 ? wr(d5)  : null,
        '10min': d10.length >= 2 ? wr(d10) : null,
        total: rt.length,
      }
    })
    .filter(d => d.total >= 2)

  // ── Insights ──────────────────────────────────────────────────────────
  const insights: { icon: string; text: string; good: boolean }[] = []

  // Duration insight
  if (durationData.length >= 2) {
    const best = [...durationData].sort((a, b) => b.wr - a.wr)[0]
    const worst = [...durationData].sort((a, b) => a.wr - b.wr)[0]
    if (best.name !== worst.name && best.count >= 3) {
      insights.push({
        icon: '🕐',
        text: `Best trade duration: ${best.name} at ${best.wr}% win rate (${best.count} trades). ${worst.name} trades win only ${worst.wr}%. The nightly recalibration uses this — if ${worst.name} keeps underperforming, dynamic duration will route fewer trades there.`,
        good: best.wr >= 55,
      })
    }
  }

  if (withTrend.length >= 3 && againstTrend.length >= 3) {
    const diff = wr(withTrend) - wr(againstTrend)
    if (Math.abs(diff) > 10)
      insights.push({ icon: diff > 0 ? '✅' : '⚠️',
        text: `Trading ${diff > 0 ? 'WITH' : 'AGAINST'} the HTF trend is performing better (${Math.max(wr(withTrend), wr(againstTrend))}% vs ${Math.min(wr(withTrend), wr(againstTrend))}%) — ${diff > 0 ? 'trend alignment confirmed' : 'worth investigating'}.`,
        good: diff > 0 })
  }

  const smcT = enriched.filter(t => (t.smc_score ?? 0) > 0)
  const nonSmc = enriched.filter(t => (t.smc_score ?? 0) === 0)
  if (smcT.length >= 3 && nonSmc.length >= 3) {
    const diff = wr(smcT) - wr(nonSmc)
    insights.push({ icon: diff > 8 ? '🧠' : diff < -8 ? '⚠️' : 'ℹ️',
      text: `SMC confluence: ${wr(smcT)}% win rate (${smcT.length} trades) vs ${wr(nonSmc)}% without (${nonSmc.length} trades). ${diff > 8 ? 'The institutional layer is adding real edge.' : diff < -8 ? 'SMC not yet helping — needs more data.' : 'Edge not yet confirmed — keep collecting data.'}`,
      good: diff > 0 })
  }

  const bestR = [...regimeData].sort((a, b) => b.wr - a.wr)[0]
  const worstR = [...regimeData].sort((a, b) => a.wr - b.wr)[0]
  if (bestR && worstR && bestR.name !== worstR.name && bestR.count >= 3)
    insights.push({ icon: '🎯',
      text: `Best regime: ${bestR.name} at ${bestR.wr}% (${bestR.count} trades). Worst: ${worstR.name} at ${worstR.wr}%.`,
      good: bestR.wr >= 55 })

  // Legacy notice badge
  const legacyNote = legacy.length > 0 && (
    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8', marginBottom: '1.25rem' }}>
      📊 <strong style={{ color: '#e2e8f0' }}>{trades.length} total trades:</strong>{' '}
      {enriched.length > 0
        ? <><strong style={{ color: '#22c55e' }}>{enriched.length} enriched</strong> (v5.11+ full analytics) + <strong style={{ color: '#64748b' }}>{legacy.length} legacy</strong> (pre-v5.11, partial data).</>
        : <><strong style={{ color: '#eab308' }}>{legacy.length} legacy trades</strong> — pre-v5.11. Charts using existing columns are shown below. SMC/regime/HTF charts populate from the next trade.</>
      }{' '}Charts become statistically meaningful at 20+ trades per category.
    </div>
  )

  return (
    <div>
      {legacyNote}

      {/* Insights — only when enriched data exists */}
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

      {/* ── Row 1: Layer chart (ALL trades) + Stake efficiency (ALL trades) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <Section title="Score Layer — Avg Points on Wins vs Losses"
          sub="Which indicator layers actually differentiate winning trades? (all trades)">
          {layerData.length > 0 ? (
            <>
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
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                SMC/ICT column shows 0 for pre-v5.11 trades — will fill as new trades come in.
              </div>
            </>
          ) : (
            <Pending msg="Need both wins and losses to compare." />
          )}
        </Section>
        <StakeEfficiencyChart trades={trades} />
      </div>

      {/* ── Row 2: ADX regime estimate (ALL trades) + HTF alignment (enriched) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <Section title="Win Rate by ADX Regime" sub="Estimated from ADX — all trades. Exact regime label available from v5.11+.">
          {adxRegimeData.length >= 2
            ? <MiniBar data={adxRegimeData} />
            : <Pending msg="Need more ADX variety." />}
        </Section>

        <Section title="HTF Trend Alignment" badge="v5.11+" sub="Does trading WITH the 1H+4H trend actually improve results?">
          {enriched.length < 5
            ? <Pending msg={`${enriched.length} enriched trades so far — builds from next trade.`} />
            : alignData.length < 2
              ? <Pending msg="Need trades in multiple trend directions." />
              : <MiniBar data={alignData} />}
        </Section>
      </div>

      {/* ── Row 2b: Duration analytics (v6.2+) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <Section title="🕐 Win Rate by Trade Duration" badge="v6.2+" sub="5 min (ranging), 7 min (trending), 10 min (strong trend / high score) — which wins more?">
          {withDuration.length < 5
            ? <Pending msg="Needs v6.2+ trades with duration data — collecting now." />
            : durationData.length < 2
              ? <Pending msg="Need trades at multiple durations." />
              : (
                <>
                  <MiniBar data={durationData} />
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    5 min = RANGING (fast mean-reversion) · 7–10 min = TRENDING (trend needs time to play out)
                  </div>
                </>
              )
          }
        </Section>

        <Section title="🎯 Duration vs Regime" badge="v6.2+" sub="Does giving trending trades more time actually improve win rate?">
          {enrichedWithDur.length < 5
            ? <Pending msg="Needs enriched v6.2+ trades — collecting now." />
            : durRegimeData.length < 2
              ? <Pending msg="Need multiple regimes with duration data." />
              : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={durRegimeData} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                      <XAxis dataKey="regime" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                      <Tooltip contentStyle={TipStyle} />
                      <Bar dataKey="5min"  name="5 min"  fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="10min" name="10 min" fill="#22c55e" radius={[4,4,0,0]} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    If 10 min &gt; 5 min in TRENDING regimes, the dynamic duration logic is proven.
                  </div>
                </>
              )
          }
        </Section>
      </div>

      {/* ── Row 3: SMC score impact + P/D zone (enriched) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <Section title="SMC Score Impact" badge="v5.11+" sub="Does higher SMC confluence actually win more?">
          {enriched.length < 5
            ? <Pending msg={`${enriched.length} enriched trades — builds from next trade.`} />
            : smcData.length < 2
              ? <Pending msg="Need trades at different SMC levels." />
              : <MiniBar data={smcData} />}
        </Section>

        <Section title="Premium / Discount Zone" badge="v5.11+" sub="Buying in discount, selling in premium — does ICT theory hold?">
          {enriched.length < 5
            ? <Pending msg={`${enriched.length} enriched trades — builds from next trade.`} />
            : pdData.length < 2
              ? <Pending msg="Need trades across P/D zones." />
              : <MiniBar data={pdData} />}
        </Section>
      </div>

      {/* ── Row 4: Exact regime (enriched) + OTE (enriched) ── */}
      {enriched.length >= 5 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <Section title="Win Rate by Exact Regime" badge="v5.11+" sub="4-state MRD: which regime is the bot actually profitable in?">
            {regimeData.length < 2
              ? <Pending msg="Need more regime variety." />
              : <MiniBar data={regimeData} />}
          </Section>

          <Section title="OTE vs Standard Entry" badge="v5.11+" sub="Is the 61.8–78.6% fib entry more accurate?">
            {oteData.length < 2
              ? <Pending msg="Need OTE + non-OTE data." />
              : <MiniBar data={oteData} />}
          </Section>
        </div>
      )}

      {/* ── Row 5: Individual SMC signals (enriched) ── */}
      {signalData.length >= 2 && (
        <Section title="Individual SMC Signal Win Rate" badge="v5.11+"
          sub="Which Smart Money signal is most accurate when it fires? (min 2 trades shown)">
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
            Signals above 60% are proving their edge. Below 50% need investigation.
          </div>
        </Section>
      )}

      {/* ── Row 6: Time-of-day + Stake efficiency ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <TimeOfDayChart trades={trades} />
        <StakeEfficiencyChart trades={trades} />
      </div>
    </div>
  )
}
