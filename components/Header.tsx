'use client'
import { Trade } from '@/lib/supabase'
import { Activity, RefreshCw, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'

interface HeaderProps {
  symbol: string
  setSymbol: (s: string) => void
  symbolOptions: string[]
  symbolLabels: Record<string, string>
  trades: Trade[]
  filtered: Trade[]
  wins: number
  losses: number
  wr: number
  refreshing: boolean
  onRefresh: () => void
  lastRefresh: Date
}

export default function Header({
  symbol,
  setSymbol,
  symbolOptions,
  symbolLabels,
  trades,
  filtered,
  wins,
  losses,
  wr,
  refreshing,
  onRefresh,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-success flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Peter&apos;s Trading Bot</h1>
              <p className="text-xs text-muted-foreground">R75 &middot; DEMO &middot; v10.9</p>
            </div>
          </div>

          {/* Center Stats */}
          {trades.length > 0 && (
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{filtered.length} trades</span>
                <span className="text-muted-foreground">&middot;</span>
                <span className={`text-sm font-bold ${wr >= 55 ? 'text-success' : wr >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {wr}% win rate
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/10">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                  <span className="text-sm font-semibold text-success">{wins}W</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10">
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">{losses}L</span>
                </div>
              </div>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Asset Filter */}
            {trades.length > 0 && (
              <div className="relative">
                <select
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  className="appearance-none bg-secondary border border-border text-foreground text-sm px-3 py-2 pr-8 rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {symbolOptions.map(s => (
                    <option key={s} value={s}>{symbolLabels[s] ?? s}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs font-medium text-success">Live</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                refreshing
                  ? 'bg-primary/20 text-primary cursor-wait'
                  : 'bg-secondary hover:bg-secondary/80 text-foreground'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
