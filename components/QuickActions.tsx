'use client'
import { Trade } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Target, AlertTriangle, Clock, Zap } from 'lucide-react'

interface Props { trades: Trade[]; wr: number }

export default function QuickActions({ trades, wr }: Props) {
  const wins = trades.filter(t => t.result === 'WIN').length
  const losses = trades.filter(t => t.result === 'LOSS').length
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  
  // Streak calculation
  let currentStreak = 0
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].result === 'LOSS') currentStreak++
    else break
  }
  
  // Last trade info
  const lastTrade = trades[trades.length - 1]
  const lastResult = lastTrade?.result
  const lastPnl = lastTrade?.pnl ?? 0

  // Recent performance
  const recent10 = trades.slice(-10)
  const recentWr = recent10.length ? Math.round(recent10.filter(t => t.result === 'WIN').length / recent10.length * 100) : 0
  const trend = recentWr > wr + 5 ? 'improving' : recentWr < wr - 5 ? 'declining' : 'stable'

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Quick Overview
      </h3>

      {/* Current Status */}
      <div className={`rounded-xl p-4 mb-4 ${
        wr >= 55 ? 'bg-success/10 border border-success/20' : 
        wr >= 50 ? 'bg-warning/10 border border-warning/20' : 
        'bg-destructive/10 border border-destructive/20'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <Target className={`w-5 h-5 ${
            wr >= 55 ? 'text-success' : wr >= 50 ? 'text-warning' : 'text-destructive'
          }`} />
          <span className="font-semibold text-foreground">
            {wr >= 55 ? 'Profitable' : wr >= 50 ? 'Near Breakeven' : 'Below Target'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {wr >= 55 
            ? 'Bot is performing above breakeven threshold' 
            : wr >= 50 
              ? 'Close to profitability, keep collecting data'
              : 'Strategy calibrating — patience required'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {/* Last Trade */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {lastResult === 'WIN' ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">Last Trade</span>
          </div>
          <p className={`text-lg font-bold ${lastPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
            {lastPnl >= 0 ? '+' : ''}{lastPnl.toFixed(2)}
          </p>
        </div>

        {/* Streak */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {currentStreak >= 2 ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <Zap className="w-4 h-4 text-success" />
            )}
            <span className="text-xs text-muted-foreground">Streak</span>
          </div>
          <p className={`text-lg font-bold ${currentStreak >= 2 ? 'text-destructive' : 'text-success'}`}>
            {currentStreak > 0 ? `${currentStreak}L` : 'Good'}
          </p>
        </div>

        {/* Recent Form */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Last 10</span>
          </div>
          <p className={`text-lg font-bold ${
            trend === 'improving' ? 'text-success' : 
            trend === 'declining' ? 'text-destructive' : 
            'text-foreground'
          }`}>
            {recentWr}%
          </p>
        </div>

        {/* Total P&L */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-muted-foreground text-sm">$</span>
            <span className="text-xs text-muted-foreground">Total P&L</span>
          </div>
          <p className={`text-lg font-bold ${totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Win/Loss Ratio Bar */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Win/Loss Distribution</span>
          <span>{wins}W / {losses}L</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
          <div 
            className="bg-success h-full transition-all duration-500"
            style={{ width: `${(wins / (wins + losses)) * 100}%` }}
          />
          <div 
            className="bg-destructive h-full transition-all duration-500"
            style={{ width: `${(losses / (wins + losses)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
