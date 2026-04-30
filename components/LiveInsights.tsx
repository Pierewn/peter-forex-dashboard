'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

function wr(trades: Trade[]) {
  if (!trades.length) return 0
  return Math.round(trades.filter(t => t.result === 'WIN').length / trades.length * 1000) / 10
}

export default function LiveInsights({ trades }: Props) {
  if (trades.length < 5) return null

  const wins   = trades.filter(t => t.result === 'WIN').length
  const losses = trades.filter(t => t.result === 'LOSS').length
  const winRate = wr(trades)

  // Payout-based breakeven
  const payoutSamples = trades.filter(t => t.payout_pct != null)
  const avgPayout = payoutSamples.length
    ? payoutSamples.reduce((s, t) => s + t.payout_pct!, 0) / payoutSamples.length
    : trades.reduce((s, t) => s + ((t.payout / t.stake - 1) * 100), 0) / trades.length
  const breakeven = Math.round(100 / (1 + avgPayout / 100) * 10) / 10

  // Best regime
  const regimeTrades = trades.filter(t => t.regime)
  const regimeMap: Record<string, Trade[]> = {}
  regimeTrades.forEach(t => {
    const r = t.regime!
    if (!regimeMap[r]) regimeMap[r] = []
    regimeMap[r].push(t)
  })
  const bestRegime = Object.entries(regimeMap)
    .filter(([, ts]) => ts.length >= 3)
    .sort(([, a], [, b]) => wr(b) - wr(a))[0]

  // Best session
  const sessionMap: Record<string, Trade[]> = {}
  trades.forEach(t => {
    const s = t.session_name ?? 'R75'
    if (!sessionMap[s]) sessionMap[s] = []
    sessionMap[s].push(t)
  })
  const bestSession = Object.entries(sessionMap)
    .filter(([, ts]) => ts.length >= 3)
    .sort(([, a], [, b]) => wr(b) - wr(a))[0]

  // Trend
  const recent10 = trades.slice(-10)
  const recentWr  = wr(recent10)
  const trend = recentWr > winRate + 5 ? 'improving' : recentWr < winRate - 5 ? 'declining' : 'stable'

  // Balance change
  const firstBal = trades[0]?.balance ?? 0
  const lastBal  = trades[trades.length - 1]?.balance ?? 0
  const balChange = lastBal - firstBal

  // Kelly health — are we still positive EV?
  const ev = (winRate / 100) * (avgPayout / 100) - (1 - winRate / 100)
  const evPositive = ev > 0

  // Build insight items
  const insights: { icon: string; colour: string; title: string; body: string }[] = []

  // 1. Win rate vs breakeven
  if (winRate >= breakeven) {
    insights.push({
      icon: '✅', colour: '#22c55e',
      title: `You're above breakeven (${winRate}% vs ${breakeven}% needed)`,
      body: `At an average payout of ${avgPayout.toFixed(1)}%, you need to win at least ${breakeven}% of trades to make money. You're currently at ${winRate}% — that's profitable territory. Keep collecting trades to confirm this edge is real.`,
    })
  } else {
    insights.push({
      icon: '⚠️', colour: '#eab308',
      title: `Still below breakeven — ${winRate}% vs ${breakeven}% needed`,
      body: `At ${avgPayout.toFixed(1)}% average payout, you need to win ${breakeven}% of trades just to break even. You're at ${winRate}% right now. This is why we're on paper trading — the bot is still learning. The v5.14 threshold changes should push this up over the next 50 trades.`,
    })
  }

  // 2. Regime insight
  if (bestRegime) {
    const [name, ts] = bestRegime
    const label = name === 'RANGING' ? 'Ranging (sideways) markets'
      : name === 'TRENDING_BULL' ? 'Bullish trending markets'
      : name === 'TRENDING_BEAR' ? 'Bearish trending markets' : name
    insights.push({
      icon: '🔀', colour: '#6366f1',
      title: `Your bot's sweet spot: ${label} (${wr(ts)}% win rate)`,
      body: name === 'RANGING'
        ? `Ranging means price is bouncing between a ceiling and a floor — not breaking out strongly in either direction. Your bot was built for this: it uses RSI, Bollinger Bands and Z-Score to catch those bounces. ${wr(ts)}% win rate here is real edge.`
        : `Your bot wins ${wr(ts)}% of trades in ${label.toLowerCase()}. It uses ADX and Higher Timeframe Bias to detect these conditions and aligns its trades with the dominant direction.`,
    })
  }

  // 3. Session insight
  if (bestSession && bestSession[0] !== 'R75') {
    const [name, ts] = bestSession
    const label = name === 'LONDON' ? 'London morning — EUR/USD (11am–4pm Kenya)'
      : name === 'GOLD_LONDON' ? 'London/NY overlap — Gold (4pm–8pm Kenya)'
      : name === 'NEW_YORK' ? 'New York session — GBP/USD (8pm–1am Kenya)' : name
    insights.push({
      icon: '🕐', colour: '#38bdf8',
      title: `Best trading window: ${label} at ${wr(ts)}% win rate`,
      body: name === 'GOLD_LONDON'
        ? `The London/NY overlap is when both European commodity desks and American traders are active simultaneously — Gold sees its highest daily volume in this window. Big institutions move Gold here, creating the cleanest technical setups. Your bot is catching this.`
        : `The ${label} is when the most banks and institutions are actively trading. More volume = cleaner price moves = more reliable signals. Your bot is picking this up. Watch if this pattern holds as more trades build up.`,
    })
  }

  // 4. Form trend
  if (trend === 'improving') {
    insights.push({
      icon: '📈', colour: '#22c55e',
      title: `Recent form is improving (last 10 trades: ${recentWr}%)`,
      body: `Your last 10 trades are winning at ${recentWr}% vs your overall ${winRate}%. The bot is in a good patch — the Kelly Criterion has noticed this and is sizing stakes slightly larger. This is the system working as designed.`,
    })
  } else if (trend === 'declining') {
    insights.push({
      icon: '📉', colour: '#ef4444',
      title: `Recent form is weaker (last 10 trades: ${recentWr}%)`,
      body: `Your last 10 trades are at ${recentWr}% vs your overall ${winRate}%. The bot has noticed this — Kelly is sizing down stakes automatically. The 3-loss cooldown and soft de-risk rules are your safety net here. This is normal variance, not a system failure.`,
    })
  }

  // 5. Balance trajectory
  insights.push({
    icon: balChange >= 0 ? '💰' : '📊',
    colour: balChange >= 0 ? '#22c55e' : '#94a3b8',
    title: balChange >= 0
      ? `Account up $${balChange.toFixed(2)} across ${trades.length} trades`
      : `Account down $${Math.abs(balChange).toFixed(2)} across ${trades.length} trades — demo mode, keep learning`,
    body: balChange >= 0
      ? `Starting from $${firstBal.toFixed(2)}, you're now at $${lastBal.toFixed(2)}. The bot is compounding — as the balance grows, Kelly sizes up stakes proportionally. Every dollar earned is working for the next trade.`
      : `You're currently at $${lastBal.toFixed(2)} from $${firstBal.toFixed(2)}. This is exactly what demo mode is for — testing the strategy with no real money at risk. The data you're collecting right now is what will make the live version profitable.`,
  })

  // 6. EV signal
  if (!evPositive && trades.length >= 20) {
    insights.push({
      icon: '🧮', colour: '#ef4444',
      title: 'Expected value is currently negative — thresholds help fix this',
      body: `Expected value (EV) is the mathematical profit you'd make per $1 bet over time. Right now it's slightly negative, which is why we raised the score threshold to 10+ in v5.14. EV improves as the win rate rises. Once you consistently hit ${breakeven}%+, EV turns positive and the bot prints money over time.`,
    })
  }

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
        📡 Live Insights — What Your Data Is Telling You Right Now
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {insights.map((ins, i) => (
          <div key={i} style={{ background: '#141620', borderRadius: 10, padding: '1rem 1.25rem', borderLeft: `3px solid ${ins.colour}` }}>
            <div style={{ fontWeight: 700, color: ins.colour, marginBottom: 6, fontSize: 13 }}>
              {ins.icon} {ins.title}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7 }}>
              {ins.body}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1rem', fontSize: 11, color: '#334155', textAlign: 'right' }}>
        Based on {trades.length} trades · Updates every 2 min
      </div>
    </div>
  )
}
