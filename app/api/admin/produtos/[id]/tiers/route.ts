import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import { getConfig } from '@/lib/config'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('product_price_tiers')
    .select('id, qty_min, qty_max, brl_price, usd_price')
    .eq('product_id', id)
    .order('qty_min', { ascending: true })
  return NextResponse.json(data || [])
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const { tiers } = await req.json() as { tiers: { qty_min: number; qty_max: number | null; brl_price: number }[] }

  await supabaseAdmin.from('product_price_tiers').delete().eq('product_id', id)

  // brl_price é o campo de digitação; usd_price segue populado só por
  // compatibilidade com código legado que ainda lê essa coluna.
  const { brl_rate } = await getConfig()
  const clean = (tiers || [])
    .filter(t => t && Number(t.qty_min) > 0 && Number(t.brl_price) > 0)
    .map(t => ({
      product_id: id,
      qty_min: Math.floor(Number(t.qty_min)),
      qty_max: t.qty_max ? Math.floor(Number(t.qty_max)) : null,
      brl_price: Number(t.brl_price),
      usd_price: brl_rate > 0 ? Math.round((Number(t.brl_price) / brl_rate) * 100) / 100 : Number(t.brl_price),
    }))

  if (clean.length) {
    const { error } = await supabaseAdmin.from('product_price_tiers').insert(clean)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', entity: 'produto_tiers', entity_id: id, diff: { count: clean.length } })
  return NextResponse.json({ ok: true, count: clean.length })
}
