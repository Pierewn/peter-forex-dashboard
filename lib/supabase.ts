import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Don't throw at module level — surface the error at query time instead
// so the page renders and shows a proper error message rather than crashing.
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder'
)

export const SUPABASE_CONFIGURED = !!(supabaseUrl && supabaseKey)

export interface Trade {
  id: number
  ts: string
  direction: 'CALL' | 'PUT'
  stake: number
  payout: number
  score: number
  rsi: number
  macd_hist: number
  bb_pct: number
  z_score: number
  adx: number
  fib_hit: string
  pivot_hit: string
  tech_score: number
  box_score: number
  dev_score: number
  result: 'WIN' | 'LOSS' | 'EVEN'
  pnl: number
  balance: number
  hour:         number | null
  symbol:       string | null   // R_75 | frxEURUSD | frxGBPUSD
  // ── self-optimisation columns (v5.11) ──
  regime:       string | null
  trend_bias:   string | null
  smc_score:    number | null
  fvg_hit:      boolean | null
  ob_hit:       boolean | null
  bos:          string | null
  sweep:        string | null
  eqh_hit:      boolean | null
  eql_hit:      boolean | null
  displacement: string | null
  pd_zone:      string | null
  ote:          string | null
  // ── v6.1 multi-asset & risk-mode columns ──
  payout_pct:        number | null   // actual market payout % offered
  session_name:      string | null   // LONDON | NEW_YORK | R75 | OFF_HOURS
  day_of_week:       number | null   // 0=Mon … 6=Sun
  entry_price:       number | null   // price at entry (probe spot)
  de_risk:           boolean | null  // soft brake (1.5% daily loss) was active
  recovery:          boolean | null  // post-streak 50%-stake recovery trade
  win_rate_at_entry: number | null   // overall win rate when Kelly was sized
  // ── v6.2 dynamic duration ──
  duration:          number | null   // trade duration in minutes (5 | 7 | 10)
  // ── v7.8 analysis fields (columns added via Supabase SQL editor) ──
  htf_bias:          string | null
  reasons:           string | null
  // ── v13.1 multiplier fields ──
  instrument:         string | null  // "MULTIPLIER" | null
  trailing_activated: boolean | null // did SL ratchet to break-even?
}

export interface TradePattern {
  pattern_key: string
  symbol:      string
  direction:   string
  phase:       string
  wins:        number
  losses:      number
}

export interface Scan {
  id: number
  ts: string
  price: number
  rsi: number
  z_score: number
  adx: number
  signal: string
  score: number
}

export async function fetchPatterns(): Promise<TradePattern[]> {
  const { data, error } = await supabase
    .from('trade_patterns')
    .select('*')
    .order('pattern_key')
  if (error) throw new Error(`Supabase patterns: ${error.message}`)
  return data || []
}

export async function fetchTrades(): Promise<Trade[]> {
  // Supabase default cap is 1000 rows — paginate to get all trades
  const pageSize = 1000
  let page = 0
  let all: Trade[] = []

  while (true) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('ts', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      // Surface the full Supabase error (code + message + details) for easier debugging
      const msg = [error.message, error.code, error.details].filter(Boolean).join(' | ')
      throw new Error(`Supabase error fetching trades: ${msg}`)
    }
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break   // last page
    page++
  }

  return all
}

export async function fetchScans(): Promise<Scan[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .order('ts', { ascending: true })
    .limit(500)
  if (error) throw error
  return data || []
}
