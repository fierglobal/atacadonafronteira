import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type TierRow = { product_id: string; qty_min: number; qty_max: number | null; brl_price: number }

export async function POST(req: Request) {
  const { productIds } = await req.json() as { productIds?: string[] }
  if (!Array.isArray(productIds) || !productIds.length) {
    return NextResponse.json({ tiers: {} })
  }

  const { data } = await supabaseAdmin
    .from('product_price_tiers')
    .select('product_id, qty_min, qty_max, brl_price')
    .in('product_id', productIds)
    .order('qty_min', { ascending: true })

  const tiers: Record<string, { qty_min: number; qty_max: number | null; brl_price: number }[]> = {}
  for (const t of (data as TierRow[]) || []) {
    (tiers[t.product_id] ||= []).push({ qty_min: t.qty_min, qty_max: t.qty_max, brl_price: Number(t.brl_price) })
  }

  return NextResponse.json({ tiers })
}
