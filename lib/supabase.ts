import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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

export async function fetchTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('ts', { ascending: true })
  if (error) throw error
  return data || []
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
