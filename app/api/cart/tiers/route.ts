import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { brlFromUsd } from '@/lib/produto'

type TierRow = { product_id: string; qty_min: number; qty_max: number | null; usd_price: number }

export async function POST(req: Request) {
  const { productIds } = await req.json() as { productIds?: string[] }
  if (!Array.isArray(productIds) || !productIds.length) {
    return NextResponse.json({ tiers: {} })
  }

  const [config, { data }, { data: prods }] = await Promise.all([
    getConfig(),
    supabaseAdmin
      .from('product_price_tiers')
      .select('product_id, qty_min, qty_max, usd_price')
      .in('product_id', productIds)
      .order('qty_min', { ascending: true }),
    supabaseAdmin
      .from('products')
      .select('id, limite_por_cpf')
      .in('id', productIds)
      .not('limite_por_cpf', 'is', null),
  ])

  const tiers: Record<string, { qty_min: number; qty_max: number | null; brl_price: number }[]> = {}
  for (const t of (data as TierRow[]) || []) {
    (tiers[t.product_id] ||= []).push({ qty_min: t.qty_min, qty_max: t.qty_max, brl_price: brlFromUsd(t.usd_price, config.brl_rate) })
  }

  const limites: Record<string, number> = {}
  for (const p of (prods as { id: string; limite_por_cpf: number }[]) || []) {
    limites[p.id] = p.limite_por_cpf
  }

  return NextResponse.json({ tiers, limites })
}
