'use client'
import { useEffect, useState } from 'react'
import { fetchPatterns, TradePattern } from '@/lib/supabase'

interface TierStats {
  tier: string; emoji: string; color: string; bg: string
  count: number; avgWr: number; totalEV: number
}

// v15.5: PatternLearner recalibrated for binary 52.1% breakeven
// STAR = ≥70% WR (gets -2 threshold discount), CAUTION = <38% WR (gets +2 threshold penalty)
function getTier(p: TradePattern): { tier: string; emoji: string; color: string; bg: string } {
  const total = p.wins + p.losses
  if (total < 10) return { tier: 'Learning', emoji: '📖', color: '#64748b', bg: 'rgba(100,116,139,0.08)' }
  const wr = p.wins / total
  if (wr >= 0.70 && total >= 10) return { tier: 'STAR',    emoji: '⭐', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
  if (wr < 0.38)                 return { tier: 'CAUTION', emoji: '🚨', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  }
  if (wr >= 0.60 && total >= 20) return { tier: 'HIGH',    emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  }
  if (total >= 15)               return { tier: 'MEDIUM',  emoji: '📊', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' }
  return { tier: 'LOW', emoji: '📖', color: '#64748b', bg: 'rgba(100,116,139,0.08)' }
}

// Known top star patterns from v15.5 reconciliation (used as fallback if DB has no STAR yet)
const KNOWN_STARS = [
  { pattern_key: 'R_100|PUT|DISTRIBUTION',  symbol: 'R_100',     direction: 'PUT', phase: 'DISTRIBUTION',  wins: 17, losses: 3  },
  { pattern_key: 'R_75|PUT|PULLBACK_BEAR',  symbol: 'R_75',      direction: 'PUT', phase: 'PULLBACK_BEAR', wins: 26, losses: 10 },
  { pattern_key: 'R_50|PUT|DISTRIBUTION',   symbol: 'R_50',      direction: 'PUT', phase: 'DISTRIBUTION',  wins: 10, losses: 3  },
  { pattern_key: 'R_75|PUT|DISTRIBUTION',   symbol: 'R_75',      direction: 'PUT', phase: 'DISTRIBUTION',  wins: 14, losses: 9  },
  { pattern_key: 'frxXAUUSD|PUT|RANGING',   symbol: 'frxXAUUSD', direction: 'PUT', phase: 'RANGING',       wins: 10, losses: 7  },
]

export default function ConfidenceTiers() {
  const [patterns, setPatterns] = useState<TradePattern[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetchPatterns().then(setPatterns).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return null

  // Aggregate by tier
  const tierMap = new Map<string, TierStats>()
  for (const p of patterns) {
    const t    = getTier(p)
    const total = p.wins + p.losses
    // Binary EV: win=$0.92, lose=$1.00 (at 92% payout)
    const ev    = p.wins * 0.92 - p.losses * 1.00
    const wr    = total > 0 ? p.wins / total * 100 : 0
    if (!tierMap.has(t.tier)) {
      tierMap.set(t.tier, { ...t, count: 0, avgWr: 0, totalEV: 0 })
    }
    const s = tierMap.get(t.tier)!
    s.count   += 1
    s.avgWr    = (s.avgWr * (s.count - 1) + wr) / s.count
    s.totalEV += ev
  }

  const ORDER = ['STAR', 'HIGH', 'MEDIUM', 'LOW', 'LEARNING', 'CAUTION']
  const tiers = ORDER.map(t => tierMap.get(t)).filter(Boolean) as TierStats[]

  if (tiers.length === 0) return null

  const totalPatterns = patterns.length
  const totalEV = tiers.reduce((a, t) => a + t.totalEV, 0)

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12,
      padding: '1.5rem', marginBottom: '1.5rem' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            📚 PatternLearner — Confidence Tiers
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
            {totalPatterns} patterns tracked · Portfolio EV: <span style={{
              color: totalEV >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700
            }}>${totalEV > 0 ? '+' : ''}{totalEV.toFixed(1)}</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#475569', textAlign: 'right' }}>
          EV = wins×$0.92 − losses×$1.00 (binary 92% payout) · BE = 52.1% WR
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {tiers.map(t => (
          <div key={t.tier} style={{ background: t.bg, border: `1px solid ${t.color}30`,
            borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{t.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: t.color }}>{t.tier}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', margin: '4px 0' }}>
              {t.count}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>patterns</div>
            <div style={{ fontSize: 12, marginTop: 6, color: t.color, fontWeight: 600 }}>
              {t.avgWr.toFixed(0)}% avg WR
            </div>
            <div style={{ fontSize: 11, color: t.totalEV >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
              EV ${t.totalEV > 0 ? '+' : ''}{t.totalEV.toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      {/* Top STAR patterns — live from DB, fallback to known v15.5 stars */}
      {(() => {
        const dbStars = patterns.filter(p => getTier(p).tier === 'STAR')
        const displayStars = dbStars.length > 0 ? dbStars : KNOWN_STARS
        const isFallback   = dbStars.length === 0
        return (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,158,11,0.06)',
            borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                ⭐ Star Patterns — take these trades (gets -2 threshold discount)
              </div>
              {isFallback && (
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  v15.5 reconciled data (live DB updating)
                </div>
              )}
            </div>
            {displayStars
              .sort((a, b) => b.wins/(b.wins+b.losses) - a.wins/(a.wins+a.losses))
              .slice(0, 5)
              .map(p => (
                <div key={p.pattern_key} style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 3 }}>
                  <span style={{ color: '#f59e0b' }}>⭐</span>{' '}
                  {p.pattern_key.replace(/\|/g, ' → ')} ·{' '}
                  <span style={{ fontWeight: 700 }}>
                    {Math.round(p.wins/(p.wins+p.losses)*100)}% WR
                  </span>{' '}
                  <span style={{ color: '#64748b' }}>({p.wins+p.losses}t)</span>
                </div>
              ))}
          </div>
        )
      })()}
    </div>
  )
}
