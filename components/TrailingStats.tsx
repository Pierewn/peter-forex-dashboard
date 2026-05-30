'use client'
import { Trade } from '@/lib/supabase'

export default function TrailingStats({ trades }: { trades: Trade[] }) {
  const mult   = trades.filter(t => (t as any).instrument === 'MULTIPLIER')
  const total  = mult.length
  if (total === 0) return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12,
      padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        🔒 Trailing SL Ratchet Stats
      </div>
      <div style={{ color: '#475569', fontSize: 13 }}>
        Waiting for first multiplier trades…
        <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>
          When a trade profits by more than the SL amount ($0.35), the stop loss moves to
          break-even. These trades can never return to a full loss.
        </div>
      </div>
    </div>
  )

  const ratcheted    = mult.filter(t => (t as any).trailing_activated === true)
  const ratchetN     = ratcheted.length
  const ratchetPct   = total > 0 ? Math.round(ratchetN / total * 100) : 0

  const ratchetWins  = ratcheted.filter(t => t.result === 'WIN').length
  const ratchetLoss  = ratcheted.filter(t => t.result === 'LOSS').length
  const ratchetWr    = ratchetN > 0 ? Math.round(ratchetWins / ratchetN * 100) : 0

  const normalWins   = mult.filter(t => !(t as any).trailing_activated && t.result === 'WIN').length
  const normalTotal  = total - ratchetN
  const normalWr     = normalTotal > 0 ? Math.round(normalWins / normalTotal * 100) : 0

  const multWins     = mult.filter(t => t.result === 'WIN').length
  const multWr       = Math.round(multWins / total * 100)
  const multEV       = +(multWins * 0.70 - (total - multWins) * 0.35).toFixed(2)

  const avgDuration  = mult.reduce((a, t) => a + (t.duration ?? 0), 0) / total

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12,
      padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
        🔒 Trailing SL Ratchet — Multiplier Performance
      </div>

      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 10, marginBottom: '1rem' }}>
        {[
          { label: 'Mult Trades', val: total.toString(), color: '#6366f1' },
          { label: 'Win Rate', val: `${multWr}%`, color: multWr >= 52 ? '#22c55e' : '#ef4444' },
          { label: 'Mult EV', val: `$${multEV > 0 ? '+' : ''}${multEV}`, color: multEV >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Avg Duration', val: `${avgDuration.toFixed(1)}m`, color: '#64748b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#141620', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Ratchet breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Ratcheted */}
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginBottom: 8 }}>
            🔒 Ratcheted — SL moved to break-even
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{ratchetN}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{ratchetPct}% of trades</div>
          {ratchetN > 0 && (
            <>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>{ratchetWins} WIN</span>
                {' · '}
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{ratchetLoss} LOSS</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{ratchetWr}% WR after ratchet</div>
              <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>
                {ratchetLoss === 0 ? '✅ No full losses from ratcheted trades' :
                 `${ratchetLoss} closed below break-even (SL moved but reversed hard)`}
              </div>
            </>
          )}
        </div>

        {/* Normal */}
        <div style={{ background: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.2)',
          borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>
            ⏳ No Ratchet — closed at SL/TP
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#94a3b8' }}>{normalTotal}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{total > 0 ? 100 - ratchetPct : 0}% of trades</div>
          {normalTotal > 0 && (
            <>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>{normalWins} WIN</span>
                {' · '}
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{normalTotal - normalWins} LOSS</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{normalWr}% WR</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#334155', borderTop: '1px solid #1e293b', paddingTop: 8 }}>
        Ratchet fires when unrealized profit ≥ $0.35 (SL amount). Once triggered, the worst outcome
        is break-even. Compares to original SL −$0.35.
      </div>
    </div>
  )
}
