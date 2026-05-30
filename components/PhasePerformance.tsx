'use client'
import { Trade } from '@/lib/supabase'

const PHASES = [
  'PULLBACK_BULL', 'MARKUP', 'DISTRIBUTION',
  'PULLBACK_BEAR', 'MARKDOWN', 'ACCUMULATION', 'RANGING'
]

const PHASE_COLORS: Record<string, { bar: string; bg: string; label: string }> = {
  PULLBACK_BULL:  { bar: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Pullback Bull' },
  MARKUP:         { bar: '#86efac', bg: 'rgba(134,239,172,0.1)', label: 'Markup' },
  DISTRIBUTION:   { bar: '#f97316', bg: 'rgba(249,115,22,0.1)',  label: 'Distribution' },
  PULLBACK_BEAR:  { bar: '#fb923c', bg: 'rgba(251,146,60,0.1)',  label: 'Pullback Bear' },
  MARKDOWN:       { bar: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Markdown' },
  ACCUMULATION:   { bar: '#eab308', bg: 'rgba(234,179,8,0.1)',   label: 'Accumulation' },
  RANGING:        { bar: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Ranging' },
}

interface PhaseStats {
  phase: string
  total: number
  wins: number
  wr: number
  multEV: number
  callWr: number
  putWr: number
}

function derivePhase(r: Trade): string {
  const htf = r.trend_bias || ''
  const z   = r.z_score ?? 0
  const pd  = (r as any).pd_zone || ''
  const discount = pd.includes('DISCOUNT') || z < -0.5
  const premium  = pd.includes('PREMIUM')  || z >  0.5

  if (htf === 'BULLISH') {
    if (discount) return 'PULLBACK_BULL'
    if (premium)  return 'DISTRIBUTION'
    return 'MARKUP'
  }
  if (htf === 'BEARISH') {
    if (premium)  return 'PULLBACK_BEAR'
    if (discount) return 'ACCUMULATION'
    return 'MARKDOWN'
  }
  return 'RANGING'
}

export default function PhasePerformance({ trades }: { trades: Trade[] }) {
  if (!trades.length) return null

  const stats: PhaseStats[] = PHASES.map(phase => {
    const subset   = trades.filter(t => derivePhase(t) === phase)
    const wins     = subset.filter(t => t.result === 'WIN').length
    const losses   = subset.length - wins
    const wr       = subset.length ? Math.round(wins / subset.length * 1000) / 10 : 0
    const multEV   = Math.round((wins * 0.70 - losses * 0.35) * 10) / 10
    const calls    = subset.filter(t => t.direction === 'CALL')
    const puts     = subset.filter(t => t.direction === 'PUT')
    const callWins = calls.filter(t => t.result === 'WIN').length
    const putWins  = puts.filter(t => t.result === 'WIN').length
    return {
      phase,
      total:   subset.length,
      wins,
      wr,
      multEV,
      callWr: calls.length ? Math.round(callWins / calls.length * 1000) / 10 : 0,
      putWr:  puts.length  ? Math.round(putWins  / puts.length  * 1000) / 10 : 0,
    }
  }).filter(s => s.total >= 5)

  const maxWr = Math.max(...stats.map(s => s.wr), 70)

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12,
      padding: '1.5rem', marginBottom: '1.5rem' }}>

      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        📊 Win Rate by Market Phase
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: '1.25rem' }}>
        The phase drives outcome — not the score. This is the real predictor.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stats.sort((a, b) => b.wr - a.wr).map(s => {
          const c = PHASE_COLORS[s.phase]
          const be = 33.3
          const profitable = s.wr >= be

          return (
            <div key={s.phase} style={{ background: c.bg, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: c.bar }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.total} trades</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    CALL {s.callWr}% · PUT {s.putWr}%
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14,
                    color: s.multEV > 0 ? '#22c55e' : '#ef4444' }}>
                    EV ${s.multEV > 0 ? '+' : ''}{s.multEV}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: c.bar,
                    minWidth: 48, textAlign: 'right' }}>
                    {s.wr}%
                  </div>
                </div>
              </div>

              {/* WR bar */}
              <div style={{ background: '#0f1117', borderRadius: 4, height: 8, position: 'relative' }}>
                {/* breakeven line at 33.3% */}
                <div style={{ position: 'absolute', left: `${be / maxWr * 100}%`,
                  width: 1, height: 8, background: '#475569', zIndex: 2 }} />
                <div style={{
                  width: `${Math.min(s.wr / maxWr * 100, 100)}%`,
                  height: 8, borderRadius: 4,
                  background: c.bar,
                  opacity: 0.85,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: 10, color: '#475569', marginTop: 3 }}>
                <span>0%</span>
                <span style={{ color: '#475569' }}>▲ 33.3% BE (multiplier)</span>
                <span>{maxWr}%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#475569',
        borderTop: '1px solid #1e293b', paddingTop: 10 }}>
        EV = expected profit per $1 stake at 1:2 RR (SL=$0.35, TP=$0.70).
        Breakeven = 33.3% WR.
        Phase derived from htf_bias + z_score.
      </div>
    </div>
  )
}
