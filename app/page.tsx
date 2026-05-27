'use client'
import { useEffect, useState } from 'react'
import { fetchTrades, Trade } from '@/lib/supabase'
import Header from '@/components/Header'
import StatsRow from '@/components/StatsRow'
import EquityCurve from '@/components/EquityCurve'
import SignalIntelligence from '@/components/SignalIntelligence'
import TradeLog from '@/components/TradeLog'
import LosingPatterns from '@/components/LosingPatterns'
import SelfLearning from '@/components/SelfLearning'
import LiveInsights from '@/components/LiveInsights'
import ForexLearn from '@/components/ForexLearn'
import AssetPerformance from '@/components/AssetPerformance'
import QuickActions from '@/components/QuickActions'

const NAV = ['Overview', 'Signal Intelligence', 'Patterns & Insights', 'Self-Learning', 'Trade Log', 'Learn']

const SYMBOL_LABELS: Record<string, string> = {
  'ALL':        'All Assets',
  'R_75':       'V75 (Synthetic)',
  'R_50':       'V50 (Synthetic)',
  'JD75':       'JD75 (Jump 75)',
  '1HZ75V':     '1HZ75V (V75 1s)',
  'R_100':      'V100 (Synthetic)',
  'frxXAUUSD':  'Gold / USD',
  'frxXAGUSD':  'Silver / USD',
  'frxGBPUSD':  'GBP/USD (Forex)',
}

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('Overview')
  const [symbol, setSymbol] = useState('ALL')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const load = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      setError('')
      const data = await fetchTrades()
      setTrades(data)
      setLastRefresh(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
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
  const wins = filtered.filter(t => t.result === 'WIN').length
  const losses = filtered.filter(t => t.result === 'LOSS').length
  const wr = filtered.length ? Math.round(wins / filtered.length * 1000) / 10 : 0
  const seenSymbols = Array.from(new Set(trades.map(t => t.symbol ?? 'R_75')))
  const symbolOptions = ['ALL', ...seenSymbols]

  return (
    <div className="min-h-screen bg-background">
      <Header
        symbol={symbol}
        setSymbol={setSymbol}
        symbolOptions={symbolOptions}
        symbolLabels={SYMBOL_LABELS}
        trades={trades}
        filtered={filtered}
        wins={wins}
        losses={losses}
        wr={wr}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        lastRefresh={lastRefresh}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1600px] mx-auto px-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {NAV.map(n => (
              <button
                key={n}
                onClick={() => setTab(n)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  tab === n
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {n}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading trade data from Supabase...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <span className="text-destructive text-lg">!</span>
              </div>
              <div>
                <p className="font-semibold text-destructive">Error loading data</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && trades.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center mb-6">
              <span className="text-4xl">📊</span>
            </div>
            <h2 className="text-xl font-bold mb-2">No trades yet</h2>
            <p className="text-muted-foreground text-center max-w-md">
              The bot needs to place its first trade. Check back soon — it runs 24/7.
            </p>
          </div>
        )}

        {!loading && trades.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            <StatsRow trades={filtered} />

            {tab === 'Overview' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <EquityCurve trades={filtered} />
                  </div>
                  <div>
                    <QuickActions trades={filtered} wr={wr} />
                  </div>
                </div>
                <LiveInsights trades={filtered} />
                <AssetPerformance trades={filtered} />
                <BotStrategy wr={wr} trades={trades} />
              </>
            )}

            {tab === 'Signal Intelligence' && <SignalIntelligence trades={filtered} />}
            {tab === 'Patterns & Insights' && <LosingPatterns trades={filtered} />}
            {tab === 'Self-Learning' && <SelfLearning trades={filtered} />}
            {tab === 'Trade Log' && <TradeLog trades={filtered} />}
            {tab === 'Learn' && <ForexLearn trades={filtered} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>Last refreshed {lastRefresh.toLocaleTimeString()}</p>
          <p>Data from Supabase &middot; Bot runs 24/7 on Railway</p>
        </div>
      </footer>
    </div>
  )
}

function BotStrategy({ wr, trades }: { wr: number; trades: Trade[] }) {
  const strategies = [
    { icon: '📊', title: 'Technical Indicators', desc: 'RSI, MACD, Bollinger Bands detect overbought/oversold conditions and momentum shifts.' },
    { icon: '📦', title: 'Box Theory (S&R)', desc: 'Monthly, Weekly and Daily highs/lows act as invisible walls where price bounces.' },
    { icon: '📐', title: 'Z-Score + Fibonacci', desc: 'Statistical deviation and mathematical price magnets identify reversal points.' },
    { icon: '📡', title: 'HTF Trend Alignment', desc: '1-hour and 4-hour charts confirm direction — never fights the bigger trend.' },
    { icon: '✅', title: 'Signal Confirmation', desc: 'Requires 11+ points across 10+ indicators before entering any trade.' },
    { icon: '💹', title: 'Kelly Criterion', desc: 'Mathematically optimal stake sizing based on real win rate and edge.' },
  ]

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Bot Strategy Overview
          </h3>
          <p className="text-sm text-muted-foreground">What the bot is doing — in plain English</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
          wr >= 54 ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
        }`}>
          {wr >= 54 ? 'Edge Confirmed' : 'Calibrating'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map(item => (
          <div key={item.title} className="bg-secondary/50 rounded-lg p-4 card-hover cursor-default">
            <div className="text-2xl mb-3">{item.icon}</div>
            <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className={`mt-6 p-4 rounded-lg border ${
        wr >= 54 ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/20'
      }`}>
        <div className="flex items-start gap-4">
          <span className="text-3xl">{wr >= 54 ? '🚀' : '🎯'}</span>
          <div>
            <p className="font-semibold text-foreground">
              {wr >= 54 ? 'Strategy proven profitable' : 'Building calibration data — target 54%+ win rate'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Current: <span className={`font-bold ${wr >= 52 ? 'text-success' : 'text-warning'}`}>{wr}%</span> over {trades.length} trades &middot; Breakeven: ~52.1% (at 92% payout)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
