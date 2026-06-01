'use client'
import { useEffect, useState } from 'react'
import { fetchTrades, Trade } from '@/lib/supabase'
import StatsRow from '@/components/StatsRow'
import EquityCurve from '@/components/EquityCurve'
import SignalIntelligence from '@/components/SignalIntelligence'
import TradeLog from '@/components/TradeLog'
import LosingPatterns from '@/components/LosingPatterns'
import SelfLearning from '@/components/SelfLearning'
import LiveInsights from '@/components/LiveInsights'
import ForexLearn from '@/components/ForexLearn'
import AssetPerformance from '@/components/AssetPerformance'
import LivePosition from '@/components/LivePosition'
import PhasePerformance from '@/components/PhasePerformance'
import PhaseDirectionMatrix from '@/components/PhaseDirectionMatrix'
import ConfidenceTiers from '@/components/ConfidenceTiers'
import TrailingStats from '@/components/TrailingStats'

const NAV = ['Overview', 'Signal Intelligence', 'Patterns & Insights', 'Self-Learning', 'Trade Log', 'Learn']

const SYMBOL_LABELS: Record<string, string> = {
  'ALL':        'All Assets',
  'R_75':       'V75 (Synthetic)',
  'R_50':       'V50 (Synthetic)',
  'R_100':      'V100 (Synthetic)',
  '1HZ75V':     '1HZ75V (V75 1s)',
  'frxXAUUSD':  'Gold / USD',
  'frxXAGUSD':  'Silver / USD',
  // GBP/USD removed — suspended (27% WR)
}

