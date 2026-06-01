'use client'
import { useEffect, useState } from 'react'
import { fetchTrades, Trade } from '@/lib/supabase'
import HeroMetrics from '@/components/HeroMetrics'
import StatsRow from '@/components/StatsRow'
import EquityCurve from '@/components/EquityCurve'
import InstrumentBreakdown from '@/components/InstrumentBreakdown'
import LiveTicker from '@/components/LiveTicker'
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
import MT5Accounts from '@/components/MT5Accounts'
import PerformanceMetrics from '@/components/PerformanceMetrics'

const NAV = ['Overview', 'Signal Intelligence', 'Patterns & Insights', 'Self-Learning', 'Trade Log', 'Learn'] as const
type NavTab = typeof NAV[number]

const SYMBOL_LABELS: Record<string, string> = {
  ALL:        'All Assets',
  R_75:       'V75',
  R_50:       'V50',
  R_100:      'V100',
  '1HZ75V':   '1HZ75V',
  frxXAUUSD:  'Gold',
  frxXAGUSD:  'Silver',
}

export default function Dashboard() {
  const [trades, setTrades]           = useState<Trade[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [tab, setTab]                 = useState<NavTab>('Overview')
  const [symbol, setSymbol]           = useState('ALL')
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
    const interval = setInterval(() => load(), 120_000)
    return () => clearInterval(interval)
  }, [])

  const filtered = symbol === 'ALL' ? trades : trades.filter(t => (t.symbol ?? 'R_75') === symbol)

  const wins   = filtered.filter(t => t.result === 'WIN').length
  const losses = filtered.filter(t => t.result === 'LOSS').length
  const wr     = filtered.length ? Math.round(wins / filtered.length * 1000) / 10 : 0

  const lastBal = [...trades].reverse().find(t => t.balance != null)?.balance ?? 0

  const today      = new Date().toISOString().slice(0, 10)
  const todayPnl   = trades.filter(t => t.ts?.slice(0, 10) === today).reduce((s, t) => s + (t.pnl || 0), 0)
  const todayColor = todayPnl >= 0 ? '#00D4AA' : '#EF4444'

  const seenSymbols    = Array.from(new Set(trades.map(t => t.symbol ?? 'R_75')))
  const symbolOptions  = ['ALL', ...seenSymbols]

  const isActive = trades.length > 0

  return (
    <div className="min-h-screen" style={{ background: '#060B14', color: '#F1F5F9' }}>

      {/* 2px status bar */}
      <div
        className="w-full h-0.5"
        style={{
          background: isActive ? '#00D4AA' : '#EF4444',
          animation: isActive ? 'status-pulse 3s ease-in-out infinite' : undefined,
          boxShadow: isActive ? '0 0 8px rgba(0,212,170,0.6)' : undefined,
        }}
      />

      {/* Live ticker */}
      {trades.length > 0 && <LiveTicker trades={trades} />}

      {/* Fixed top bar */}
      <div
        className="sticky top-0 z-50 px-6"
        style={{ background: 'rgba(6,11,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
      >
        {/* Main header row */}
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between h-12">

          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full pulse-dot"
              style={{ background: '#00D4AA' }}
            />
            <div>
              <span className="font-bold text-sm tracking-tight" style={{ color: '#F1F5F9' }}>
                PETERBOT
              </span>
              <span className="ml-2 text-xs font-mono" style={{ color: '#64748B' }}>
                v16.1
              </span>
            </div>
            <span
              className="hidden md:inline text-xs px-2 py-0.5 rounded font-bold tracking-wider"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              DEMO
            </span>
          </div>

          {/* Center: Key stats */}
          {trades.length > 0 && (
            <div className="hidden md:flex items-center gap-6 text-xs font-mono">
              <div>
                <span style={{ color: '#64748B' }}>BAL </span>
                <span className="font-bold" style={{ color: '#F1F5F9' }}>${lastBal.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>TODAY </span>
                <span className="font-bold" style={{ color: todayColor }}>
                  {todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>WR </span>
                <span className="font-bold" style={{ color: wr >= 52.1 ? '#00D4AA' : '#EF4444' }}>{wr}%</span>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>TRADES </span>
                <span className="font-bold" style={{ color: '#818CF8' }}>{filtered.length.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {trades.length > 0 && (
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg cursor-pointer font-mono"
                style={{
                  background: '#0B1120',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94A3B8',
                }}
              >
                {symbolOptions.map(s => (
                  <option key={s} value={s}>{SYMBOL_LABELS[s] ?? s}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
              style={{
                background: refreshing ? 'rgba(0,212,170,0.05)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: refreshing ? '#00D4AA' : '#94A3B8',
                cursor: refreshing ? 'default' : 'pointer',
              }}
            >
              {refreshing ? '↻ ...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Nav tabs row */}
        <div className="max-w-screen-2xl mx-auto flex">
          {NAV.map(n => (
            <button
              key={n}
              onClick={() => setTab(n)}
              className="px-4 py-2.5 text-xs font-semibold tracking-wide transition-all relative"
              style={{
                color: tab === n ? '#00D4AA' : '#64748B',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderBottom: tab === n ? '2px solid #00D4AA' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-screen-2xl mx-auto px-6 py-5">

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#00D4AA', borderTopColor: 'transparent' }}
            />
            <div className="text-sm font-mono" style={{ color: '#64748B' }}>
              Connecting to Supabase...
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl p-5 mb-5 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
          >
            <strong>Connection error:</strong> {error}
          </div>
        )}

        {!loading && !error && trades.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-3xl font-mono font-bold" style={{ color: '#64748B' }}>—</div>
            <div className="text-lg font-semibold" style={{ color: '#94A3B8' }}>No trades yet</div>
            <div className="text-sm" style={{ color: '#64748B' }}>Bot v16.1 runs 24/7 on Railway. First trade incoming.</div>
          </div>
        )}

        {!loading && trades.length > 0 && (
          <>
            {/* Live open position */}
            <LivePosition />

            {/* Hero metrics — always visible */}
            <HeroMetrics trades={filtered} />

            {/* Secondary stats row */}
            <StatsRow trades={filtered} />

            {tab === 'Overview' && (
              <>
                <MT5Accounts />
                <LiveInsights trades={filtered} />
                <PerformanceMetrics />

                {/* Two-column grid: equity curve + instrument breakdown */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                  <div className="xl:col-span-2">
                    <EquityCurve trades={filtered} />
                  </div>
                  <div className="xl:col-span-1">
                    <InstrumentBreakdown trades={filtered} />
                    <ConfidenceTiers />
                  </div>
                </div>

                <TrailingStats trades={filtered} />
                <PhasePerformance trades={filtered} />
                <PhaseDirectionMatrix trades={filtered} />
                <AssetPerformance trades={filtered} />

                {/* Instrument Mode Panel */}
                <div
                  className="rounded-xl p-5 mb-5"
                  style={{
                    background: '#0B1120',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="text-xs font-bold tracking-widest mb-4" style={{ color: '#64748B' }}>
                    INSTRUMENT MODE — v16.1 ADAPTIVE ENGINE
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      {
                        label: 'DEFAULT',
                        title: 'Binary Options',
                        sub: '53.7% WR · BE 52.1%',
                        accent: '#00D4AA',
                        bg: 'rgba(0,212,170,0.06)',
                        border: 'rgba(0,212,170,0.2)',
                      },
                      {
                        label: 'PREMIUM UPGRADE',
                        title: 'Multiplier',
                        sub: 'TRENDING + ADX≥25 + score 13+',
                        accent: '#F59E0B',
                        bg: 'rgba(245,158,11,0.06)',
                        border: 'rgba(245,158,11,0.2)',
                      },
                      {
                        label: 'BLOCKED',
                        title: 'CALL + RANGING',
                        sub: '229 trades · 48% WR',
                        accent: '#EF4444',
                        bg: 'rgba(239,68,68,0.06)',
                        border: 'rgba(239,68,68,0.15)',
                      },
                      {
                        label: 'PUT DOMINANCE',
                        title: 'PUT 54.3% vs CALL 47.9%',
                        sub: '2,271 reconciled trades',
                        accent: '#A78BFA',
                        bg: 'rgba(167,139,250,0.06)',
                        border: 'rgba(167,139,250,0.2)',
                      },
                    ].map(item => (
                      <div
                        key={item.label}
                        className="rounded-xl px-4 py-3 min-w-[160px]"
                        style={{ background: item.bg, border: `1px solid ${item.border}` }}
                      >
                        <div className="text-xs font-bold tracking-widest mb-1" style={{ color: '#64748B' }}>
                          {item.label}
                        </div>
                        <div className="text-sm font-bold" style={{ color: item.accent }}>
                          {item.title}
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#64748B' }}>
                          {item.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bot logic summary */}
                <div
                  className="rounded-xl p-5 mb-5"
                  style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-xs font-bold tracking-widest mb-4" style={{ color: '#64748B' }}>
                    ENGINE ARCHITECTURE — PLAIN ENGLISH
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[
                      {
                        title: 'Full Top-Down Read (v16.1)',
                        desc: 'Monthly→Weekly→Daily→4H→1H→15M→5M→1M. Every timeframe votes before a trade fires. Monthly/Weekly set macro bias. Daily BOS gives phase. 1H shows institutional zones. 5M confirms momentum. 1M executes. 2,420 trades reconciled with Deriv statement.',
                        color: '#818CF8',
                      },
                      {
                        title: 'Adaptive Instrument',
                        desc: 'Binary by default (53.7% WR, above 52.1% BE = profitable). Upgrades to Multiplier when: TRENDING + ADX≥25 + aligned HTF + score 13+. Binary EV: +$0.03/trade. Multiplier EV at 52%+ WR: +$0.196/trade.',
                        color: '#F59E0B',
                      },
                      {
                        title: 'Phase Intelligence',
                        desc: '7-phase classifier: PULLBACK_BULL, MARKUP, DISTRIBUTION, PULLBACK_BEAR, MARKDOWN, ACCUMULATION, RANGING. CALL+RANGING permanently blocked. Top: DISTRIBUTION PUT 85%, PULLBACK_BEAR PUT 72%.',
                        color: '#00D4AA',
                      },
                      {
                        title: 'PatternLearner',
                        desc: 'Calibrated for 52.1% binary BE. Every settled trade teaches the bot. Below 38% WR→+2 threshold. Above 70% WR→-2 discount. Top 5-star: R_100 PUT DISTRIBUTION 85%, R_75 PUT PULLBACK_BEAR 72%.',
                        color: '#38BDF8',
                      },
                      {
                        title: 'SMC / ICT Signals',
                        desc: 'Fair Value Gaps, Order Blocks, Liquidity Sweeps, Break of Structure, CRT patterns. All gated by market phase and signal coherence. Bearish FVG = price fills imbalance then rejects.',
                        color: '#E879F9',
                      },
                      {
                        title: 'Asset Coverage (v16.1)',
                        desc: 'Synthetics (R_75, 1HZ75V, R_100, R_50) 24/7. Gold h15, Silver h16. BTC/ETH crypto overnight. Accumulator ranging. Turbo strong trends. Vanilla weekly. JD75 suspended (-EV). GBP/USD removed 27% WR.',
                        color: '#34D399',
                      },
                    ].map(item => (
                      <div
                        key={item.title}
                        className="rounded-xl p-4"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div className="text-xs font-bold mb-2" style={{ color: item.color }}>
                          {item.title}
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
                          {item.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status box */}
                <div
                  className="rounded-xl p-5 mb-5 flex items-start gap-4"
                  style={{
                    background: wr >= 52.1 ? 'rgba(0,212,170,0.04)' : 'rgba(239,68,68,0.04)',
                    border: `1px solid ${wr >= 52.1 ? 'rgba(0,212,170,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1 shrink-0"
                    style={{ background: wr >= 52.1 ? '#00D4AA' : '#EF4444', boxShadow: `0 0 8px ${wr >= 52.1 ? '#00D4AA' : '#EF4444'}` }}
                  />
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: '#F1F5F9' }}>
                      {wr >= 52.1
                        ? `v16.1 Five-Instrument Engine — ${trades.length} trades · WR ${wr}% · Above 52.1% BE = +EV`
                        : `Below binary breakeven — ${trades.length} trades · WR ${wr}% · BE is 52.1%`}
                    </div>
                    <div className="text-xs" style={{ color: '#64748B' }}>
                      Default: <span style={{ color: '#00D4AA' }}>Binary</span> (53.7% WR · BE 52.1%) ·
                      Premium: <span style={{ color: '#F59E0B' }}>Multiplier</span> when TRENDING+ADX≥25+score 13+ ·
                      Blocked: CALL+RANGING · GBP/USD removed · JD75 suspended ·
                      Stack: Monthly→Daily→4H→1H→15M→5M→1M
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === 'Signal Intelligence'  && <SignalIntelligence trades={filtered} />}
            {tab === 'Patterns & Insights'  && <LosingPatterns trades={filtered} />}
            {tab === 'Self-Learning'         && <SelfLearning trades={filtered} />}
            {tab === 'Trade Log'             && <TradeLog trades={filtered} />}
            {tab === 'Learn'                 && <ForexLearn trades={filtered} />}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className="text-center py-5 text-xs font-mono"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#334155' }}
      >
        Last refresh {lastRefresh.toLocaleTimeString()} · Supabase · Railway · PeterBot v16.1 · {new Date().toISOString().slice(0, 10)}
      </div>
    </div>
  )
}
