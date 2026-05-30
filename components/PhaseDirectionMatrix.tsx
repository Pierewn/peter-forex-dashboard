'use client'
import { Trade } from '@/lib/supabase'

const PHASES = ['PULLBACK_BULL','MARKUP','DISTRIBUTION','PULLBACK_BEAR','MARKDOWN','ACCUMULATION','RANGING']
const PHASE_SHORT: Record<string, string> = {
  PULLBACK_BULL: 'PB Bull', MARKUP: 'Markup', DISTRIBUTION: 'Dist.',
  PULLBACK_BEAR: 'PB Bear', MARKDOWN: 'Markdown', ACCUMULATION: 'Accum.', RANGING: 'Ranging',
}

function derivePhase(r: Trade): string {
  const htf = r.trend_bias || ''
  const z   = r.z_score ?? 0
  const pd  = (r as any).pd_zone || ''
  const disc = pd.includes('DISCOUNT') || z < -0.5
  const prem = pd.includes('PREMIUM')  || z >  0.5
  if (htf === 'BULLISH') { if (disc) return 'PULLBACK_BULL'; if (prem) return 'DISTRIBUTION'; return 'MARKUP' }
  if (htf === 'BEARISH') { if (prem) return 'PULLBACK_BEAR'; if (disc) return 'ACCUMULATION'; return 'MARKDOWN' }
  return 'RANGING'
}

function ev(wins: number, losses: number): number {
  return Math.round((wins * 0.70 - losses * 0.35) * 10) / 10
}

function cell(wins: number, total: number): { wr: number; ev: number; col: string; bg: string } {
  if (total < 5) return { wr: 0, ev: 0, col: '#334155', bg: 'transparent' }
  const wr  = Math.round(wins / total * 1000) / 10
  const evv = ev(wins, total - wins)
  const col = wr >= 65 ? '#22c55e' : wr >= 52 ? '#86efac' : wr >= 40 ? '#f97316' : '#ef4444'
  const bg  = wr >= 65 ? 'rgba(34,197,94,0.12)' : wr >= 52 ? 'rgba(134,239,172,0.07)'
             : wr >= 40 ? 'rgba(249,115,22,0.07)' : 'rgba(239,68,68,0.07)'
  return { wr, ev: evv, col, bg }
}

export default function PhaseDirectionMatrix({ trades }: { trades: Trade[] }) {
  if (!trades.length) return null

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12,
      padding: '1.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>

      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        Phase × Direction EV Matrix
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: '1.25rem' }}>
        Multiplier EV per $1 stake (SL=$0.35, TP=$0.70). Green = profitable. Min 5 trades shown.
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b',
              fontWeight: 600, borderBottom: '1px solid #1e293b' }}>Phase</th>
            {['CALL', 'PUT'].map(d => (
              <th key={d} colSpan={2} style={{ textAlign: 'center', padding: '6px 10px',
                color: d === 'CALL' ? '#22c55e' : '#f97316',
                fontWeight: 700, borderBottom: '1px solid #1e293b' }}>
                {d === 'CALL' ? '📈 CALL' : '📉 PUT'}
              </th>
            ))}
            <th style={{ textAlign: 'center', padding: '6px 10px', color: '#64748b',
              fontWeight: 600, borderBottom: '1px solid #1e293b' }}>Total</th>
          </tr>
          <tr style={{ background: '#0f1117' }}>
            <td style={{ padding: '3px 10px', color: '#475569', fontSize: 10 }}></td>
            {['CALL', 'PUT'].map(d => (
              <>
                <td key={d+'wr'} style={{ textAlign: 'center', padding: '3px 8px', color: '#475569', fontSize: 10 }}>WR%</td>
                <td key={d+'ev'} style={{ textAlign: 'center', padding: '3px 8px', color: '#475569', fontSize: 10 }}>EV$</td>
              </>
            ))}
            <td style={{ textAlign: 'center', padding: '3px 8px', color: '#475569', fontSize: 10 }}>trades</td>
          </tr>
        </thead>
        <tbody>
          {PHASES.map(phase => {
            const phaseT = trades.filter(t => derivePhase(t) === phase)
            if (!phaseT.length) return null

            const callT  = phaseT.filter(t => t.direction === 'CALL')
            const putT   = phaseT.filter(t => t.direction === 'PUT')
            const callW  = callT.filter(t => t.result === 'WIN').length
            const putW   = putT.filter(t => t.result === 'WIN').length
            const cCell  = cell(callW, callT.length)
            const pCell  = cell(putW, putT.length)

            return (
              <tr key={phase} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#e2e8f0' }}>
                  {PHASE_SHORT[phase]}
                </td>

                {/* CALL */}
                <td style={{ textAlign: 'center', padding: '8px 8px',
                  background: cCell.bg, color: cCell.col, fontWeight: 700 }}>
                  {callT.length >= 5 ? `${cCell.wr}%` : '—'}
                  {callT.length >= 5 && <div style={{ fontSize: 10, color: '#64748b' }}>{callT.length}t</div>}
                </td>
                <td style={{ textAlign: 'center', padding: '8px 8px',
                  background: cCell.bg, color: cCell.col, fontWeight: 700 }}>
                  {callT.length >= 5 ? `$${cCell.ev > 0 ? '+' : ''}${cCell.ev}` : '—'}
                </td>

                {/* PUT */}
                <td style={{ textAlign: 'center', padding: '8px 8px',
                  background: pCell.bg, color: pCell.col, fontWeight: 700 }}>
                  {putT.length >= 5 ? `${pCell.wr}%` : '—'}
                  {putT.length >= 5 && <div style={{ fontSize: 10, color: '#64748b' }}>{putT.length}t</div>}
                </td>
                <td style={{ textAlign: 'center', padding: '8px 8px',
                  background: pCell.bg, color: pCell.col, fontWeight: 700 }}>
                  {putT.length >= 5 ? `$${pCell.ev > 0 ? '+' : ''}${pCell.ev}` : '—'}
                </td>

                <td style={{ textAlign: 'center', padding: '8px 10px', color: '#64748b' }}>
                  {phaseT.length}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 10, fontSize: 10, color: '#475569',
        borderTop: '1px solid #1e293b', paddingTop: 8 }}>
        Green ≥65% WR · Light green 52–65% · Orange 40–52% · Red &lt;40%  ·  EV assumes 1:2 RR multiplier.
      </div>
    </div>
  )
}
