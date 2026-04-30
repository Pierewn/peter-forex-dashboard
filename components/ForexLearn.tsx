'use client'
import { Trade } from '@/lib/supabase'
import { useState } from 'react'

interface Props { trades: Trade[] }

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
      {children}
    </div>
  )
}

function SectionTitle({ emoji, children }: { emoji: string; children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{children}</div>
    </div>
  )
}

function Term({ word, children }: { word: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #1e2130', paddingBottom: 12, marginBottom: 12 }}>
      <button onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left' }}>
        <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: 13 }}>{word}</span>
        <span style={{ color: '#64748b', fontSize: 16 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.75, marginTop: 8, paddingLeft: 4 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Insight({ icon, colour, title, body }: { icon: string; colour: string; title: string; body: string }) {
  return (
    <div style={{ background: '#141620', borderRadius: 10, padding: '1rem 1.25rem', borderLeft: `3px solid ${colour}`, marginBottom: '0.75rem' }}>
      <div style={{ fontWeight: 700, color: colour, marginBottom: 4, fontSize: 13 }}>{icon} {title}</div>
      <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7 }}>{body}</div>
    </div>
  )
}

export default function ForexLearn({ trades }: Props) {
  // Live calculation for breakeven example
  const payoutSamples = trades.filter(t => t.payout_pct != null)
  const avgPayout = payoutSamples.length
    ? payoutSamples.reduce((s, t) => s + t.payout_pct!, 0) / payoutSamples.length
    : trades.reduce((s, t) => s + ((t.payout / t.stake - 1) * 100), 0) / Math.max(trades.length, 1)
  const breakeven = Math.round(100 / (1 + avgPayout / 100) * 10) / 10
  const winRate = trades.length ? Math.round(trades.filter(t => t.result === 'WIN').length / trades.length * 1000) / 10 : 0

  return (
    <div>

      {/* How the bot trades */}
      <Card>
        <SectionTitle emoji="🤖">How This Bot Actually Makes Money</SectionTitle>
        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.8, marginBottom: '1rem' }}>
          The bot trades <strong style={{ color: '#e2e8f0' }}>binary options</strong> on currency pairs and a synthetic index. A binary option is simple: you predict whether the price will be higher or lower in exactly 5 minutes. If you're right, you win a fixed payout. If you're wrong, you lose your stake. That's it.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {[
            { icon: '📈', label: 'CALL (BUY)', desc: 'Bot predicts price will be HIGHER in 5 minutes. Placed when bullish signals agree.', colour: '#22c55e' },
            { icon: '📉', label: 'PUT (SELL)', desc: 'Bot predicts price will be LOWER in 5 minutes. Placed when bearish signals agree.', colour: '#ef4444' },
            { icon: '💰', label: 'WIN', desc: `You get your stake back PLUS the payout (currently ~${avgPayout.toFixed(0)}% return on what you bet).`, colour: '#22c55e' },
            { icon: '❌', label: 'LOSS', desc: 'You lose your entire stake. Nothing back. This is why win rate matters so much.', colour: '#ef4444' },
          ].map(item => (
            <div key={item.label} style={{ background: '#141620', borderRadius: 10, padding: '1rem', borderTop: `2px solid ${item.colour}` }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, color: item.colour, marginBottom: 4, fontSize: 13 }}>{item.label}</div>
              <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* The maths */}
      <Card>
        <SectionTitle emoji="🧮">The Most Important Number: Breakeven Win Rate</SectionTitle>
        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.8, marginBottom: '1rem' }}>
          Because you lose 100% of your stake on a loss but only win ~{avgPayout.toFixed(0)}% on a win, you need to be right <em>more than half the time</em> to make money. Here's the exact maths for your bot:
        </div>
        <div style={{ background: '#141620', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', fontFamily: 'monospace', fontSize: 13 }}>
          <div style={{ color: '#64748b', marginBottom: 8 }}>// Breakeven formula:</div>
          <div style={{ color: '#a78bfa' }}>Breakeven = 100 ÷ (100 + payout%)</div>
          <div style={{ color: '#64748b', margin: '8px 0' }}>// With your current average payout of {avgPayout.toFixed(1)}%:</div>
          <div style={{ color: '#22c55e', fontWeight: 700 }}>Breakeven = 100 ÷ (100 + {avgPayout.toFixed(1)}) = <strong>{breakeven}%</strong></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
          <div style={{ background: '#141620', borderRadius: 8, padding: '0.75rem', border: `1px solid ${winRate < breakeven ? '#ef4444' : '#1e2130'}` }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>NEED TO WIN</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>{breakeven}%+</div>
          </div>
          <div style={{ background: '#141620', borderRadius: 8, padding: '0.75rem', border: `1px solid ${winRate >= breakeven ? '#22c55e' : '#ef4444'}` }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>CURRENTLY AT</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: winRate >= breakeven ? '#22c55e' : '#ef4444' }}>{winRate}%</div>
          </div>
          <div style={{ background: '#141620', borderRadius: 8, padding: '0.75rem', border: '1px solid #1e2130' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>TARGET TO GO LIVE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>55%+</div>
          </div>
        </div>
        <div style={{ color: '#64748b', fontSize: 12, marginTop: '0.75rem', lineHeight: 1.7 }}>
          We target <strong style={{ color: '#e2e8f0' }}>55%</strong> (not just the breakeven of {breakeven}%) to have a comfortable buffer above costs and variance. At 55% win rate with {avgPayout.toFixed(0)}% payout, the bot makes roughly {Math.round((0.55 * avgPayout/100 - 0.45) * 100)}¢ profit for every $1 staked over time.
        </div>
      </Card>

      {/* Reading the charts */}
      <Card>
        <SectionTitle emoji="📊">Reading the Charts — What Each One Tells You</SectionTitle>
        {[
          {
            chart: 'Equity Curve (Overview tab)',
            what: 'A line showing your account balance over time — every dot is a completed trade.',
            good: 'A rising line = bot is profitable. Small dips are normal. Big sustained drops = something needs fixing.',
            bad: 'A flat or falling line means the current settings aren\'t working. We use this to trigger threshold changes.',
          },
          {
            chart: 'Win Rate by Confidence Score (Signal Intelligence)',
            what: 'Shows whether higher-scoring signals (more indicators agreeing) actually win more often.',
            good: 'You want a clear upward trend — score 10 should win more than score 8. If it does, the scoring system is calibrated.',
            bad: 'If low scores win as much as high scores, the indicators aren\'t adding value and thresholds need raising.',
          },
          {
            chart: 'Win Rate by Regime (Signal Intelligence)',
            what: 'Your data split by market condition: Ranging (sideways), Trending Bull (rising), Trending Bear (falling).',
            good: 'Your bot currently wins 64.7% in Ranging markets — this is your proven edge. Keep trading those.',
            bad: 'Trending Bull was 22.2% — the bot\'s indicators don\'t fire cleanly in fast-moving trend conditions on V75.',
          },
          {
            chart: 'BUY vs SELL Performance (Signal Intelligence)',
            what: 'Are you winning more on CALL (buy) trades or PUT (sell) trades?',
            good: 'Both should be roughly equal over time — the market doesn\'t permanently favour one direction.',
            bad: 'A big imbalance means the bot has a directional bias. We\'d adjust HTF trend alignment or thresholds.',
          },
          {
            chart: 'Win Rate by Session (Signal Intelligence)',
            what: 'Splits your trades by when they were taken: London (11am–8pm Kenya), NY (8pm–1am Kenya), or V75 overnight.',
            good: 'Forex pairs have clear session personalities. London tends to be the most reliable for EUR/USD.',
            bad: 'If a session consistently underperforms, we can raise the threshold for those hours or skip them.',
          },
          {
            chart: 'Day of Week (Signal Intelligence)',
            what: 'Breaks down win rate by Monday, Tuesday, Wednesday, etc.',
            good: 'Tuesday–Thursday are typically the cleanest forex trading days. Monday has gap risk, Friday has early close.',
            bad: 'If a specific day consistently loses, the bot can eventually be told to trade lighter on that day.',
          },
          {
            chart: 'Avg Score Layer — Wins vs Losses (Signal Intelligence)',
            what: 'Compares the Technical, Box Theory and Deviation sub-scores on winning trades vs losing trades.',
            good: 'Winning trades should score higher on every layer. The gap tells you which layer is adding the most value.',
            bad: 'If wins and losses score the same on a layer, that layer isn\'t helping. We\'d reduce its weight.',
          },
          {
            chart: 'Score Distribution (Signal Intelligence)',
            what: 'Shows how many trades cluster at each score range. Purple bars = number of trades. Coloured bars = win rate.',
            good: 'Most trades should cluster at 13+ score. If the bulk is at 7–9, signals are too weak.',
            bad: 'v5.14 raised the floor to 10 precisely because the 5–9 group was only winning 29% of the time.',
          },
        ].map((item, i) => (
          <div key={i} style={{ background: '#141620', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 8, fontSize: 13 }}>📈 {item.chart}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: 12 }}>
              <div><span style={{ color: '#6366f1', fontWeight: 700 }}>What it shows: </span><span style={{ color: '#94a3b8' }}>{item.what}</span></div>
              <div><span style={{ color: '#22c55e', fontWeight: 700 }}>✅ Good sign: </span><span style={{ color: '#94a3b8' }}>{item.good}</span></div>
              <div><span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ Warning sign: </span><span style={{ color: '#94a3b8' }}>{item.bad}</span></div>
            </div>
          </div>
        ))}
      </Card>

      {/* Indicators glossary */}
      <Card>
        <SectionTitle emoji="📖">Indicator Glossary — What the Bot Is Actually Measuring</SectionTitle>
        <div style={{ color: '#64748b', fontSize: 12, marginBottom: '1rem' }}>Tap any term to expand the explanation.</div>
        <Term word="RSI — Relative Strength Index (score: up to 4 pts)">
          Measures momentum on a scale of 0–100. Below 30 = price has fallen too far too fast (oversold → likely to bounce UP). Above 70 = price has risen too fast (overbought → likely to fall DOWN). The bot also looks for RSI Divergence — when price makes a new high but RSI doesn't, it's a hidden warning sign of a reversal.
        </Term>
        <Term word="MACD — Moving Average Convergence Divergence (score: up to 2 pts)">
          Tracks the difference between a fast and slow moving average of price. When the MACD histogram crosses from negative to positive, momentum is shifting UP (bullish). Negative to positive crossover = bearish. The bot uses this to confirm the direction of the signal.
        </Term>
        <Term word="Bollinger Bands (score: up to 2 pts)">
          Three lines around price: a middle average, an upper band and a lower band. When price touches the lower band, it's statistically stretched DOWN and likely to snap back up. When it touches the upper band, it's stretched UP and likely to fall. Your bot uses this for mean-reversion trades in ranging markets.
        </Term>
        <Term word="ADX — Average Directional Index (score: up to 2 pts)">
          Measures how STRONGLY the market is trending — not the direction, just the strength. ADX below 20 = weak trend (market is ranging). ADX 20–25 = moderate trend. ADX 25+ = strong trend. Your bot uses this to classify the market regime. Low ADX → ranging sub-bot. High ADX → trending sub-bot.
        </Term>
        <Term word="Z-Score (score: up to 2 pts)">
          Measures how far price has moved from its recent average, in standard deviations. A Z-Score of +2 means price is 2 standard deviations above average — statistically unlikely to continue and likely to revert. Think of it as a rubber band: the more it stretches, the harder it snaps back.
        </Term>
        <Term word="Box Theory — Monthly/Weekly/Daily S&R (score: up to 6 pts)">
          Support and Resistance levels are like invisible floors and ceilings in the market. The Monthly high/low, Weekly high/low and Daily high/low act as these levels. Price bounces off them repeatedly — often at exactly the same price over days, weeks and months. Trading NEAR these levels gives the bot a much higher probability of a bounce.
        </Term>
        <Term word="Fibonacci Retracement (score: up to 2 pts)">
          Fibonacci levels (23.6%, 38.2%, 61.8%, 78.6%) are mathematical ratios that appear repeatedly in financial markets. When a market rallies and then retraces, it tends to find support or resistance at exactly these ratios. The 61.8% level (called the 'golden ratio') is the strongest. The bot looks for price sitting AT a Fibonacci level as extra confirmation.
        </Term>
        <Term word="FVG — Fair Value Gap (SMC, score: up to 2 pts)">
          A Fair Value Gap is a gap left in price caused by a very fast, aggressive move (a 3-candle pattern where the first and third candles don't overlap). Institutional traders come back to fill these gaps later — price acts like a magnet to FVGs. The bot detects nearby FVGs as a high-probability entry zone.
        </Term>
        <Term word="Order Block (SMC, score: up to 2 pts)">
          The last big bullish or bearish candle BEFORE a major price move. This is where institutional traders (banks, hedge funds) placed their large orders. Price often returns to these levels to 'retest' them before continuing. The bot identifies these blocks and treats them as key entry zones.
        </Term>
        <Term word="BOS — Break of Structure (SMC, score: up to 1 pt)">
          Market structure is a series of higher highs and higher lows (uptrend) or lower highs and lower lows (downtrend). A Break of Structure is when price violates this pattern — breaking a prior high in a downtrend, for example. It signals a potential trend change and gives the bot directional confidence.
        </Term>
        <Term word="Kelly Criterion — Stake Sizing">
          A mathematical formula that calculates the optimal percentage of your account to bet on each trade, based on your actual win rate and payout. Too small = leaves money on the table. Too large = risks ruin from a losing streak. Your bot uses a modified version: quarter-Kelly (conservative) scaled up to half-Kelly only on very high confidence signals (score 15+), with a hard 2% of balance maximum.
        </Term>
        <Term word="Market Regime — Ranging vs Trending">
          The bot classifies every market condition into one of four states before deciding whether to trade: RANGING (price bouncing in a channel), TRENDING_BULL (price rising strongly), TRENDING_BEAR (price falling strongly), QUIET/VOLATILE (no valid structure). Each regime activates a different sub-strategy and requires a different minimum score. This is how hedge funds work — they don't use one fixed strategy, they adapt.
        </Term>
        <Term word="HTF Bias — Higher Timeframe Trend">
          Before placing a trade, the bot checks both the 1-hour and 4-hour charts. If both show an uptrend (price above EMAs, MACD positive), the bot only takes BUY trades — never fights the big picture. If both show downtrend, only SELL. If they disagree, the signal gets a penalty. This is the ICT principle: 'trade in the direction of the higher timeframe.'
        </Term>
        <Term word="OTE — Optimal Trade Entry (ICT concept)">
          When a market makes a strong move and then pulls back, the ideal entry zone is between the 61.8% and 78.6% Fibonacci retracement of that move. This is called the OTE zone. It's where institutional traders re-enter in the direction of the original move. The bot scores extra points when price pulls back into an OTE zone AND an FVG is present there.
        </Term>
        <Term word="Premium / Discount Zones (ICT concept)">
          In any price range, the top 50% is the Premium zone (expensive) and the bottom 50% is the Discount zone (cheap). Smart traders buy in the Discount zone and sell in the Premium zone. The bot uses Z-Score to determine which zone price is in and gives bonus points for entries that match this logic.
        </Term>
      </Card>

      {/* Risk management */}
      <Card>
        <SectionTitle emoji="🛡️">How the Bot Protects Your Money</SectionTitle>
        {[
          {
            icon: '🛑', colour: '#ef4444', rule: '3% Daily Kill Switch',
            desc: 'If the bot loses more than 3% of your starting balance in a single day, it stops trading and sleeps until midnight Kenya time. A bad day never becomes a catastrophe. Think of it as a circuit breaker.',
          },
          {
            icon: '📅', colour: '#eab308', rule: '8% Weekly Limit',
            desc: 'If losses reach 8% of your peak balance in a week, the bot rests until Monday. This prevents a bad week from spiralling into a bad month.',
          },
          {
            icon: '📉', colour: '#f97316', rule: '10% Drawdown Halt',
            desc: 'If the account drops 10% below its highest ever balance (the peak), trading stops for the day. This protects against a slow bleed that the daily limit alone might miss.',
          },
          {
            icon: '⚠️', colour: '#eab308', rule: 'Soft De-Risk at 1.5%',
            desc: 'Before the 3% kill switch, at 1.5% daily loss, Kelly stakes are cut in half automatically. The bot is saying: "we\'re having a bad day, let\'s be careful" without stopping completely.',
          },
          {
            icon: '🔄', colour: '#6366f1', rule: 'Recovery Mode (3 trades)',
            desc: 'After 3 consecutive losses, the bot pauses 2 minutes then trades at 50% stake for the next 3 trades. It\'s easing back in rather than doubling down — the opposite of what a losing gambler does.',
          },
          {
            icon: '✅', colour: '#22c55e', rule: '2x Signal Confirmation',
            desc: 'The bot never acts on a single signal. The same direction must appear on two consecutive scans (about 1 minute apart). This eliminates one-candle false signals — if the market is really moving, it shows up consistently.',
          },
          {
            icon: '⏭️', colour: '#38bdf8', rule: 'Stale Entry Guard',
            desc: 'After a signal fires, there\'s a 60-second confirmation wait, then a probe API call. If price has already moved more than 0.8% in the wrong direction during that wait, the bot skips the trade. The setup is stale — a new one will come.',
          },
        ].map(item => (
          <Insight key={item.rule} icon={item.icon} colour={item.colour} title={item.rule} body={item.desc} />
        ))}
      </Card>

      {/* The roadmap */}
      <Card>
        <SectionTitle emoji="🗺️">The Journey — Where You Are Now</SectionTitle>
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          {[
            {
              phase: 'Phase 1 — Sentinel (COMPLETE ✅)', colour: '#22c55e',
              desc: `Collect 50+ trades on V75 to calibrate the scoring system. Done — 53 trades collected, RANGING edge confirmed at 64.7% win rate. Thresholds raised from this data in v5.14.`,
            },
            {
              phase: 'Phase 2 — Forex Paper Trading (YOU ARE HERE 📍)', colour: '#6366f1',
              desc: 'Apply the calibrated system to real forex pairs (EUR/USD, GBP/USD) with demo money. Target: 55%+ win rate over 100 forex trades. This proves the signals work on real markets with real spreads and real session dynamics.',
            },
            {
              phase: 'Phase 3 — Micro Live (NEXT)', colour: '#64748b',
              desc: 'Move to a small live account ($500–$1,000) with real money. Same bot, same rules, tiny stakes. This tests execution quality — are fills clean? Does the payout match what was quoted? Are there any real-money surprises?',
            },
            {
              phase: 'Phase 4 — Compounding (FUTURE)', colour: '#64748b',
              desc: 'Once Phase 3 confirms the edge is real, Kelly criterion scales stakes with the growing balance. The account compounds — a proven 55% win rate at 90% payout is roughly 5-8% monthly return on capital if managed correctly.',
            },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.colour, marginTop: 2, flexShrink: 0 }} />
                {i < 3 && <div style={{ width: 2, flex: 1, background: '#2a2d3a', marginTop: 4 }} />}
              </div>
              <div style={{ paddingBottom: '0.5rem' }}>
                <div style={{ fontWeight: 700, color: p.colour, fontSize: 13, marginBottom: 4 }}>{p.phase}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick reference */}
      <Card>
        <SectionTitle emoji="⚡">Quick Reference — Numbers That Matter</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Breakeven win rate', value: `${breakeven}%`, note: `at ${avgPayout.toFixed(0)}% avg payout`, colour: '#e2e8f0' },
            { label: 'Target win rate', value: '55%', note: 'to go live', colour: '#6366f1' },
            { label: 'Your current rate', value: `${winRate}%`, note: `over ${trades.length} trades`, colour: winRate >= breakeven ? '#22c55e' : '#ef4444' },
            { label: 'Max stake per trade', value: '2% of balance', note: 'Kelly hard ceiling', colour: '#38bdf8' },
            { label: 'Daily loss limit', value: '3%', note: 'then sleep until midnight Kenya', colour: '#ef4444' },
            { label: 'Signal confirmations', value: '2×', note: 'same direction before trading', colour: '#a78bfa' },
            { label: 'Max score possible', value: '32 pts', note: 'all indicators agree', colour: '#eab308' },
            { label: 'Min score to trade', value: '10 pts', note: 'raised from 8 in v5.14', colour: '#22c55e' },
          ].map(item => (
            <div key={item.label} style={{ background: '#141620', borderRadius: 10, padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: item.colour }}>{item.value}</div>
              <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
