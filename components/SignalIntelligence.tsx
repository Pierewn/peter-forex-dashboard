'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

function winRate(trades: Trade[]) {
  if (!trades.length) return 0
  return Math.round(trades.filter(t => t.result === 'WIN').length / trades.length * 1000) / 10
}

function groupBy<T>(arr: T[], key: (item: T) => string | number) {
  const map: Record<string, T[]> = {}
  arr.forEach(item => {
    const k = String(key(item))
    if (!map[k]) map[k] = []
    map[k].push(item)
  })
  return map
}

const BAR_COLOUR = (wr: number) => wr >= 60 ? '#22c55e' : wr >= 50 ? '#6366f1' : wr >= 40 ? '#eab308' : '#ef4444'

const TipStyle = { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, padding: '8px 12px', fontSize: 12 }

export default function SignalIntelligence({ trades }: Props) {
  if (trades.length < 2) {
    return (
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Need at least 2 trades to show signal intelligence. Keep running the bot!
      </div>
    )
  }

  // Win rate by confidence score
  const byScore = groupBy(trades, t => t.score)
  const scoreData = Object.entries(byScore)
    .map(([score, ts]) => ({ score: `${score}/32`, wr: winRate(ts), count: ts.length }))
    .sort((a, b) => parseInt(a.score) - parseInt(b.score))

  // Win rate by direction
  const calls = trades.filter(t => t.direction === 'CALL')
  const puts  = trades.filter(t => t.direction === 'PUT')
  const dirData = [
    { name: '📈 BUY (CALL)', wr: winRate(calls), count: calls.length },
    { name: '📉 SELL (PUT)',  wr: winRate(puts),  count: puts.length  },
  ]

  // Win/Loss pie
  const wins   = trades.filter(t => t.result === 'WIN').length
  const losses = trades.filter(t => t.result === 'LOSS').length
  const pieData = [
    { name: 'Wins',   value: wins,   fill: '#22c55e' },
    { name: 'Losses', value: losses, fill: '#ef4444' },
  ]

  // Fibonacci performance
  const fibTrades = trades.filter(t => t.fib_hit && t.fib_hit !== 'none')
  const byFib = groupBy(fibTrades, t => t.fib_hit)
  const fibData = Object.entries(byFib)
    .map(([fib, ts]) => ({ fib, wr: winRate(ts), count: ts.length }))
    .sort((a, b) => b.wr - a.wr)

  // Score breakdown: what layers contributed on wins vs losses
  const avgTech = (ts: Trade[]) => ts.reduce((s,t) => s + t.tech_score, 0) / ts.length
  const avgBox  = (ts: Trade[]) => ts.reduce((s,t) => s + t.box_score,  0) / ts.length
  const avgDev  = (ts: Trade[]) => ts.reduce((s,t) => s + t.dev_score,  0) / ts.length
  const winTrades  = trades.filter(t => t.result === 'WIN')
  const lossTrades = trades.filter(t => t.result === 'LOSS')
  const layerData  = winTrades.length && lossTrades.length ? [
    { layer: 'Technical',  wins: +avgTech(winTrades).toFixed(2),  losses: +avgTech(lossTrades).toFixed(2)  },
    { layer: 'Box Theory', wins: +avgBox(winTrades).toFixed(2),   losses: +avgBox(lossTrades).toFixed(2)   },
    { layer: 'Deviation',  wins: +avgDev(winTrades).toFixed(2),   losses: +avgDev(lossTrades).toFixed(2)   },
  ] : []

  // ADX distribution
  const adxBuckets: Record<string, Trade[]> = { '<20': [], '20-25': [], '25-30': [], '30-35': [], '35+': [] }
  trades.forEach(t => {
    const a = t.adx
    if (a < 20) adxBuckets['<20'].push(t)
    else if (a < 25) adxBuckets['20-25'].push(t)
    else if (a < 30) adxBuckets['25-30'].push(t)
    else if (a < 35) adxBuckets['30-35'].push(t)
    else adxBuckets['35+'].push(t)
  })
  const adxData = Object.entries(adxBuckets)
    .filter(([, ts]) => ts.length > 0)
    .map(([bucket, ts]) => ({ bucket, wr: winRate(ts), count: ts.length }))

  const SectionTitle = ({ children }: { children: string }) => (
    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
      {children}
    </div>
  )

  const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '1.5rem' }} className={className}>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>

      {/* Win/Loss Pie */}
      <Card>
        <SectionTitle>Overall Win vs Loss</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
              {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip contentStyle={TipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 8 }}>
          {trades.length} total trades · {winRate(trades)}% win rate
        </div>
      </Card>

      {/* Win rate by score */}
      <Card>
        <SectionTitle>Win Rate by Confidence Score</SectionTitle>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
          Higher score = more indicators agreed. Does it actually win more?
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={scoreData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
            <XAxis dataKey="score" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TipStyle} formatter={(v: any) => [`${v}%`, 'Win Rate']} />
            <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
              {scoreData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* BUY vs SELL performance */}
      <Card>
        <SectionTitle>BUY vs SELL Performance</SectionTitle>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
          Is the bot better at calling rises or falls?
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dirData} barSize={50}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TipStyle} formatter={(v: any, n: any, p: any) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
            <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
              {dirData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Layer contribution: wins vs losses */}
      {layerData.length > 0 && (
        <Card>
          <SectionTitle>Avg Score Layer — Wins vs Losses</SectionTitle>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            Which indicator layers score higher on winning trades?
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={layerData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="layer" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={TipStyle} />
              <Bar dataKey="wins"   name="Wins"   fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Fibonacci performance */}
      {fibData.length > 0 && (
        <Card>
          <SectionTitle>Fibonacci Level Performance</SectionTitle>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            "History always tells a story" — which fib levels actually deliver?
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={fibData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="fib" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={TipStyle} formatter={(v: any, n: any, p: any) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
                {fibData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ADX distribution */}
      <Card>
        <SectionTitle>Win Rate by ADX (Trend Strength)</SectionTitle>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
          ADX measures how strongly the market is trending. Higher = clearer trend.
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={adxData} barSize={35}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
            <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TipStyle} formatter={(v: any, n: any, p: any) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
            <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
              {adxData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

    </div>
  )
}
