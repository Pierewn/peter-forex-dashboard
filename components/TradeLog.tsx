'use client'
import React, { useState } from 'react'
import { Trade } from '@/lib/supabase'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'

interface Props { trades: Trade[] }

export default function TradeLog({ trades }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL')

  const shown = [...trades]
    .reverse()
    .filter(t => filter === 'ALL' || t.result === filter)

  const badge = (result: string) => {
    const styles: Record<string, string> = {
      WIN: 'bg-success/20 text-success',
      LOSS: 'bg-destructive/20 text-destructive',
      EVEN: 'bg-secondary text-muted-foreground',
    }
    return (
      <span className={`${styles[result] || styles.EVEN} px-2.5 py-1 rounded-full text-xs font-semibold`}>
        {result}
      </span>
    )
  }

  const dirBadge = (dir: string) => (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      dir === 'CALL' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
    }`}>
      {dir === 'CALL' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {dir === 'CALL' ? 'BUY' : 'SELL'}
    </span>
  )

  const stars = (score: number, max = 20) => {
    const filled = Math.round(score / max * 5)
    return '★'.repeat(filled) + '☆'.repeat(5 - filled)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Trade Log
          </h3>
          <p className="text-sm text-muted-foreground">{shown.length} trades</p>
        </div>
        <div className="flex items-center gap-2">
          {(['ALL', 'WIN', 'LOSS'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              {['#', 'Time', 'Direction', 'Score', 'Stake', 'Payout', 'P&L', 'Result', ''].map(h => (
                <th key={h} className="text-left py-3 px-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((t, i) => (
              <React.Fragment key={t.id}>
                <tr
                  className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <td className="py-3 px-3 text-muted-foreground">
                    {trades.length - shown.indexOf(t)}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {format(new Date(t.ts), 'MMM d · HH:mm')}
                  </td>
                  <td className="py-3 px-3">{dirBadge(t.direction)}</td>
                  <td className="py-3 px-3">
                    <span className="text-purple-400 font-bold">{t.score}/20</span>
                    <span className="text-warning/60 ml-2 text-xs">{stars(t.score)}</span>
                  </td>
                  <td className="py-3 px-3 text-foreground font-medium">
                    ${(t.stake ?? 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-cyan-400">
                    {t.payout != null ? (
                      <>
                        ${t.payout.toFixed(2)}
                        <span className="text-muted-foreground text-xs ml-1">
                          ({Math.round((t.payout / (t.stake || 1) - 1) * 100)}%)
                        </span>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={`py-3 px-3 font-bold ${(t.pnl ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-3">{badge(t.result)}</td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {expanded === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </td>
                </tr>

                {expanded === t.id && (
                  <tr>
                    <td colSpan={9} className="bg-secondary/30 p-0">
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Technical Indicators */}
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              Technical Indicators
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">RSI</span>
                                <span className={`font-semibold ${t.rsi <= 30 ? 'text-success' : t.rsi >= 70 ? 'text-destructive' : 'text-foreground'}`}>
                                  {t.rsi?.toFixed(1)}
                                  {t.rsi <= 30 && <span className="text-success text-xs ml-1">oversold</span>}
                                  {t.rsi >= 70 && <span className="text-destructive text-xs ml-1">overbought</span>}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">MACD</span>
                                <span className={`font-semibold ${t.macd_hist > 0 ? 'text-success' : 'text-destructive'}`}>
                                  {t.macd_hist?.toFixed(5)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">BB %</span>
                                <span className="font-semibold text-purple-400">{t.bb_pct?.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ADX</span>
                                <span className={`font-semibold ${t.adx >= 25 ? 'text-success' : 'text-warning'}`}>
                                  {t.adx?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Deviation Analysis */}
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              Deviation Analysis
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Z-Score</span>
                                <span className={`font-semibold ${Math.abs(t.z_score) >= 2 ? 'text-warning' : 'text-foreground'}`}>
                                  {t.z_score >= 0 ? '+' : ''}{t.z_score?.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Fib Hit</span>
                                <span className={`font-semibold ${t.fib_hit !== 'none' ? 'text-warning' : 'text-muted-foreground'}`}>
                                  {t.fib_hit || 'none'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pivot</span>
                                <span className={`font-semibold ${t.pivot_hit !== 'none' ? 'text-cyan-400' : 'text-muted-foreground'}`}>
                                  {t.pivot_hit || 'none'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              Score Breakdown
                            </h4>
                            <div className="space-y-3">
                              {[
                                { label: 'Technical', score: t.tech_score, max: 6, color: 'bg-primary' },
                                { label: 'Box Theory', score: t.box_score, max: 6, color: 'bg-success' },
                                { label: 'Deviation', score: t.dev_score, max: 5, color: 'bg-warning' },
                              ].map(item => (
                                <div key={item.label}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="font-semibold text-foreground">{item.score}/{item.max}</span>
                                  </div>
                                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${item.color} rounded-full transition-all`}
                                      style={{ width: `${(item.score / item.max) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2 border-t border-border">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Total</span>
                                  <span className="font-bold text-purple-400">{t.score}/20</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Why This Trade */}
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              Why This Trade
                            </h4>
                            <div className="text-sm text-muted-foreground space-y-2">
                              {t.direction === 'CALL' ? (
                                <p>Bot saw price <span className="text-success font-semibold">below key levels</span> and expected a bounce UP.</p>
                              ) : (
                                <p>Bot saw price <span className="text-destructive font-semibold">at resistance</span> and expected a drop DOWN.</p>
                              )}
                              {t.fib_hit !== 'none' && (
                                <p className="text-warning">Hit Fibonacci {t.fib_hit} — a historically magnetic level.</p>
                              )}
                              {Math.abs(t.z_score) >= 2 && (
                                <p className="text-warning">Price was {Math.abs(t.z_score).toFixed(1)}σ from mean — snap-back expected.</p>
                              )}
                              <p className={`font-semibold ${t.result === 'WIN' ? 'text-success' : 'text-destructive'}`}>
                                {t.result === 'WIN' 
                                  ? 'All signals were right. Bot read the market correctly.'
                                  : 'Market moved against the analysis. Part of the process.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
