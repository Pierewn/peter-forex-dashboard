'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface MT5Account {
  login_id: string
  label: string
  account_type: string
  balance: number
  equity: number
  margin: number
  free_margin: number
  currency: string
  server: string
  is_demo: boolean
  last_updated: string
}

const ACCOUNT_COLORS: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  gold:     { bg: 'bg-yellow-950/30', border: 'border-yellow-600/40', badge: 'bg-yellow-600/20 text-yellow-300', icon: '🥇' },
  standard: { bg: 'bg-blue-950/30',   border: 'border-blue-600/40',   badge: 'bg-blue-600/20 text-blue-300',   icon: '📊' },
}

export default function MT5Accounts() {
  const [accounts, setAccounts] = useState<MT5Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
    const interval = setInterval(fetchAccounts, 60_000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  async function fetchAccounts() {
    try {
      const { data } = await supabase
        .from('mt5_accounts')
        .select('*')
        .order('account_type')
      setAccounts(data || [])
    } catch {
      // Table may not exist yet — show placeholder
      setAccounts([
        { login_id: '6119417',   label: 'MT5 Gold Demo',     account_type: 'gold',     balance: 10000, equity: 10000, margin: 0, free_margin: 10000, currency: 'USD', server: 'Deriv-Demo', is_demo: true, last_updated: '' },
        { login_id: '201686439', label: 'MT5 Standard Demo', account_type: 'standard', balance: 10000, equity: 10000, margin: 0, free_margin: 10000, currency: 'USD', server: 'Deriv-Demo', is_demo: true, last_updated: '' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="animate-pulse grid grid-cols-2 gap-4">
      {[0,1].map(i => <div key={i} className="h-36 rounded-xl bg-white/5" />)}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          MT5 Demo Accounts
        </h2>
        <span className="text-xs text-white/30">Deriv-Demo server</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map(a => {
          const style = ACCOUNT_COLORS[a.account_type] || ACCOUNT_COLORS.standard
          const lastUpd = a.last_updated
            ? new Date(a.last_updated).toLocaleTimeString()
            : 'not synced'
          const marginPct = a.balance > 0 ? (a.margin / a.balance * 100) : 0

          return (
            <div
              key={a.login_id}
              className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{style.icon}</span>
                    <span className="text-white font-semibold text-sm">{a.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${style.badge}`}>
                      #{a.login_id}
                    </span>
                    {a.is_demo && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                        DEMO
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    ${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-white/40">{a.currency}</div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-white/40 text-xs">Equity</div>
                  <div className="text-white text-sm font-mono">
                    ${a.equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/40 text-xs">Margin</div>
                  <div className="text-sm font-mono text-white">
                    ${a.margin.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/40 text-xs">Free</div>
                  <div className="text-sm font-mono text-green-400">
                    ${a.free_margin.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Margin usage bar */}
              {a.margin > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-white/30 mb-1">
                    <span>Margin used</span>
                    <span>{marginPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{ width: `${Math.min(marginPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-xs text-white/25">
                <span>{a.server}</span>
                <span>Updated {lastUpd}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Setup notice if no token */}
      <div className="mt-3 rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/40">
        <span className="text-yellow-400">⚡ To sync live MT5 balances:</span>{' '}
        Create a standard API token at{' '}
        <span className="text-blue-400 font-mono">app.deriv.com/account/api-token</span>
        {' '}(Read + Trading scopes) → add as{' '}
        <span className="font-mono text-white/60">DERIV_STANDARD_TOKEN</span> in bot .env
        → run <span className="font-mono text-white/60">python sync_mt5_balances.py</span>
      </div>
    </div>
  )
}
