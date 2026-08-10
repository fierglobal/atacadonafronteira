import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const { nome } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const { error } = await supabaseAdmin.from('marcas').update({ nome: nome.trim() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'update', entity: 'marca', entity_id: id, diff: { nome: nome.trim() } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const { error } = await supabaseAdmin.from('marcas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'delete', entity: 'marca', entity_id: id, diff: null })
  return NextResponse.json({ ok: true })
}
