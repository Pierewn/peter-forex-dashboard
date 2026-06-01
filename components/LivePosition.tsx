'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OpenPosition {
  contract_id:   string
  symbol:        string
  asset_name:    string
  direction:     string
  contract_type: string
  multiplier:    number
  stake:         number
  sl_amount:     number
  tp_amount:     number
  score:         number
  phase:         string
  htf_bias:      string
  entry_time:    string
  entry_price:   number
  status:        string
  result:        string | null
  pnl:           number | null
  duration_min:  number | null
}

export default function LivePosition() {
  const [pos, setPos]      = useState<OpenPosition | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const load = async () => {
    const { data } = await supabase
      .from('open_positions')
      .select('*')
      .eq('id', 1)
      .single()
    if (data?.status === 'OPEN') setPos(data)
    else setPos(null)
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 10000)   // refresh every 10s
    return () => clearInterval(iv)
  }, [])

  // Live elapsed timer
  useEffect(() => {
    if (!pos) return
    const start = new Date(pos.entry_time).getTime()
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [pos?.entry_time])

  if (!pos) return null   // no open trade — card hidden

  const dir    = pos.direction === 'CALL' ? '📈 LONG' : '📉 SHORT'
  const mins   = Math.floor(elapsed / 60)
  const secs   = elapsed % 60
  const pnlPct = pos.stake > 0 ? ((pos.tp_amount / pos.stake) * 100).toFixed(0) : '0'

  const phaseColor: Record<string, string> = {
    PULLBACK_BULL: '#22c55e', MARKUP: '#86efac', DISTRIBUTION: '#f97316',
    PULLBACK_BEAR: '#f97316', MARKDOWN: '#ef4444', ACCUMULATION: '#eab308', RANGING: '#64748b',
  }
  const pc = phaseColor[pos.phase] ?? '#64748b'
  const htfColor = pos.htf_bias === 'BULLISH' ? '#22c55e' : pos.htf_bias === 'BEARISH' ? '#ef4444' : '#64748b'

  const isBinary     = !pos.contract_type || pos.contract_type === 'BINARY' || pos.contract_type === 'CALL' || pos.contract_type === 'PUT'
  const instrumentLabel = isBinary ? 'Binary Option' : `Multiplier ×${pos.multiplier}`
  const accentColor     = isBinary ? '#22c55e' : '#f59e0b'

  return (
    <div style={{
      background: isBinary
        ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))'
        : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
      border: `1px solid ${isBinary ? 'rgba(34,197,94,0.35)' : 'rgba(99,102,241,0.4)'}`,
      borderRadius: 14,
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Live pulse indicator */}
      <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
          display: 'inline-block', boxShadow: '0 0 8px #22c55e', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>LIVE</span>
      </div>

      <div style={{ fontSize: 11, color: accentColor, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 10 }}>
        {isBinary ? '🎯 Open Binary Position' : '🔢 Open Multiplier Position'} — {instrumentLabel}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>

        <div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>ASSET</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{pos.asset_name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{pos.symbol}</div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>DIRECTION</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: pos.direction === 'CALL' ? '#22c55e' : '#ef4444' }}>
            {dir}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{instrumentLabel}</div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>RISK / REWARD</div>
          {isBinary ? (
            <>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                <span style={{ color: '#ef4444' }}>-${pos.stake?.toFixed(2) ?? '?'}</span>
                {' / '}
                <span style={{ color: '#22c55e' }}>+${(pos.stake * 0.92).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Binary · 92% payout</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                <span style={{ color: '#ef4444' }}>-${pos.sl_amount?.toFixed(2) ?? '?'}</span>
                {' / '}
                <span style={{ color: '#22c55e' }}>+${pos.tp_amount?.toFixed(2) ?? '?'}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                1:{pos.sl_amount ? (pos.tp_amount/pos.sl_amount).toFixed(1) : '?'} RR
              </div>
            </>
          )}
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>SCORE</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#6366f1' }}>{pos.score} pts</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {pos.score >= 13 ? '⚡ Premium (Multiplier eligible)' : 'Standard binary setup'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>MARKET PHASE</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: pc }}>{pos.phase}</div>
          <div style={{ fontSize: 11, color: htfColor }}>HTF: {pos.htf_bias}</div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>TIME OPEN</div>
          <div style={{ fontWeight: 800, fontSize: 15, fontFamily: 'monospace' }}>
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Entry: ${pos.entry_price?.toFixed(pos.symbol?.includes('frx') ? 5 : 2) ?? '—'}
          </div>
        </div>

      </div>

      {/* Progress bar: SL → Entry → TP */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
          <span style={{ color: '#ef4444' }}>SL -${pos.sl_amount.toFixed(2)}</span>
          <span style={{ color: '#6366f1', fontWeight: 700 }}>Entry</span>
          <span style={{ color: '#22c55e' }}>TP +${pos.tp_amount.toFixed(2)}</span>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 4, height: 6, position: 'relative' }}>
          <div style={{ position: 'absolute', left: '33%', width: 2, height: 6, background: '#6366f1', borderRadius: 1 }} />
          <div style={{ height: 6, borderRadius: 4,
            background: 'linear-gradient(90deg, #ef4444 0%, #6366f1 33%, #22c55e 100%)',
            opacity: 0.35 }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginTop: 4 }}>
          {isBinary
            ? `Binary breakeven: 52.1% WR · Stake: $${pos.stake?.toFixed(2)} · Expires at contract end`
            : `Multiplier breakeven: 33.3% WR · Stake: $${pos.stake?.toFixed(2)} · SL/TP guaranteed by Deriv`}
        </div>
      </div>
    </div>
  )
}
