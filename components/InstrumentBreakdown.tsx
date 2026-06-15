'use client'
import { Trade } from '@/lib/supabase'

interface Props { trades: Trade[] }

interface InstrumentRow {
  name: string
  key: string
  count: number
  wins: number
  wr: number | null
  color: string
  be: number
  status: string
}

export default function InstrumentBreakdown({ trades }: Props) {
  if (!trades.length) return null

  const binary      = trades.filter(t => !t.instrument || (t.instrument !== 'MULTIPLIER' && t.instrument !== 'ACCUMULATOR' && t.instrument !== 'TURBOS' && t.instrument !== 'VANILLA'))
  const multiplier  = trades.filter(t => t.instrument === 'MULTIPLIER')
  const accumulator = trades.filter(t => t.instrument === 'ACCUMULATOR')
  const turbo       = trades.filter(t => t.instrument === 'TURBOS')
  const vanilla     = trades.filter(t => t.instrument === 'VANILLA')

  const wr = (arr: Trade[]) => arr.length >= 5
    ? Math.round(arr.filter(t => t.result === 'WIN').length / arr.length * 1000) / 10
    : null

  const instruments: InstrumentRow[] = [
    {
      name: 'Binary Options', key: 'binary',
      count: binary.length, wins: binary.filter(t => t.result === 'WIN').length,
      wr: wr(binary), color: '#00D4AA', be: 52.1,
      status: (wr(binary) ?? 0) >= 52.1 ? '+EV' : 'collecting',
    },
    {
      name: 'Multiplier', key: 'multiplier',
      count: multiplier.length, wins: multiplier.filter(t => t.result === 'WIN').length,
      wr: wr(multiplier), color: '#F59E0B', be: 33.3,
      status: multiplier.length >= 5 ? ((wr(multiplier) ?? 0) >= 33.3 ? '+EV' : 'watch') : 'collecting',
    },
    {
      name: 'Accumulator', key: 'accumulator',
      count: accumulator.length, wins: accumulator.filter(t => t.result === 'WIN').length,
      wr: wr(accumulator), color: '#818CF8', be: 0,
      status: accumulator.length >= 5 ? 'active' : 'collecting',
    },
    {
      name: 'Turbo', key: 'turbo',
      count: turbo.length, wins: turbo.filter(t => t.result === 'WIN').length,
      wr: wr(turbo), color: '#38BDF8', be: 52.1,
      status: turbo.length >= 5 ? ((wr(turbo) ?? 0) >= 52.1 ? '+EV' : 'watch') : 'collecting',
    },
    {
      name: 'Vanilla', key: 'vanilla',
      count: vanilla.length, wins: vanilla.filter(t => t.result === 'WIN').length,
      wr: wr(vanilla), color: '#E879F9', be: 0,
      status: vanilla.length >= 5 ? 'active' : 'collecting',
    },
  ]

  const maxCount = Math.max(...instruments.map(i => i.count), 1)

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="text-xs font-bold tracking-widest mb-4" style={{ color: '#64748B' }}>
        INSTRUMENT BREAKDOWN
      </div>

      <div className="space-y-3">
        {instruments.map(inst => {
          const barPct = maxCount > 0 ? (inst.count / maxCount) * 100 : 0
          const wrDisplay = inst.wr !== null ? `${inst.wr}% WR` : 'collecting'
          const wrColor = inst.wr !== null
            ? (inst.wr >= inst.be ? '#00D4AA' : '#EF4444')
            : '#64748B'
          const statusColor =
            inst.status === '+EV' ? '#00D4AA' :
            inst.status === 'watch' ? '#F59E0B' :
            inst.status === 'collecting' ? '#64748B' : '#94A3B8'

          return (
            <div key={inst.key} className="flex items-center gap-3">
              {/* Name */}
              <div className="w-28 text-xs font-semibold shrink-0" style={{ color: inst.color }}>
                {inst.name}
              </div>

              {/* Count */}
              <div className="w-20 font-mono text-xs shrink-0" style={{ color: '#94A3B8' }}>
                {inst.count.toLocaleString()} trades
              </div>

              {/* WR */}
              <div className="w-24 font-mono text-xs shrink-0" style={{ color: wrColor }}>
                {wrDisplay}
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="absolute left-0 top-0 h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${barPct}%`,
                    background: inst.color,
                    opacity: 0.7,
                  }}
                />
              </div>

              {/* Status badge */}
              <div
                className="w-20 text-xs font-bold text-right shrink-0"
                style={{ color: statusColor }}
              >
                {inst.status === '+EV' ? '+EV ✓' : inst.status}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 flex gap-4 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#64748B' }}>
        <span>Binary BE: 52.1%</span>
        <span>Multiplier BE: 33.3%</span>
        <span>v16.9 engine · 7 instruments</span>
      </div>
    </div>
  )
}
