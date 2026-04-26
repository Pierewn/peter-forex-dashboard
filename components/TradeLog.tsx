'use client'
import { useState } from 'react'
import { Trade } from '@/lib/supabase'
import { format } from 'date-fns'

interface Props { trades: Trade[] }

export default function TradeLog({ trades }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL')

  const shown = [...trades]
    .reverse()
    .filter(t => filter === 'ALL' || t.result === filter)

  const badge = (result: string) => {
    const styles: Record<string, React.CSSProperties> = {
      WIN:  { background: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
      LOSS: { background: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
      EVEN: { background: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
    }
    return (
      <span style={{ ...styles[result] || styles.EVEN, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
        {result}
      </span>
    )
  }

  const dirBadge = (dir: string) => (
    <span style={{
      background: dir === 'CALL' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      color: dir === 'CALL' ? '#4ade80' : '#f87171',
      padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700
    }}>
      {dir === 'CALL' ? '📈 BUY' : '📉 SELL'}
    </span>
  )

  const stars = (score: number, max = 20) => {
    const filled = Math.round(score / max * 5)
    return '⭐'.repeat(filled) + '☆'.repeat(5 - filled)
  }

  const barStyle = (val: number, max: number, colour: string): React.CSSProperties => ({
    display: 'inline-block',
    width: `${Math.round(val / max * 80)}px`,
    height: 6,
    background: colour,
    borderRadius: 3,
    marginLeft: 6,
    verticalAlign: 'middle',
  })

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Trade Log ({shown.length} trades)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['ALL', 'WIN', 'LOSS'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '4px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: filter === f ? '#6366f1' : '#2a2d3a',
                color: filter === f ? '#fff' : '#94a3b8',
                border: 'none',
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
              {['#', 'Time', 'Direction', 'Score', 'Stake', 'Payout', 'P&L', 'Result', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((t, i) => (
              <>
                <tr key={t.id}
                  style={{ borderBottom: '1px solid #1e2130', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e2130')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{trades.length - shown.indexOf(t)}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{format(new Date(t.ts), 'MMM d · HH:mm')}</td>
                  <td style={{ padding: '10px 12px' }}>{dirBadge(t.direction)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>{t.score}/20</span>
                    <span style={{ color: '#64748b', marginLeft: 6, fontSize: 11 }}>{stars(t.score)}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>${t.stake.toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', color: '#38bdf8' }}>
                    ${t.payout.toFixed(2)}
                    <span style={{ color: '#64748b', fontSize: 11, marginLeft: 4 }}>
                      ({Math.round((t.payout / t.stake - 1) * 100)}%)
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: t.pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{badge(t.result)}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>
                    {expanded === t.id ? '▲' : '▼'}
                  </td>
                </tr>

                {expanded === t.id && (
                  <tr key={`${t.id}-detail`}>
                    <td colSpan={9} style={{ padding: '0 12px 16px', background: '#141620' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 12, fontSize: 12 }}>

                        <div style={{ background: '#1a1d27', borderRadius: 8, padding: '12px 16px' }}>
                          <div style={{ color: '#64748b', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Technical Indicators</div>
                          <div style={{ color: '#e2e8f0', marginBottom: 4 }}>
                            RSI <span style={{ color: t.rsi <= 30 ? '#22c55e' : t.rsi >= 70 ? '#ef4444' : '#94a3b8', fontWeight: 700 }}>{t.rsi?.toFixed(1)}</span>
                            {t.rsi <= 30 && <span style={{ color: '#22c55e', marginLeft: 4 }}>← oversold</span>}
                            {t.rsi >= 70 && <span style={{ color: '#ef4444', marginLeft: 4 }}>← overbought</span>}
                          </div>
                          <div style={{ color: '#e2e8f0', marginBottom: 4 }}>
                            MACD hist <span style={{ color: t.macd_hist > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{t.macd_hist?.toFixed(5)}</span>
                          </div>
                          <div style={{ color: '#e2e8f0', marginBottom: 4 }}>
                            BB position <span style={{ color: '#a78bfa', fontWeight: 700 }}>{t.bb_pct?.toFixed(1)}%</span>
                            {t.bb_pct <= 20 && <span style={{ color: '#22c55e', marginLeft: 4 }}>← near low</span>}
                            {t.bb_pct >= 80 && <span style={{ color: '#ef4444', marginLeft: 4 }}>← near high</span>}
                          </div>
                          <div style={{ color: '#e2e8f0' }}>
                            ADX <span style={{ color: t.adx >= 25 ? '#22c55e' : '#eab308', fontWeight: 700 }}>{t.adx?.toFixed(1)}</span>
                            <span style={{ color: '#64748b', marginLeft: 4 }}>{t.adx >= 25 ? '← strong trend' : '← moderate'}</span>
                          </div>
                        </div>

                        <div style={{ background: '#1a1d27', borderRadius: 8, padding: '12px 16px' }}>
                          <div style={{ color: '#64748b', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Deviation Analysis</div>
                          <div style={{ color: '#e2e8f0', marginBottom: 4 }}>
                            Z-Score <span style={{ color: Math.abs(t.z_score) >= 2 ? '#f59e0b' : '#94a3b8', fontWeight: 700 }}>{t.z_score >= 0 ? '+' : ''}{t.z_score?.toFixed(2)}</span>
                            <span style={{ color: '#64748b', marginLeft: 4 }}>
                              {t.z_score <= -2 ? '← far below mean' : t.z_score >= 2 ? '← far above mean' : '← near mean'}
                            </span>
                          </div>
                          <div style={{ color: '#e2e8f0', marginBottom: 4 }}>
                            Fibonacci hit <span style={{ color: t.fib_hit !== 'none' ? '#f59e0b' : '#64748b', fontWeight: 700 }}>{t.fib_hit || 'none'}</span>
                          </div>
                          <div style={{ color: '#e2e8f0' }}>
                            Pivot hit <span style={{ color: t.pivot_hit !== 'none' ? '#38bdf8' : '#64748b', fontWeight: 700 }}>{t.pivot_hit || 'none'}</span>
                          </div>
                        </div>

                        <div style={{ background: '#1a1d27', borderRadius: 8, padding: '12px 16px' }}>
                          <div style={{ color: '#64748b', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Score Breakdown</div>
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#94a3b8' }}>Technical </span>
                            <span style={{ color: '#6366f1', fontWeight: 700 }}>{t.tech_score}/6</span>
                            <span style={barStyle(t.tech_score, 6, '#6366f1')} />
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#94a3b8' }}>Box Theory </span>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>{t.box_score}/6</span>
                            <span style={barStyle(t.box_score, 6, '#22c55e')} />
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#94a3b8' }}>Deviation  </span>
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{t.dev_score}/5</span>
                            <span style={barStyle(t.dev_score, 5, '#f59e0b')} />
                          </div>
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #2a2d3a' }}>
                            <span style={{ color: '#94a3b8' }}>Total </span>
                            <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: 15 }}>{t.score}/20</span>
                          </div>
                        </div>

                        <div style={{ background: '#1a1d27', borderRadius: 8, padding: '12px 16px' }}>
                          <div style={{ color: '#64748b', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Why This Trade</div>
                          <div style={{ color: '#e2e8f0', lineHeight: 1.7, fontSize: 12 }}>
                            {t.direction === 'CALL' ? (
                              <>Bot saw price <strong style={{ color: '#22c55e' }}>below key levels</strong> and expected a bounce UP.<br /></>
                            ) : (
                              <>Bot saw price <strong style={{ color: '#ef4444' }}>at resistance</strong> and expected a drop DOWN.<br /></>
                            )}
                            {t.fib_hit !== 'none' && <span style={{ color: '#f59e0b' }}>📐 Hit Fibonacci {t.fib_hit} — a historically magnetic level.<br /></span>}
                            {t.pivot_hit !== 'none' && <span style={{ color: '#38bdf8' }}>⚖️ Daily Pivot {t.pivot_hit} confirmed the level.<br /></span>}
                            {Math.abs(t.z_score) >= 2 && <span style={{ color: '#f59e0b' }}>📐 Price was {Math.abs(t.z_score).toFixed(1)}σ from mean — snap-back expected.<br /></span>}
                            {t.result === 'WIN'
                              ? <strong style={{ color: '#22c55e' }}>✅ All signals were right. Bot read the market correctly.</strong>
                              : <strong style={{ color: '#ef4444' }}>❌ Market moved against the analysis. Part of the process.</strong>}
                          </div>
                        </div>

                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
