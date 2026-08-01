import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth
  const { id } = await params
  const { data, error } = await supabaseAdmin.from('products').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth

  const { id } = await params
  const body = await req.json()

  // Buscar estado atual para gerar log de diff
  const { data: antes } = await supabaseAdmin.from('products').select('*').eq('id', id).single()

  const { error } = await supabaseAdmin
    .from('products')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Registrar log de alterações (ignora campos técnicos)
  if (antes) {
    const ignorar = new Set(['updated_at', 'created_at', 'id'])
    const campos_alterados: Record<string, { antes: unknown; depois: unknown }> = {}
    for (const [k, v] of Object.entries(body)) {
      if (ignorar.has(k)) continue
      const valorAntes = (antes as Record<string, unknown>)[k]
      if (JSON.stringify(valorAntes) !== JSON.stringify(v)) {
        campos_alterados[k] = { antes: valorAntes, depois: v }
      }
    }
    if (Object.keys(campos_alterados).length > 0) {
      await supabaseAdmin.from('product_logs').insert({
        product_id: id,
        admin_email: process.env.ADMIN_EMAIL || 'admin',
        campos_alterados,
      })
    }
  }

  await logAudit({ action: 'update', entity: 'produto', entity_id: id, diff: body })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'delete', entity: 'produto', entity_id: id, diff: null })
  return NextResponse.json({ ok: true })
}