export default function Dashboard() {
  const [trades, setTrades]   = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('Overview')
  const [symbol, setSymbol]   = useState('ALL')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing]   = useState(false)

  const load = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      setError('')
      const data = await fetchTrades()
      setTrades(data)
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => load(), 120_000)
    return () => clearInterval(interval)
  }, [])

  // Filter by selected asset symbol — all components receive the filtered slice
  const filtered = symbol === 'ALL' ? trades : trades.filter(t => (t.symbol ?? 'R_75') === symbol)

  const wins   = filtered.filter(t => t.result === 'WIN').length
  const losses = filtered.filter(t => t.result === 'LOSS').length
  const wr     = filtered.length ? Math.round(wins / filtered.length * 1000) / 10 : 0

  // Available symbols derived from actual data (always show ALL + any seen)
  const seenSymbols = Array.from(new Set(trades.map(t => t.symbol ?? 'R_75')))
  const symbolOptions = ['ALL', ...seenSymbols]

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ background: '#1a1d27', borderBottom: '1px solid #2a2d3a', padding: '0 2rem' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>Peter's Bot</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>R75+R100+R50+1HZ75V+Gold · DEMO · v15.5 · Binary (Multiplier premium)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Asset filter */}
            {trades.length > 0 && (
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                style={{ background: '#2a2d3a', border: '1px solid #3a3d4a', color: '#e2e8f0', padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                {symbolOptions.map(s => (
                  <option key={s} value={s}>{SYMBOL_LABELS[s] ?? s}</option>
                ))}
              </select>
            )}

            {/* Live stats in header */}
            {trades.length > 0 && (
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>
                  {filtered.length} trades ·{' '}
                  <span style={{ color: wr >= 55 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{wr}% win rate</span>
                </span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>
                  {wins}W
                </span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                  {losses}L
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              Live · refreshes every 2 min
            </div>
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ background: refreshing ? '#1a1d27' : '#2a2d3a', border: 'none', color: refreshing ? '#6366f1' : '#94a3b8', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: refreshing ? 'default' : 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
              {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 4 }}>
          {NAV.map(n => (
            <button key={n} onClick={() => setTab(n)}
              style={{
                padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, borderBottom: tab === n ? '2px solid #6366f1' : '2px solid transparent',
                color: tab === n ? '#6366f1' : '#64748b',
                marginBottom: -1,
              }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Loading trade data from Supabase...
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1.5rem', color: '#ef4444', marginBottom: '1.5rem' }}>
            <strong>Error loading data:</strong> {error}
          </div>
        )}

        {!loading && !error && trades.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No trades yet</div>
            <div style={{ fontSize: 14 }}>The bot needs to place its first trade. Check back soon — it runs 24/7.</div>
          </div>
        )}

        {!loading && trades.length > 0 && (
          <>
            {/* Live multiplier position — shows when trade is open */}
            <LivePosition />

            {/* Stats always visible */}
            <StatsRow trades={filtered} />

            {tab === 'Overview' && (
              <>
                <LiveInsights trades={filtered} />
                <ConfidenceTiers />
                <TrailingStats trades={filtered} />
                <PhasePerformance trades={filtered} />
                <PhaseDirectionMatrix trades={filtered} />
                <AssetPerformance trades={filtered} />
                <EquityCurve trades={filtered} />

                {/* Instrument Mode Banner */}
                <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>🎛️</span>
                    <div>
                      <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Instrument Mode</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>Adaptive Binary / Multiplier</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '6px 14px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>DEFAULT</div>
                      <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13 }}>Binary Options</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>53.7% WR · BE 52.1%</div>
                    </div>
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 14px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>PREMIUM UPGRADE</div>
                      <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 13 }}>Multiplier</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>TRENDING + ADX≥25 + score 13+</div>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '6px 14px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>BLOCKED</div>
                      <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 13 }}>CALL+RANGING</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>229 trades · 48% WR</div>
                    </div>
                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 14px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>PUT DOMINANCE</div>
                      <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 13 }}>PUT 54.3% vs CALL 47.9%</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>2,271 reconciled trades</div>
                    </div>
                  </div>
                </div>

                {/* Insight box */}
                <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    What The Bot Is Doing — In Plain English
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', fontSize: 13 }}>
                    [
                      {
                        icon: '🌊', title: 'Full Top-Down Read (v15.5)',
                        desc: 'Monthly → Weekly → Daily → 4H → 1H → 15M → 5M → 1M. Every timeframe votes before a trade fires. Monthly/Weekly set the macro bias. Daily BOS gives phase. 1H shows institutional zones. 15M confirms structure shift. 5M confirms momentum. 1M executes. 2,271 trades reconciled with Deriv statement.'
                      },
                      {
                        icon: '🎛️', title: 'Adaptive Instrument (v15.5)',
                        desc: 'Binary options by default (53.7% WR, above 52.1% breakeven = profitable). Upgrades to Multiplier as premium when: TRENDING regime + ADX≥25 + aligned HTF direction + score 13+. The instrument now matches the market condition. Binary EV: +$0.03/trade. Multiplier EV at 52%+ WR: +$0.196/trade.'
                      },
                      {
                        icon: '🧠', title: 'Market Phase Intelligence (v15.0)',
                        desc: '7-phase market classifier: PULLBACK_BULL, MARKUP, DISTRIBUTION, PULLBACK_BEAR, MARKDOWN, ACCUMULATION, RANGING. CALL+RANGING is now permanently blocked (was 229 trades at 48% WR — biggest losing pattern). Top phases: DISTRIBUTION PUT (85% WR), PULLBACK_BEAR PUT (72% WR).'
                      },
                      {
                        icon: '📚', title: 'PatternLearner Recalibrated (v15.3)',
                        desc: 'Recalibrated for binary 52.1% breakeven. Every settled trade teaches the bot. Below 38% WR → +2 threshold (near-block). Above 70% WR → -2 threshold (star setup discount). Top 5-star patterns: R_100 PUT DISTRIBUTION 85%, R_75 PUT PULLBACK_BEAR 72%, R_50 PUT DISTRIBUTION 77%.'
                      },
                      {
                        icon: '🏦', title: 'Institutional Signals (SMC/ICT)',
                        desc: 'Fair Value Gaps, Order Blocks, Liquidity Sweeps, Break of Structure, CRT patterns. Bearish FVG = price fills an imbalance then rejects. Bear Sweep = smart money hunts stops above highs then reverses. BOS = structure confirmed broken. All gated by market phase and signal coherence.'
                      },
                      {
                        icon: '🚫', title: 'Blocked & Suspended (v15.5)',
                        desc: 'GBP/USD permanently removed (27% WR). JD75 suspended. CALL+RANGING blocked — was the single biggest losing pattern at 229 trades and 48% WR. Active assets: R_75, 1HZ75V, R_100, R_50, Gold, Silver. PUT direction dominates: 54.3% WR vs CALL 47.9%.'
                      },
                      {
                        icon: '🐛', title: 'Critical Bug Fixed (v15.5)',
                        desc: 'WIN/LOSS Telegram logging was silenced due to a _learn_line unbound variable bug. Trades were winning but PatternLearner was not receiving feedback — thresholds were stale. Now fixed: every settled trade correctly feeds the learning loop and updates confidence tiers in real time.'
                      },
                    ].map(item => (
                      <div key={item.title} style={{ background: '#141620', borderRadius: 10, padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                        <div style={{ fontWeight: 700, marginBottom: 4, color: '#e2e8f0' }}>{item.title}</div>
                        <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status box */}
                <div style={{ background: wr >= 52.1 ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.08)', border: `1px solid ${wr >= 52.1 ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.25)'}`, borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 28 }}>{wr >= 52.1 ? '🚀' : '🎯'}</span>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {wr >= 52.1
                        ? `v15.5 Adaptive Binary Engine — ${trades.length} trades · WR ${wr}% · Above 52.1% BE = profitable on binary (+EV)`
                        : `Below binary breakeven — ${trades.length} trades · WR ${wr}% · BE is 52.1% for binary`}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                      Default: <strong style={{ color: '#22c55e' }}>Binary Options</strong> (53.7% WR · BE 52.1%) ·
                      Premium: <strong style={{ color: '#f59e0b' }}>Multiplier</strong> when TRENDING+ADX≥25+score 13+ ·
                      Assets: R_75 · 1HZ75V · R_100 · R_50 · Gold · Silver ·
                      Blocked: CALL+RANGING · GBP/USD removed (27% WR) · JD75 suspended ·
                      Stack: Monthly→Daily→4H→1H→15M→5M→1M
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === 'Signal Intelligence' && <SignalIntelligence trades={filtered} />}
            {tab === 'Patterns & Insights' && <LosingPatterns trades={filtered} />}
            {tab === 'Self-Learning' && <SelfLearning trades={filtered} />}
            {tab === 'Trade Log' && <TradeLog trades={filtered} />}
            {tab === 'Learn' && <ForexLearn trades={filtered} />}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '2rem', color: '#2a2d3a', fontSize: 12 }}>
        Last refreshed {lastRefresh.toLocaleTimeString()} · Data from Supabase · Bot v15.5 runs 24/7 on Railway
      </div>
    </div>
  )
}
