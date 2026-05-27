'use client'
import { Trade } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { Brain, Clock, Target, TrendingUp, AlertTriangle, Zap } from 'lucide-react'

interface Props { trades: Trade[] }

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px'
}

function wr(ts: Trade[]) {
  if (!ts.length) return 0
  return Math.round(ts.filter(t => t.result === 'WIN').length / ts.length * 1000) / 10
}

const colour = (v: number) => v >= 60 ? '#10b981' : v >= 50 ? '#3b82f6' : v >= 40 ? '#f59e0b' : '#ef4444'

function Card({ title, badge, subtitle, children }: { title: string; badge?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
        {badge && (
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">{badge}</span>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>}
      {children}
    </div>
  )
}

function MiniBar({ data }: { data: { name: string; wr: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={32}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string, p: { payload: { count: number } }) => [`${v}% (${p.payload.count} trades)`, 'Win Rate']} />
        <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={colour(d.wr)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function Pending({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Clock className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{msg}</p>
    </div>
  )
}

export default function SelfLearning({ trades }: Props) {
  if (!trades.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Brain className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-semibold">No trades yet — the bot will populate this tab as it trades.</p>
      </div>
    )
  }

  const enriched = trades.filter(t => t.regime !== null && t.regime !== undefined)
  const allWins = trades.filter(t => t.result === 'WIN')
  const allLosses = trades.filter(t => t.result === 'LOSS')

  const avg = (ts: Trade[], key: keyof Trade) =>
    ts.length ? +(ts.reduce((s, t) => s + ((t[key] as number) ?? 0), 0) / ts.length).toFixed(2) : 0

  const layerData = allWins.length >= 2 && allLosses.length >= 2 ? [
    { layer: 'Technical', wins: avg(allWins, 'tech_score'), losses: avg(allLosses, 'tech_score') },
    { layer: 'Box/S&R', wins: avg(allWins, 'box_score'), losses: avg(allLosses, 'box_score') },
    { layer: 'Deviation', wins: avg(allWins, 'dev_score'), losses: avg(allLosses, 'dev_score') },
    { layer: 'SMC/ICT', wins: avg(allWins, 'smc_score'), losses: avg(allLosses, 'smc_score') },
  ] : []

  const adxRegimeData = [
    { name: 'Quiet (<20)', filter: (t: Trade) => t.adx < 20 },
    { name: 'Ranging', filter: (t: Trade) => t.adx >= 20 && t.adx < 25 },
    { name: 'Trending', filter: (t: Trade) => t.adx >= 25 && t.adx < 30 },
    { name: 'Strong (30+)', filter: (t: Trade) => t.adx >= 30 },
  ].map(b => {
    const g = trades.filter(b.filter)
    return { name: b.name, wr: wr(g), count: g.length }
  }).filter(d => d.count > 0)

  const withTrend: Trade[] = [], againstTrend: Trade[] = [], neutralTrades: Trade[] = []
  enriched.forEach(t => {
    const bias = t.trend_bias || 'NEUTRAL'
    const dir = t.direction
    if ((dir === 'CALL' && bias === 'BULLISH') || (dir === 'PUT' && bias === 'BEARISH')) withTrend.push(t)
    else if ((dir === 'CALL' && bias === 'BEARISH') || (dir === 'PUT' && bias === 'BULLISH')) againstTrend.push(t)
    else neutralTrades.push(t)
  })
  const alignData = [
    { name: 'With Trend', wr: wr(withTrend), count: withTrend.length },
    { name: 'Against', wr: wr(againstTrend), count: againstTrend.length },
    { name: 'Neutral', wr: wr(neutralTrades), count: neutralTrades.length },
  ].filter(d => d.count > 0)

  const withDuration = trades.filter(t => t.duration !== null && t.duration !== undefined)
  const durationData = [5, 7, 10]
    .map(d => {
      const g = withDuration.filter(t => t.duration === d)
      return { name: `${d} min`, wr: wr(g), count: g.length }
    })
    .filter(d => d.count > 0)

  // Insights
  const insights: { icon: React.ReactNode; text: string; good: boolean }[] = []

  if (durationData.length >= 2) {
    const best = [...durationData].sort((a, b) => b.wr - a.wr)[0]
    const worst = [...durationData].sort((a, b) => a.wr - b.wr)[0]
    if (best.name !== worst.name && best.count >= 3) {
      insights.push({
        icon: <Clock className="w-4 h-4 text-primary" />,
        text: `Best trade duration: ${best.name} at ${best.wr}% win rate (${best.count} trades). ${worst.name} trades win only ${worst.wr}%.`,
        good: best.wr >= 55,
      })
    }
  }

  if (withTrend.length >= 3 && againstTrend.length >= 3) {
    const diff = wr(withTrend) - wr(againstTrend)
    if (Math.abs(diff) > 10)
      insights.push({
        icon: diff > 0 ? <TrendingUp className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />,
        text: `Trading ${diff > 0 ? 'WITH' : 'AGAINST'} the HTF trend performs better (${Math.max(wr(withTrend), wr(againstTrend))}% vs ${Math.min(wr(withTrend), wr(againstTrend))}%)`,
        good: diff > 0
      })
  }

  const smcT = enriched.filter(t => (t.smc_score ?? 0) > 0)
  const nonSmc = enriched.filter(t => (t.smc_score ?? 0) === 0)
  if (smcT.length >= 3 && nonSmc.length >= 3) {
    const diff = wr(smcT) - wr(nonSmc)
    insights.push({
      icon: diff > 8 ? <Brain className="w-4 h-4 text-purple-400" /> : <Target className="w-4 h-4 text-primary" />,
      text: `SMC confluence: ${wr(smcT)}% win rate (${smcT.length} trades) vs ${wr(nonSmc)}% without. ${diff > 8 ? 'Adding real edge.' : 'Keep collecting data.'}`,
      good: diff > 0
    })
  }

  return (
    <div className="space-y-6">
      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              What The Bot Is Learning
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  ins.good ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
                }`}
              >
                {ins.icon}
                <span className="text-sm text-foreground">{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layer Chart + Stake Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Score Layer — Wins vs Losses" subtitle="Which indicator layers differentiate winning trades?">
          {layerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={layerData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="layer" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="wins" name="Wins" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Pending msg="Need both wins and losses to compare." />
          )}
        </Card>

        <Card title="Win Rate by ADX Regime" subtitle="Estimated from ADX — all trades">
          {adxRegimeData.length >= 2 ? <MiniBar data={adxRegimeData} /> : <Pending msg="Need more ADX variety." />}
        </Card>
      </div>

      {/* HTF Alignment + Duration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="HTF Trend Alignment" badge="v5.11+" subtitle="Does trading WITH the 1H+4H trend improve results?">
          {enriched.length < 5 ? (
            <Pending msg={`${enriched.length} enriched trades so far — builds from next trade.`} />
          ) : alignData.length < 2 ? (
            <Pending msg="Need trades in multiple trend directions." />
          ) : (
            <MiniBar data={alignData} />
          )}
        </Card>

        <Card title="Win Rate by Trade Duration" badge="v6.2+" subtitle="5 min (ranging), 7 min (trending), 10 min (strong)">
          {withDuration.length < 5 ? (
            <Pending msg="Needs v6.2+ trades with duration data." />
          ) : durationData.length < 2 ? (
            <Pending msg="Need trades at multiple durations." />
          ) : (
            <MiniBar data={durationData} />
          )}
        </Card>
      </div>
    </div>
  )
}
