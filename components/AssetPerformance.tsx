'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

const SYMBOL_LABELS: Record<string, string> = {
  R_75: 'R_75 (V75)',
  R_50: 'R_50 (V50)',
  JD75: 'JD75 (Jump75)',
  '1HZ75V': '1HZ75V (V75 1s)',
  frxXAUUSD: 'Gold / USD',
  frxGBPUSD: 'GBP / USD',
}

function wr(ts: Trade[]) {
  if (!ts.length) return 0
  return Math.round(ts.filter(t => t.result === 'WIN').length / ts.length * 1000) / 10
}

function pnl(ts: Trade[]) {
  return ts.reduce((s, t) => s + (t.pnl ?? 0), 0)
}

function wrColor(w: number) {
  if (w >= 60) return 'text-success'
  if (w >= 54) return 'text-success/80'
  if (w >= 52) return 'text-warning'
  return 'text-destructive'
}

function wrBg(w: number) {
  if (w >= 60) return 'bg-success/20'
  if (w >= 54) return 'bg-success/10'
  if (w >= 52) return 'bg-warning/10'
  return 'bg-destructive/10'
}

function pnlColor(p: number) { return p >= 0 ? 'text-success' : 'text-destructive' }

export default function AssetPerformance({ trades }: Props) {
  if (trades.length < 10) return null

  const symbolMap: Record<string, Trade[]> = {}
  trades.forEach(t => {
    const s = t.symbol ?? 'R_75'
    if (!symbolMap[s]) symbolMap[s] = []
    symbolMap[s].push(t)
  })
  const symbols = Object.entries(symbolMap)
    .filter(([, ts]) => ts.length >= 3)
    .sort(([, a], [, b]) => b.length - a.length)

  const r75Trades = trades.filter(t => (t.symbol ?? 'R_75') === 'R_75')
  const hourBuckets: Record<number, Trade[]> = {}
  for (let h = 0; h < 24; h++) hourBuckets[h] = []
  r75Trades.forEach(t => {
    const h = t.hour ?? new Date(t.ts).getUTCHours()
    if (h >= 0 && h < 24) hourBuckets[h].push(t)
  })

  const biasMap: Record<string, Trade[]> = { BULLISH: [], BEARISH: [], NEUTRAL: [] }
  trades.forEach(t => {
    const b = t.trend_bias ?? 'NEUTRAL'
    if (biasMap[b]) biasMap[b].push(t)
  })

  function hourBg(h: number) {
    const ts = hourBuckets[h]
    if (ts.length < 3) return 'bg-secondary'
    const w = wr(ts)
    if (w >= 70) return 'bg-success/30'
    if (w >= 60) return 'bg-success/15'
    if (w >= 52) return 'bg-warning/15'
    return 'bg-destructive/20'
  }

  return (
    <div className="space-y-6">
      {/* Asset Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Performance By Asset
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left pb-3 font-semibold">Asset</th>
                <th className="text-right pb-3 font-semibold">Trades</th>
                <th className="text-right pb-3 font-semibold">Wins</th>
                <th className="text-right pb-3 font-semibold">WR %</th>
                <th className="text-right pb-3 font-semibold">P&L</th>
                <th className="text-right pb-3 font-semibold">Avg Stake</th>
                <th className="text-right pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map(([sym, ts]) => {
                const w = wr(ts)
                const p = pnl(ts)
                const wins = ts.filter(t => t.result === 'WIN').length
                const avgSt = ts.reduce((s, t) => s + (t.stake ?? 0), 0) / ts.length
                const status = sym === 'R_75' ? 'Active'
                  : sym === '1HZ75V' ? 'Re-enabled'
                  : sym === 'JD75' ? 'Suspended'
                  : sym === 'R_50' ? 'Excluded'
                  : sym === 'frxXAUUSD' ? 'h15–16 UTC'
                  : '—'
                const statusColor = sym === 'R_75' || sym === '1HZ75V' ? 'text-success' : 'text-muted-foreground'
                return (
                  <tr key={sym} className="border-t border-border">
                    <td className="py-3 font-semibold text-foreground">
                      {SYMBOL_LABELS[sym] ?? sym}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">{ts.length}</td>
                    <td className="py-3 text-right text-muted-foreground">{wins}</td>
                    <td className="py-3 text-right">
                      <span className={`font-bold ${wrColor(w)}`}>{w}%</span>
                    </td>
                    <td className={`py-3 text-right font-bold ${pnlColor(p)}`}>
                      {p >= 0 ? '+' : ''}${p.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      ${avgSt.toFixed(2)}
                    </td>
                    <td className={`py-3 text-right text-xs ${statusColor}`}>
                      {status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hour Heatmap + Bias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hour Heatmap */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            R_75 Win Rate By Hour (UTC)
          </h3>
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 24 }, (_, h) => {
              const ts = hourBuckets[h]
              const w = ts.length >= 3 ? wr(ts) : null
              return (
                <div
                  key={h}
                  className={`${hourBg(h)} rounded-lg p-2 text-center border border-border/50`}
                >
                  <div className="text-[10px] text-muted-foreground font-semibold">
                    h{String(h).padStart(2, '0')}
                  </div>
                  {w !== null ? (
                    <div className={`text-xs font-bold ${wrColor(w)} mt-0.5`}>{w}%</div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5">—</div>
                  )}
                  <div className="text-[10px] text-muted-foreground/70">{ts.length}t</div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-success/30" />70%+
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-success/15" />60–70%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-warning/15" />52–60%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-destructive/20" />&lt;52%
            </span>
            <span className="ml-auto">Needs 3+ trades</span>
          </div>
        </div>

        {/* Bias Breakdown */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            By HTF Bias
          </h3>
          <div className="space-y-3">
            {[
              { label: 'BULLISH', key: 'BULLISH', icon: '📈', color: 'text-success' },
              { label: 'BEARISH', key: 'BEARISH', icon: '📉', color: 'text-destructive' },
              { label: 'NEUTRAL', key: 'NEUTRAL', icon: '↔️', color: 'text-muted-foreground' },
            ].map(({ label, key, icon, color }) => {
              const ts = biasMap[key] ?? []
              const w = wr(ts)
              const p = pnl(ts)
              if (!ts.length) return null
              return (
                <div key={key} className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${color}`}>{icon} {label}</span>
                    <span className="text-xs text-muted-foreground">{ts.length} trades</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className={`font-bold ${wrColor(w)}`}>WR {w}%</span>
                    <span className={`font-bold ${pnlColor(p)}`}>
                      {p >= 0 ? '+' : ''}${p.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${wrBg(w)} transition-all duration-500`}
                      style={{ width: `${Math.min(100, w)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            Breakeven at 92% payout: <span className="font-semibold text-foreground">52.1% WR</span>
          </div>
        </div>
      </div>
    </div>
  )
}
