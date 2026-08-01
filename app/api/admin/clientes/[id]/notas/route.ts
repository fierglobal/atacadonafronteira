import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, getAdminSession, logAudit } from '@/lib/admin-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('clientes', 'r')
  if (auth) return auth
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('customer_notes')
    .select('id, texto, autor, pinned, created_at')
    .eq('customer_id', id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('clientes', 'rw')
  if (auth) return auth
  const { id } = await params
  const sess = await getAdminSession()
  const { texto, pinned } = await req.json()
  if (!texto?.trim()) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('customer_notes')
    .insert({ customer_id: id, texto: texto.trim(), autor: sess?.nome || 'admin', pinned: !!pinned })
    .select('id, texto, autor, pinned, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'create', entity: 'customer_note', entity_id: data.id, diff: { customer_id: id } })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('clientes', 'rw')
  if (auth) return auth
  const { noteId, pinned, texto } = await req.json()
  const update: Record<string, unknown> = {}
  if (typeof pinned === 'boolean') update.pinned = pinned
  if (typeof texto === 'string') update.texto = texto.trim()
  await supabaseAdmin.from('customer_notes').update(update).eq('id', noteId)
  await logAudit({ action: 'update', entity: 'customer_note', entity_id: noteId, diff: update })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('clientes', 'rw')
  if (auth) return auth
  const { noteId } = await req.json()
  await supabaseAdmin.from('customer_notes').delete().eq('id', noteId)
  await logAudit({ action: 'delete', entity: 'customer_note', entity_id: noteId })
  return NextResponse.json({ ok: true })
}
