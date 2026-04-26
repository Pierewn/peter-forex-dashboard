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
