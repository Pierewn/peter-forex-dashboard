'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

function wr(trades: Trade[]) {
  if (!trades.length) return 0
  return Math.round(trades.filter(t => t.result === 'WIN').length / trades.length * 1000) / 10
}

// Derive a human-friendly label + body for a session_name code
function sessionLabel(code: string): { label: string; body: string } | null {
  if (code === 'GOLD_LONDON')
    return {
      label: 'London/NY overlap — Gold (6pm–7pm Kenya)',
      body:  'The London/NY overlap is when both European commodity desks and American traders are active — Gold sees its highest daily volume here. Big institutions move Gold in this window, creating the cleanest technical setups. Your bot is catching this.',
    }
  if (code === 'LONDON_GBPUSD')
    return {
      label: 'London session — GBP/USD (11am–6pm Kenya)',
      body:  'The London session is the highest-volume window for GBP/USD — the Bank of England and major European banks are fully active. Price moves are institutional and technical levels are respected. This is the prime GBP/USD edge window.',
    }
  if (code === 'NEW_YORK_GBPUSD')
    return {
      label: 'New York session — GBP/USD (8pm–1am Kenya)',
      body:  'The NY session adds US institutional flow on GBP/USD — dollar strength/weakness dominates this window. Strong economic data from the US moves GBP/USD decisively here. The bot is collecting data to prove whether signal edge exists in this window.',
    }
  if (code.startsWith('LONDON_'))
    return {
      label: `London morning — ${code.replace('LONDON_', '')} (11am–5pm Kenya)`,
      body:  'The London morning session is the most liquid window for synthetics. European desks are fully active, spreads are tight and price moves are deliberate. Your bot is picking up cleaner signals here than in the off-hours Asian window.',
    }
  if (code.startsWith('NEW_YORK_'))
    return {
      label: `New York session — ${code.replace('NEW_YORK_', '')} (8pm–1am Kenya)`,
      body:  'The New York session adds US institutional flow on top of the European close. Volume is high and technical levels are respected. Your bot is identifying stronger edges during this window.',
    }
  if (code.startsWith('GOLD_'))
    return {
      label: `London/NY overlap — ${code.replace('GOLD_', '')} (filling Gold slot)`,
      body:  'These trades fill in during the Gold hour when Gold is unavailable (weekend, news blackout). They pick up overflow institutional flow from the London/NY overlap window.',
    }
  // Pure off-hours codes (R75, HZ75V, R100, etc.) — no special label
  return null
}

export default function LiveInsights({ trades }: Props) {
  if (trades.length < 5) return null

  const wins    = trades.filter(t => t.result === 'WIN').length
  const losses  = trades.filter(t => t.result === 'LOSS').length
  const winRate = wr(trades)

  // Payout-based breakeven
  // Use payout_pct field where available; fallback uses WIN trades only
  // (LOSS trades have payout=0 which would give -100% and destroy the average)
  const payoutSamples = trades.filter(t => t.payout_pct != null)
  const avgPayout = payoutSamples.length
    ? payoutSamples.reduce((s, t) => s + t.payout_pct!, 0) / payoutSamples.length
    : (() => {
        const winTrades = trades.filter(t => t.result === 'WIN' && t.payout > 0 && t.stake > 0)
        return winTrades.length
          ? winTrades.reduce((s, t) => s + (t.payout / t.stake - 1) * 100, 0) / winTrades.length
          : 85  // safe default if no data
      })()
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

  // Best session — only named sessions with a proper label (skip raw off-hours codes)
  const sessionMap: Record<string, Trade[]> = {}
  trades.forEach(t => {
    const s = t.session_name ?? 'R75'
    if (!sessionMap[s]) sessionMap[s] = []
    sessionMap[s].push(t)
  })
  const bestSession = Object.entries(sessionMap)
    .filter(([code, ts]) => ts.length >= 3 && sessionLabel(code) !== null)
    .sort(([, a], [, b]) => wr(b) - wr(a))[0]

  // Trend
  const recent10 = trades.slice(-10)
  const recentWr  = wr(recent10)
  const trend = recentWr > winRate + 5 ? 'improving' : recentWr < winRate - 5 ? 'declining' : 'stable'

  // Balance change — only from trades that have balance logged
  const balTrades = trades.filter(t => t.balance != null && t.balance > 0)
  const firstBal  = balTrades[0]?.balance ?? 0
  const lastBal   = balTrades[balTrades.length - 1]?.balance ?? 0
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
      body: `At ${avgPayout.toFixed(1)}% average payout, you need to win ${breakeven}% of trades just to break even. You're at ${winRate}% right now. This is why we're on demo trading — the bot is still calibrating. The v10 signal improvements (CRT, OTE+OB, EQL/EQH sweep, ORB) are designed to push this higher over the next 200 trades.`,
    })
  }

  // 2. Regime insight
  if (bestRegime) {
    const [name, ts] = bestRegime
    const label = name === 'RANGING'       ? 'Ranging (sideways) markets'
      : name === 'TRENDING_BULL'           ? 'Bullish trending markets'
      : name === 'TRENDING_BEAR'           ? 'Bearish trending markets'
      : name === 'TRENDING'               ? 'Trending markets (all directions)'
      : name
    insights.push({
      icon: '🔀', colour: '#6366f1',
      title: `Your bot's sweet spot: ${label} (${wr(ts)}% win rate)`,
      body: name === 'RANGING'
        ? `Ranging means price is bouncing between a ceiling and a floor — not breaking out strongly. Your bot was built for this: RSI, Bollinger Bands, Z-Score and OTE zones all catch these bounces. ${wr(ts)}% win rate here is real edge.`
        : `Your bot wins ${wr(ts)}% of trades in ${label.toLowerCase()}. It uses ADX and HTF Bias to detect these conditions and aligns its direction with the dominant trend — then waits for a sweep + OB retrace to enter.`,
    })
  }

  // 3. Session insight
  if (bestSession) {
    const [code, ts] = bestSession
    const info = sessionLabel(code)!
    insights.push({
      icon: '🕐', colour: '#38bdf8',
      title: `Best trading window: ${info.label} at ${wr(ts)}% win rate`,
      body:  info.body,
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
  if (balTrades.length >= 2) {
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
  }

  // 6. EV signal
  if (!evPositive && trades.length >= 20) {
    insights.push({
      icon: '🧮', colour: '#ef4444',
      title: 'Expected value is currently negative — thresholds help fix this',
      body: `Expected value (EV) is the mathematical profit you'd make per $1 bet over time. Right now it's slightly negative, which is why the score threshold is set at 11+ and the v10 signal quality improvements are active. EV turns positive once you consistently hit ${breakeven}%+ win rate. The bot is calibrating toward that.`,
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
