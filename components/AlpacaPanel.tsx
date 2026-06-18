'use client'
import { Trade } from '@/lib/supabase'

const ALPACA_PAPER_BASE = 100_000

interface Props { trades: Trade[] }

function pnlColor(v: number) { return v >= 0 ? '#00D4AA' : '#EF4444' }
function pct(n: number, d: number) { return d ? Math.round(n / d * 1000) / 10 : 0 }

export default function AlpacaPanel({ trades }: Props) {
  const alpacaTrades = trades.filter(t => t.bot === 'peter_alpaca')
  const closed  = alpacaTrades.filter(t => t.result === 'WIN' || t.result === 'LOSS')
  const open    = alpacaTrades.filter(t => t.result === 'OPEN')
  const wins    = closed.filter(t => t.result === 'WIN').length
  const losses  = closed.filter(t => t.result === 'LOSS').length
  const wr      = pct(wins, closed.length)
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0)
  const equity  = ALPACA_PAPER_BASE + totalPnl

  const today    = new Date().toISOString().slice(0, 10)
  const todayPnl = closed
    .filter(t => (t.ts ?? '').slice(0, 10) === today)
    .reduce((s, t) => s + (t.pnl || 0), 0)

  const spyTrades = closed.filter(t => t.symbol === 'SPY')
  const btcTrades = closed.filter(t => t.symbol === 'BTC/USD')
  const spyPnl    = spyTrades.reduce((s, t) => s + (t.pnl || 0), 0)
  const btcPnl    = btcTrades.reduce((s, t) => s + (t.pnl || 0), 0)
  const spyWr     = pct(spyTrades.filter(t => t.result === 'WIN').length, spyTrades.length)
  const btcWr     = pct(btcTrades.filter(t => t.result === 'WIN').length, btcTrades.length)

  const card = {
    background: '#0B1120',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  } as const

  const metricBox = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: '14px 18px',
  } as const

  if (alpacaTrades.length === 0) {
    return (
      <div style={card}>
        <div className="text-xs font-bold tracking-widest mb-4" style={{ color: '#64748B' }}>
          ALPACA BOT — PAPER TRADING
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="text-4xl font-mono font-bold" style={{ color: '#64748B' }}>—</div>
          <div className="text-sm font-semibold" style={{ color: '#94A3B8' }}>No Alpaca trades yet</div>
          <div className="text-xs text-center max-w-sm" style={{ color: '#64748B' }}>
            Paper account active ($100,000). Bot scans SPY + BTC/USD every 5 min
            for liquidity sweep signals. First trade incoming during US market hours.
          </div>
          <div className="mt-2 flex gap-2">
            {['SPY', 'BTC/USD'].map(s => (
              <span key={s} className="text-xs px-3 py-1 rounded font-mono font-bold"
                style={{ background: 'rgba(0,212,170,0.08)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.2)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header card */}
      <div style={card}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold tracking-widest" style={{ color: '#64748B' }}>
              ALPACA BOT — PAPER TRADING
            </div>
            <div className="text-xs mt-1" style={{ color: '#475569' }}>
              Broker: Alpaca Markets &nbsp;·&nbsp; SPY + BTC/USD &nbsp;·&nbsp; Strategy: Liquidity Sweep + EMA + RSI
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded font-bold tracking-wider"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
            PAPER
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div style={metricBox}>
            <div className="text-xs mb-1" style={{ color: '#64748B' }}>PAPER EQUITY</div>
            <div className="text-xl font-bold font-mono" style={{ color: '#F1F5F9' }}>
              ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs mt-1" style={{ color: pnlColor(totalPnl) }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} all-time
            </div>
          </div>

          <div style={metricBox}>
            <div className="text-xs mb-1" style={{ color: '#64748B' }}>TODAY P&amp;L</div>
            <div className="text-xl font-bold font-mono" style={{ color: pnlColor(todayPnl) }}>
              {todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}
            </div>
          </div>

          <div style={metricBox}>
            <div className="text-xs mb-1" style={{ color: '#64748B' }}>WIN RATE</div>
            <div className="text-xl font-bold font-mono"
              style={{ color: wr >= 55 ? '#00D4AA' : wr >= 50 ? '#F59E0B' : '#EF4444' }}>
              {wr}%
            </div>
            <div className="text-xs mt-1" style={{ color: '#475569' }}>
              {wins}W / {losses}L &nbsp;·&nbsp; {closed.length} trades
            </div>
          </div>

          <div style={metricBox}>
            <div className="text-xs mb-1" style={{ color: '#64748B' }}>OPEN NOW</div>
            <div className="text-xl font-bold font-mono"
              style={{ color: open.length > 0 ? '#F59E0B' : '#64748B' }}>
              {open.length}
            </div>
          </div>
        </div>
      </div>

      {/* Per-instrument breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {[
          { sym: 'SPY',     name: 'S&P 500 ETF',   trd: spyTrades, pnl: spyPnl, wr: spyWr, color: '#818CF8' },
          { sym: 'BTC/USD', name: 'Bitcoin / USD',  trd: btcTrades, pnl: btcPnl, wr: btcWr, color: '#F59E0B' },
        ].map(({ sym, name, trd, pnl, wr: w, color }) => (
          <div key={sym} style={card}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs font-bold tracking-widest" style={{ color }}>{sym}</span>
              <span className="text-xs" style={{ color: '#475569' }}>{name}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs" style={{ color: '#64748B' }}>P&amp;L</div>
                <div className="text-base font-bold font-mono" style={{ color: pnlColor(pnl) }}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: '#64748B' }}>WIN RATE</div>
                <div className="text-base font-bold font-mono"
                  style={{ color: w >= 55 ? '#00D4AA' : w >= 50 ? '#F59E0B' : '#EF4444' }}>
                  {trd.length ? `${w}%` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: '#64748B' }}>TRADES</div>
                <div className="text-base font-bold font-mono" style={{ color: '#F1F5F9' }}>{trd.length}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Open positions */}
      {open.length > 0 && (
        <div style={card}>
          <div className="text-xs font-bold tracking-widest mb-3" style={{ color: '#64748B' }}>OPEN POSITIONS</div>
          <div className="space-y-2">
            {open.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span className="text-xs font-mono font-bold" style={{ color: '#F59E0B' }}>{t.symbol}</span>
                <span className="text-xs font-bold"
                  style={{ color: t.direction === 'BUY' ? '#00D4AA' : '#EF4444' }}>{t.direction}</span>
                <span className="text-xs font-mono" style={{ color: '#94A3B8' }}>
                  ${(t.stake || 0).toFixed(2)} notional
                </span>
                <span className="text-xs" style={{ color: '#64748B' }}>
                  {(t.ts ?? '').slice(0, 16).replace('T', ' ')} UTC
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent trades table */}
      <div style={card}>
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: '#64748B' }}>RECENT TRADES</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: '#475569' }}>
                {['Time (UTC)', 'Symbol', 'Dir', 'Stake', 'P&L', 'Result', 'Signal'].map(h => (
                  <th key={h} className="text-left pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...alpacaTrades].reverse().slice(0, 20).map((t, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="py-1.5 pr-4" style={{ color: '#64748B' }}>
                    {(t.ts ?? '').slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-1.5 pr-4" style={{ color: '#818CF8' }}>{t.symbol}</td>
                  <td className="py-1.5 pr-4 font-bold"
                    style={{ color: t.direction === 'BUY' ? '#00D4AA' : '#EF4444' }}>
                    {t.direction}
                  </td>
                  <td className="py-1.5 pr-4" style={{ color: '#94A3B8' }}>
                    ${(t.stake || 0).toFixed(2)}
                  </td>
                  <td className="py-1.5 pr-4 font-bold" style={{ color: pnlColor(t.pnl || 0) }}>
                    {t.result === 'OPEN'
                      ? '—'
                      : `${(t.pnl || 0) >= 0 ? '+' : ''}$${(t.pnl || 0).toFixed(2)}`}
                  </td>
                  <td className="py-1.5 pr-4 font-bold"
                    style={{ color: t.result === 'WIN' ? '#00D4AA' : t.result === 'LOSS' ? '#EF4444' : '#F59E0B' }}>
                    {t.result}
                  </td>
                  <td className="py-1.5 pr-4" style={{ color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.reasons ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edge-building progress */}
      <div style={{ ...card, background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.12)' }}>
        <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#00D4AA' }}>
          EDGE-BUILDING PROGRESS
        </div>
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, pct(closed.length, 50))}%`, background: '#00D4AA' }} />
          </div>
          <span className="text-xs font-mono font-bold" style={{ color: '#00D4AA' }}>
            {closed.length} / 50 trades
          </span>
        </div>
        <div className="text-xs" style={{ color: '#475569' }}>
          Target: 50 closed trades to validate edge. Go live when WR &gt; 55% sustained over 50+ trades.
        </div>
      </div>
    </div>
  )
}
