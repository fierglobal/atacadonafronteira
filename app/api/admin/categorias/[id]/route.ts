import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const body = await req.json()
  const { error } = await supabaseAdmin.from('categorias').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'update', entity: 'categoria', entity_id: id, diff: body })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const { error } = await supabaseAdmin.from('categorias').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'delete', entity: 'categoria', entity_id: id, diff: null })
  return NextResponse.json({ ok: true })
}
