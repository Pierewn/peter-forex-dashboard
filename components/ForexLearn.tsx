'use client'
import { Trade } from '@/lib/supabase'
import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Calculator, BarChart3, Shield, Lightbulb } from 'lucide-react'

interface Props { trades: Trade[] }

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-base font-bold text-foreground">{children}</h3>
    </div>
  )
}

function Term({ word, children }: { word: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-secondary/30 transition-colors -mx-2 px-2 rounded-lg"
      >
        <span className="font-semibold text-purple-400 text-sm">{word}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

export default function ForexLearn({ trades }: Props) {
  const payoutSamples = trades.filter(t => t.payout_pct != null)
  const avgPayout = payoutSamples.length
    ? payoutSamples.reduce((s, t) => s + t.payout_pct!, 0) / payoutSamples.length
    : trades.reduce((s, t) => s + ((t.payout / t.stake - 1) * 100), 0) / Math.max(trades.length, 1)
  const breakeven = Math.round(100 / (1 + avgPayout / 100) * 10) / 10
  const winRate = trades.length ? Math.round(trades.filter(t => t.result === 'WIN').length / trades.length * 1000) / 10 : 0

  return (
    <div className="space-y-6">
      {/* How the bot trades */}
      <Card>
        <SectionTitle icon={<Lightbulb className="w-5 h-5 text-primary" />}>
          How This Bot Actually Makes Money
        </SectionTitle>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          The bot trades <span className="text-foreground font-semibold">binary options</span> on synthetic indices and Gold. A binary option is simple: predict whether the price will be higher or lower in exactly 5 minutes. Right = fixed payout. Wrong = lose your stake. The bot uses 10+ technical indicators to find high-probability setups, only trading when 11+ points of evidence agree.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: '📈', label: 'CALL (BUY)', desc: 'Bot predicts price will be HIGHER in 5 minutes.', color: 'border-success' },
            { icon: '📉', label: 'PUT (SELL)', desc: 'Bot predicts price will be LOWER in 5 minutes.', color: 'border-destructive' },
            { icon: '💰', label: 'WIN', desc: `Stake back + ${avgPayout.toFixed(0)}% payout return.`, color: 'border-success' },
            { icon: '❌', label: 'LOSS', desc: 'Entire stake is lost. Nothing back.', color: 'border-destructive' },
          ].map(item => (
            <div key={item.label} className={`bg-secondary/30 rounded-xl p-4 border-t-2 ${item.color}`}>
              <div className="text-2xl mb-2">{item.icon}</div>
              <h4 className="font-bold text-foreground text-sm mb-1">{item.label}</h4>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* The maths */}
      <Card>
        <SectionTitle icon={<Calculator className="w-5 h-5 text-primary" />}>
          The Most Important Number: Breakeven Win Rate
        </SectionTitle>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Because you lose 100% of your stake on a loss but only win ~{avgPayout.toFixed(0)}% on a win, you need to be right <em>more than half the time</em> to make money. Here&apos;s the exact maths for your bot:
        </p>
        
        <div className="bg-secondary/50 rounded-xl p-5 mb-6 font-mono text-sm">
          <p className="text-muted-foreground mb-2">// Breakeven formula:</p>
          <p className="text-purple-400">Breakeven = 100 ÷ (100 + payout%)</p>
          <p className="text-muted-foreground my-2">// With your current average payout of {avgPayout.toFixed(1)}%:</p>
          <p className="text-success font-bold">Breakeven = 100 ÷ (100 + {avgPayout.toFixed(1)}) = {breakeven}%</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className={`bg-secondary/30 rounded-xl p-4 border ${winRate < breakeven ? 'border-destructive/50' : 'border-border'}`}>
            <p className="text-xs text-muted-foreground mb-1">NEED TO WIN</p>
            <p className="text-2xl font-bold text-foreground">{breakeven}%+</p>
          </div>
          <div className={`bg-secondary/30 rounded-xl p-4 border ${winRate >= breakeven ? 'border-success/50' : 'border-destructive/50'}`}>
            <p className="text-xs text-muted-foreground mb-1">CURRENTLY AT</p>
            <p className={`text-2xl font-bold ${winRate >= breakeven ? 'text-success' : 'text-destructive'}`}>{winRate}%</p>
          </div>
          <div className="bg-secondary/30 rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">TARGET TO GO LIVE</p>
            <p className="text-2xl font-bold text-primary">55%+</p>
          </div>
        </div>
      </Card>

      {/* Reading the charts */}
      <Card>
        <SectionTitle icon={<BarChart3 className="w-5 h-5 text-primary" />}>
          Reading the Charts — What Each One Tells You
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            {
              chart: 'Equity Curve',
              good: 'A rising line = bot is profitable. Small dips are normal.',
              bad: 'Flat or falling line means settings need adjustment.',
            },
            {
              chart: 'Win Rate by Score',
              good: 'Higher scores should win more often — confirms calibration.',
              bad: 'If low scores win as much as high scores, indicators not adding value.',
            },
            {
              chart: 'Win Rate by Regime',
              good: 'RANGING and TRENDING_BEAR with HTF confirmation are strongest.',
              bad: 'TRENDING_BULL is blocked — historically near-zero win rate.',
            },
            {
              chart: 'BUY vs SELL',
              good: 'Both should be roughly equal over time.',
              bad: 'Big imbalance means directional bias needs adjustment.',
            },
          ].map((item, i) => (
            <div key={i} className="bg-secondary/30 rounded-xl p-4">
              <h4 className="font-semibold text-foreground text-sm mb-3">{item.chart}</h4>
              <div className="space-y-2 text-xs">
                <p><span className="text-success font-semibold">Good:</span> <span className="text-muted-foreground">{item.good}</span></p>
                <p><span className="text-destructive font-semibold">Warning:</span> <span className="text-muted-foreground">{item.bad}</span></p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Indicator Glossary */}
      <Card>
        <SectionTitle icon={<BookOpen className="w-5 h-5 text-primary" />}>
          Indicator Glossary
        </SectionTitle>
        <p className="text-xs text-muted-foreground mb-4">Tap any term to expand the explanation.</p>
        
        <Term word="RSI — Relative Strength Index (up to 4 pts)">
          Measures momentum on a scale of 0–100. Below 30 = oversold (likely to bounce UP). Above 70 = overbought (likely to fall DOWN). The bot also looks for RSI Divergence — when price makes a new high but RSI doesn&apos;t, it&apos;s a warning sign of reversal.
        </Term>
        <Term word="MACD — Moving Average Convergence Divergence (up to 2 pts)">
          Tracks the difference between a fast and slow moving average. When the MACD histogram crosses from negative to positive, momentum is shifting UP (bullish). The bot uses this to confirm signal direction.
        </Term>
        <Term word="Bollinger Bands (up to 2 pts)">
          Three lines around price: a middle average, upper band and lower band. When price touches the lower band, it&apos;s stretched DOWN and likely to snap back up. Used for mean-reversion trades.
        </Term>
        <Term word="ADX — Average Directional Index (up to 2 pts)">
          Measures trend strength (not direction). ADX below 20 = weak trend (ranging). ADX 25+ = strong trend. Used to classify market regime and select the right sub-strategy.
        </Term>
        <Term word="Z-Score (up to 2 pts)">
          Measures how far price has moved from its recent average in standard deviations. A Z-Score of +2 means price is 2σ above average — statistically unlikely to continue and likely to revert.
        </Term>
        <Term word="Box Theory — S&R Levels (up to 6 pts)">
          Monthly, Weekly and Daily highs/lows act as invisible floors and ceilings. Price bounces off these levels repeatedly. The bot only trades near these walls where bounces are most likely.
        </Term>
        <Term word="Fibonacci Retracement (up to 2 pts)">
          Mathematical ratios (23.6%, 38.2%, 61.8%, 78.6%) that appear repeatedly in markets. The 61.8% level is the &apos;golden ratio&apos; and strongest. The bot looks for price at Fibonacci levels as extra confirmation.
        </Term>
        <Term word="Kelly Criterion — Stake Sizing">
          Mathematical formula for optimal bet sizing based on win rate and payout. Too small = leaves money on table. Too large = risks ruin. The bot uses twentieth-Kelly (very conservative) with a $3 max stake.
        </Term>
      </Card>

      {/* Risk Management */}
      <Card>
        <SectionTitle icon={<Shield className="w-5 h-5 text-primary" />}>
          How the Bot Protects Your Money
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: '🛑', rule: '3% Daily Kill Switch', desc: 'If bot loses 3%+ in one day, it sleeps until midnight.', color: 'text-destructive' },
            { icon: '📅', rule: '8% Weekly Limit', desc: 'If losses reach 8% in a week, bot rests until Monday.', color: 'text-warning' },
            { icon: '📉', rule: '10% Drawdown Halt', desc: 'If account drops 10% from peak, trading stops for the day.', color: 'text-warning' },
            { icon: '⚠️', rule: 'Soft De-Risk at 1.5%', desc: 'At 1.5% daily loss, Kelly stakes are cut in half automatically.', color: 'text-warning' },
            { icon: '🔄', rule: '3-Loss Cooldown', desc: 'After 3 consecutive losses, bot waits before next trade.', color: 'text-primary' },
            { icon: '💰', rule: '$3 Max Stake', desc: 'Hard cap prevents catastrophic losses from large bets.', color: 'text-primary' },
          ].map(item => (
            <div key={item.rule} className="flex items-start gap-3 bg-secondary/30 rounded-xl p-4">
              <span className="text-xl">{item.icon}</span>
              <div>
                <h4 className={`font-semibold text-sm ${item.color}`}>{item.rule}</h4>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
