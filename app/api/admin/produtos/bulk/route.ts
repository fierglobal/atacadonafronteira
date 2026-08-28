import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function PATCH(req: Request) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth

  const { ids, ativo, ajustePercent } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids obrigatório' }, { status: 400 })
  }

  if (typeof ativo === 'boolean') {
    const { error } = await supabaseAdmin
      .from('products')
      .update({ ativo, updated_at: new Date().toISOString() })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Ajuste percentual não dá pra fazer num único UPDATE (precisa do usd_price
  // atual de cada linha pra calcular o novo) — busca e recalcula por produto.
  if (typeof ajustePercent === 'number' && ajustePercent !== 0) {
    const { data: atuais, error: fetchError } = await supabaseAdmin
      .from('products').select('id, usd_price').in('id', ids)
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    await Promise.all((atuais || []).map(p => {
      const novoPreco = Math.round(Number(p.usd_price) * (1 + ajustePercent / 100) * 100) / 100
      return supabaseAdmin.from('products').update({ usd_price: novoPreco, updated_at: new Date().toISOString() }).eq('id', p.id)
    }))
  }

  await logAudit({ action: 'bulk_update', entity: 'produto', diff: { ids, ativo, ajustePercent } })
  return NextResponse.json({ ok: true })
}
