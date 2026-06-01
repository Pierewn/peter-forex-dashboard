'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

const SYMBOL_LABELS: Record<string, string> = {
  R_75:       'R_75  (V75)',
  R_50:       'R_50  (V50)',
  R_100:      'R_100 (V100)',
  '1HZ75V':   '1HZ75V (V75 1s)',
  frxXAUUSD:  'Gold / USD',
  frxXAGUSD:  'Silver / USD',
  frxGBPUSD:  'GBP / USD',  // kept for historical display only
}

function wr(ts: Trade[]) {
  if (!ts.length) return 0
  return Math.round(ts.filter(t => t.result === 'WIN').length / ts.length * 1000) / 10
}
function pnl(ts: Trade[]) {
  return ts.reduce((s, t) => s + (t.pnl ?? 0), 0)
}
function wrColour(w: number) {
  if (w >= 60) return '#22c55e'
  if (w >= 54) return '#86efac'
  if (w >= 52) return '#eab308'
  return '#ef4444'
}
function pnlColour(p: number) { return p >= 0 ? '#22c55e' : '#ef4444' }

export default function AssetPerformance({ trades }: Props) {
  if (trades.length < 10) return null

  // ── 1. By-symbol breakdown ────────────────────────────────────────────
  const symbolMap: Record<string, Trade[]> = {}
  trades.forEach(t => {
    const s = t.symbol ?? 'R_75'
    if (!symbolMap[s]) symbolMap[s] = []
    symbolMap[s].push(t)
  })
  const symbols = Object.entries(symbolMap)
    .filter(([, ts]) => ts.length >= 3)
    .sort(([, a], [, b]) => b.length - a.length)

  // ── 2. R_75 hour heatmap ─────────────────────────────────────────────
  const r75Trades  = trades.filter(t => (t.symbol ?? 'R_75') === 'R_75')
  const hourBuckets: Record<number, Trade[]> = {}
  for (let h = 0; h < 24; h++) hourBuckets[h] = []
  r75Trades.forEach(t => {
    const h = t.hour ?? new Date(t.ts).getUTCHours()
    if (h >= 0 && h < 24) hourBuckets[h].push(t)
  })

  // ── 3. Bias breakdown ────────────────────────────────────────────────
  const biasMap: Record<string, Trade[]> = { BULLISH: [], BEARISH: [], NEUTRAL: [] }
  trades.forEach(t => {
    const b = t.trend_bias ?? 'NEUTRAL'
    if (biasMap[b]) biasMap[b].push(t)
  })

  // cell bg for hour heatmap
  function hourBg(h: number) {
    const ts = hourBuckets[h]
    if (ts.length < 3) return '#1a1d27'
    const w = wr(ts)
    if (w >= 70) return 'rgba(34,197,94,0.30)'
    if (w >= 60) return 'rgba(34,197,94,0.15)'
    if (w >= 52) return 'rgba(234,179,8,0.15)'
    return 'rgba(239,68,68,0.20)'
  }

  return (
    <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Asset table ─────────────────────────────────────────── */}
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          📊 Performance By Asset
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ textAlign: 'left', padding: '6px 12px', fontWeight: 700 }}>Asset</th>
                <th style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700 }}>Trades</th>
                <th style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700 }}>Wins</th>
                <th style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700 }}>WR %</th>
                <th style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700 }}>P&L</th>
                <th style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700 }}>Avg Stake</th>
                <th style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map(([sym, ts]) => {
                const w     = wr(ts)
                const p     = pnl(ts)
                const wins  = ts.filter(t => t.result === 'WIN').length
                const avgSt = ts.reduce((s, t) => s + (t.stake ?? 0), 0) / ts.length
                const status =
                  sym === 'R_75'        ? '✅ Active'
                  : sym === 'R_100'     ? '✅ Active — top performer'
                  : sym === '1HZ75V'    ? '✅ Active (V75 1s)'
                  : sym === 'R_50'      ? '✅ Active'
                  : sym === 'frxXAUUSD' ? '✅ Active (Gold PUT)'
                  : sym === 'frxXAGUSD' ? '✅ Active (Silver)'
                  : sym === 'JD75'      ? '🚫 Suspended'
                  : sym === 'frxGBPUSD' ? '🚫 Removed (27% WR)'
                  : '—'
                return (
                  <tr key={sym} style={{ borderTop: '1px solid #2a2d3a' }}>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0', fontWeight: 600 }}>
                      {SYMBOL_LABELS[sym] ?? sym}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8' }}>{ts.length}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8' }}>{wins}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: wrColour(w) }}>
                      {w}%
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: pnlColour(p) }}>
                      {p >= 0 ? '+' : ''}${p.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8' }}>
                      ${avgSt.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                      {status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 2: Hour heatmap + Bias breakdown ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>

        {/* Hour heatmap (R_75 only) */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            🕐 R_75 Win Rate By Hour (UTC)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {Array.from({ length: 24 }, (_, h) => {
              const ts  = hourBuckets[h]
              const w   = ts.length >= 3 ? wr(ts) : null
              return (
                <div key={h} style={{
                  background: hourBg(h),
                  border: '1px solid #2a2d3a',
                  borderRadius: 6,
                  padding: '8px 4px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>h{String(h).padStart(2, '0')}</div>
                  {w !== null ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: wrColour(w), marginTop: 2 }}>{w}%</div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>—</div>
                  )}
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{ts.length}t</div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(34,197,94,0.30)', borderRadius: 2, marginRight: 4 }}/>≥70%</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(34,197,94,0.15)', borderRadius: 2, marginRight: 4 }}/>60–70%</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(234,179,8,0.15)', borderRadius: 2, marginRight: 4 }}/>52–60%</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(239,68,68,0.20)', borderRadius: 2, marginRight: 4 }}/>&lt;52%</span>
            <span style={{ marginLeft: 'auto' }}>Needs 3+ trades to show</span>
          </div>
        </div>

        {/* Bias breakdown */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            📡 By HTF Bias
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: '📈 BULLISH', key: 'BULLISH', icon: '#22c55e' },
              { label: '📉 BEARISH', key: 'BEARISH', icon: '#ef4444' },
              { label: '↔️ NEUTRAL', key: 'NEUTRAL', icon: '#64748b' },
            ].map(({ label, key, icon }) => {
              const ts  = biasMap[key] ?? []
              const w   = wr(ts)
              const p   = pnl(ts)
              if (!ts.length) return null
              return (
                <div key={key} style={{ background: '#141620', borderRadius: 8, padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: icon }}>{label}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{ts.length} trades</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: wrColour(w) }}>WR {w}%</span>
                    <span style={{ fontWeight: 700, color: pnlColour(p) }}>
                      {p >= 0 ? '+' : ''}${p.toFixed(0)}
                    </span>
                  </div>
                  {/* WR bar */}
                  <div style={{ marginTop: 6, height: 4, background: '#2a2d3a', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, w)}%`, background: wrColour(w), borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '1rem', fontSize: 11, color: '#334155', borderTop: '1px solid #2a2d3a', paddingTop: '0.75rem' }}>
            Binary breakeven (92% payout): <strong style={{ color: '#64748b' }}>52.1% WR</strong> · Current overall: <strong style={{ color: '#22c55e' }}>53.7% WR</strong>
          </div>
        </div>

      </div>
    </div>
  )
}
