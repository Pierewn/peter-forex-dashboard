'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

export default function LiveTicker({ trades }: Props) {
  if (!trades.length) return null

  const last20 = [...trades].reverse().slice(0, 20)

  const items = last20.map((t, i) => {
    const sym    = t.symbol ?? 'R_75'
    const dir    = t.direction
    const result = t.result
    const pnl    = t.pnl || 0
    const sign   = pnl >= 0 ? '+' : ''
    const color  = result === 'WIN' ? '#00D4AA' : result === 'LOSS' ? '#EF4444' : '#64748B'
    return { key: i, sym, dir, result, pnl, sign, color }
  })

  // Duplicate for seamless loop
  const doubled = [...items, ...items]

  return (
    <div
      className="overflow-hidden"
      style={{ background: '#060B14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="ticker-track py-1">
        {doubled.map((item, i) => (
          <span
            key={`${item.key}-${i}`}
            className="inline-flex items-center gap-1 mx-4 text-xs font-mono shrink-0"
            style={{ color: item.color }}
          >
            <span style={{ color: '#64748B' }}>{item.sym}</span>
            <span style={{ color: item.dir === 'CALL' ? '#00D4AA' : '#EF4444' }}>{item.dir}</span>
            <span style={{ color: item.color, fontWeight: 700 }}>{item.result}</span>
            <span>{item.sign}${item.pnl.toFixed(2)}</span>
            <span style={{ color: 'rgba(255,255,255,0.08)', margin: '0 4px' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
