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

const BAR_COLOUR = (wr: number) => wr >= 60 ? '#10b981' : wr >= 50 ? '#3b82f6' : wr >= 40 ? '#f59e0b' : '#ef4444'

const tooltipStyle = { 
  backgroundColor: '#18181b', 
  border: '1px solid #27272a', 
  borderRadius: '8px', 
  padding: '8px 12px',
  fontSize: '12px'
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</h4>
      {subtitle && <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>}
      {children}
    </div>
  )
}

export default function SignalIntelligence({ trades }: Props) {
  if (trades.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground">Need at least 2 trades to show signal intelligence. Keep running the bot!</p>
      </div>
    )
  }

  const byScore = groupBy(trades, t => t.score)
  const scoreData = Object.entries(byScore)
    .map(([score, ts]) => ({ score: `${score}/32`, wr: winRate(ts), count: ts.length }))
    .sort((a, b) => parseInt(a.score) - parseInt(b.score))

  const calls = trades.filter(t => t.direction === 'CALL')
  const puts = trades.filter(t => t.direction === 'PUT')
  const dirData = [
    { name: 'BUY (CALL)', wr: winRate(calls), count: calls.length },
    { name: 'SELL (PUT)', wr: winRate(puts), count: puts.length },
  ]

  const wins = trades.filter(t => t.result === 'WIN').length
  const losses = trades.filter(t => t.result === 'LOSS').length
  const pieData = [
    { name: 'Wins', value: wins, fill: '#10b981' },
    { name: 'Losses', value: losses, fill: '#ef4444' },
  ]

  const fibTrades = trades.filter(t => t.fib_hit && t.fib_hit !== 'none')
  const byFib = groupBy(fibTrades, t => t.fib_hit)
  const fibData = Object.entries(byFib)
    .map(([fib, ts]) => ({ fib, wr: winRate(ts), count: ts.length }))
    .sort((a, b) => b.wr - a.wr)

  const avgTech = (ts: Trade[]) => ts.reduce((s, t) => s + t.tech_score, 0) / ts.length
  const avgBox = (ts: Trade[]) => ts.reduce((s, t) => s + t.box_score, 0) / ts.length
  const avgDev = (ts: Trade[]) => ts.reduce((s, t) => s + t.dev_score, 0) / ts.length
  const winTrades = trades.filter(t => t.result === 'WIN')
  const lossTrades = trades.filter(t => t.result === 'LOSS')
  const layerData = winTrades.length && lossTrades.length ? [
    { layer: 'Technical', wins: +avgTech(winTrades).toFixed(2), losses: +avgTech(lossTrades).toFixed(2) },
    { layer: 'Box Theory', wins: +avgBox(winTrades).toFixed(2), losses: +avgBox(lossTrades).toFixed(2) },
    { layer: 'Deviation', wins: +avgDev(winTrades).toFixed(2), losses: +avgDev(lossTrades).toFixed(2) },
  ] : []

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

  const SYMBOL_NAMES: Record<string, string> = {
    'R_75': 'V75',
    'frxEURUSD': 'EUR/USD',
    'frxGBPUSD': 'GBP/USD',
    'frxXAUUSD': 'Gold',
  }
  const bySymbol = groupBy(trades, t => t.symbol ?? 'R_75')
  const symbolData = Object.entries(bySymbol)
    .map(([sym, ts]) => ({ name: SYMBOL_NAMES[sym] ?? sym, wr: winRate(ts), count: ts.length }))
    .sort((a, b) => b.wr - a.wr)

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const byDow = groupBy(trades, t => t.day_of_week ?? new Date(t.ts).getDay())
  const dowData = [0, 1, 2, 3, 4]
    .filter(d => byDow[d]?.length)
    .map(d => ({ day: DOW[d], wr: winRate(byDow[d]), count: byDow[d].length }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {/* Win/Loss Pie */}
      <Card title="Overall Win vs Loss">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie 
              data={pieData} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              outerRadius={70}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {trades.length} total trades &middot; {winRate(trades)}% win rate
        </p>
      </Card>

      {/* Win rate by score */}
      <Card title="Win Rate by Confidence Score" subtitle="Higher score = more indicators agreed">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={scoreData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="score" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Win Rate']} />
            <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
              {scoreData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* BUY vs SELL */}
      <Card title="BUY vs SELL Performance" subtitle="Is the bot better at calling rises or falls?">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dirData} barSize={50}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { count: number } }) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
            <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
              {dirData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Layer contribution */}
      {layerData.length > 0 && (
        <Card title="Avg Score Layer — Wins vs Losses" subtitle="Which indicator layers score higher on winning trades?">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={layerData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="layer" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="wins" name="Wins" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Fibonacci */}
      {fibData.length > 0 && (
        <Card title="Fibonacci Level Performance" subtitle="Which fib levels actually deliver?">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={fibData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="fib" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { count: number } }) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
                {fibData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ADX */}
      <Card title="Win Rate by ADX (Trend Strength)" subtitle="ADX measures how strongly the market is trending">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={adxData} barSize={35}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { count: number } }) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
            <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
              {adxData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* By Asset */}
      {symbolData.length > 1 && (
        <Card title="Win Rate by Asset" subtitle="Which assets perform better?">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={symbolData} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { count: number } }) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
                {symbolData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* By Day */}
      {dowData.length >= 3 && (
        <Card title="Win Rate by Day of Week" subtitle="Some days are structurally better">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { count: number } }) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
                {dowData.map((entry, i) => <Cell key={i} fill={BAR_COLOUR(entry.wr)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
