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

// Parse phase from the `reasons` field (stored as "...phase=DISTRIBUTION...")
// Falls back to deriving from htf_bias + z_score for older trades
function derivePhase(r: Trade): string {
  // Try to extract from `reasons` column first (v15.x bot stores it there)
  if (r.reasons) {
    const match = r.reasons.match(/phase[=:]\s*([A-Z_]+)/i)
    if (match) return match[1].toUpperCase()
  }
  // Fallback: derive from htf_bias + z_score
  const htf = r.trend_bias || r.htf_bias || ''
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

// Phases that are blocked or restricted in v15.5
const BLOCKED_COMBOS = new Set(['RANGING|CALL'])  // biggest losing pattern: 229 trades at 48% WR

function isBlocked(phase: string, direction: string): boolean {
  return BLOCKED_COMBOS.has(`${phase}|${direction}`)
}

export default function PhasePerformance({ trades }: { trades: Trade[] }) {
  if (!trades.length) return null

  const stats: PhaseStats[] = PHASES.map(phase => {
    const subset   = trades.filter(t => derivePhase(t) === phase)
    const wins     = subset.filter(t => t.result === 'WIN').length
    const losses   = subset.length - wins
    const wr       = subset.length ? Math.round(wins / subset.length * 1000) / 10 : 0
    // EV calc: binary at 92% payout (stake=1 → win $0.92, lose $1)
    const binaryEV = Math.round((wins * 0.92 - losses * 1.00) * 100) / 100
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
      multEV: binaryEV,   // show binary EV since binary is the default instrument
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
        The phase drives outcome — not the score. Best: DISTRIBUTION PUT (85% WR), PULLBACK_BEAR PUT (72% WR). Blocked: CALL+RANGING.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stats.sort((a, b) => b.wr - a.wr).map(s => {
          const c = PHASE_COLORS[s.phase]
          const be = 52.1  // binary breakeven at 92% payout
          const callBlocked = isBlocked(s.phase, 'CALL')
          const putBlocked  = isBlocked(s.phase, 'PUT')

          return (
            <div key={s.phase} style={{ background: c.bg, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: c.bar }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.total} trades</div>
                  {(callBlocked || putBlocked) && (
                    <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.2)', color: '#ef4444',
                      padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>
                      🚫 {callBlocked ? 'CALL' : 'PUT'} BLOCKED
                    </span>
                  )}
                  {s.wr >= 70 && (
                    <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
                      padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>
                      ⭐ STAR
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    <span style={{ color: callBlocked ? '#ef4444' : '#94a3b8' }}>CALL {s.callWr}%</span>
                    {' · '}
                    <span style={{ color: s.putWr >= 60 ? '#22c55e' : '#94a3b8' }}>PUT {s.putWr}%</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14,
                    color: s.multEV > 0 ? '#22c55e' : '#ef4444' }}>
                    EV {s.multEV > 0 ? '+' : ''}${s.multEV}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: c.bar,
                    minWidth: 48, textAlign: 'right' }}>
                    {s.wr}%
                  </div>
                </div>
              </div>

              {/* WR bar */}
              <div style={{ background: '#0f1117', borderRadius: 4, height: 8, position: 'relative' }}>
                {/* breakeven line at 52.1% */}
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
                <span style={{ color: '#475569' }}>▲ 52.1% BE (binary)</span>
                <span>{maxWr}%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#475569',
        borderTop: '1px solid #1e293b', paddingTop: 10 }}>
        EV = expected P&L per $1 stake on binary (92% payout): win $0.92, lose $1.00. Binary breakeven = 52.1% WR.
        Multiplier (premium) breakeven = 33.3% WR. Phase extracted from reasons column, fallback to htf_bias+z_score.
        CALL+RANGING is blocked (was 229 trades at 48% WR).
      </div>
    </div>
  )
}
