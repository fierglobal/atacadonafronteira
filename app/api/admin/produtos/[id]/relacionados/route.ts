import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('product_relations')
    .select('id, related_product_id, tipo, ordem, products!product_relations_related_product_id_fkey(id, name, titulo, img_url, usd_price, ativo)')
    .eq('product_id', id)
    .order('ordem', { ascending: true })
  return NextResponse.json(data || [])
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const { relacionados } = await req.json() as { relacionados: { related_product_id: string; tipo: string; ordem: number }[] }

  await supabaseAdmin.from('product_relations').delete().eq('product_id', id)

  const clean = (relacionados || [])
    .filter(r => r && r.related_product_id && r.related_product_id !== id)
    .map((r, i) => ({
      product_id: id,
      related_product_id: r.related_product_id,
      tipo: r.tipo || 'compre_junto',
      ordem: typeof r.ordem === 'number' ? r.ordem : i,
    }))

  if (clean.length) {
    const { error } = await supabaseAdmin.from('product_relations').upsert(clean, { onConflict: 'product_id,related_product_id,tipo' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', entity: 'produto_relacionados', entity_id: id, diff: { count: clean.length } })
  return NextResponse.json({ ok: true, count: clean.length })
}
