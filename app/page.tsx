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

const NAV = ['Overview', 'Signal Intelligence', 'Patterns & Insights', 'Self-Learning', 'Trade Log', 'Learn']

const SYMBOL_LABELS: Record<string, string> = {
  'ALL':        'All Assets',
  'R_75':       'V75 (Synthetic)',
  'frxEURUSD':  'EUR/USD',
  'frxGBPUSD':  'GBP/USD',
  'frxXAUUSD':  'Gold / USD',
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
              <div style={{ fontSize: 11, color: '#64748b' }}>EUR/USD · Gold · GBP/USD · V75 · DEMO · v6.7</div>
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
            {/* Stats always visible */}
            <StatsRow trades={filtered} />

            {tab === 'Overview' && (
              <>
                <LiveInsights trades={filtered} />
                <EquityCurve trades={filtered} />

                {/* Insight box */}
                <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    What The Bot Is Doing — In Plain English
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', fontSize: 13 }}>
                    {[
                      {
                        icon: '📊', title: 'Technical Indicators',
                        desc: 'RSI tells it if price is oversold (likely to rise) or overbought (likely to fall). MACD shows momentum direction. Bollinger Bands show if price is stretched too far.'
                      },
                      {
                        icon: '📦', title: 'Box Theory (S&R Levels)',
                        desc: 'Like invisible walls — price bounces off Monthly, Weekly and Daily highs and lows repeatedly. The bot only trades near these walls where bounces are most likely.'
                      },
                      {
                        icon: '📐', title: 'Z-Score + Fibonacci',
                        desc: 'Z-Score measures how far price has stretched from its average. Fibonacci levels are mathematical price magnets where markets reverse. "History always tells a story."'
                      },
                      {
                        icon: '🥇', title: 'Gold Trading (13:00–17:00 UTC)',
                        desc: 'Gold (XAU/USD) is traded during the London/NY overlap — peak institutional volume. Gold respects Fibonacci and support/resistance levels extremely well. Same technical signals, different asset class.'
                      },
                      {
                        icon: '📡', title: 'Higher Timeframe Trend',
                        desc: 'The bot checks the 1-hour and 4-hour charts. If both point UP, it only takes BUY trades. If both point DOWN, only SELL. Never fights the bigger trend.'
                      },
                      {
                        icon: '✅', title: 'Signal Confirmation',
                        desc: 'A signal must appear twice in a row before the bot trades. This eliminates false signals — if the market is truly moving, it shows up consistently.'
                      },
                      {
                        icon: '💹', title: 'Kelly Criterion',
                        desc: 'Instead of random stake sizes, the bot uses the mathematically optimal amount based on your real win rate. Bet more when your edge is proven, less when it isn\'t.'
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

                {/* Target box */}
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 28 }}>🎯</span>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Target to go LIVE: 55%+ win rate over 100+ forex trades</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                      Current: <strong style={{ color: wr >= 55 ? '#22c55e' : '#eab308' }}>{wr}%</strong> over {trades.length} trades (53 on V75 + forex paper trades incoming).{' '}
                      {wr >= 55 && trades.length >= 100
                        ? '🚀 You\'re ready to consider going live!'
                        : 'Collecting forex paper trade data. Next milestone: 55%+ over 100 trades.'}
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
        Last refreshed {lastRefresh.toLocaleTimeString()} · Data from Supabase · Bot runs 24/7 on Railway
      </div>
    </div>
  )
}
