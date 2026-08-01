import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('webhooks', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('webhooks', 'rw')
  if (auth) return auth
  const { nome, url, events, secret, ativo } = await req.json()
  if (!nome || !url) return NextResponse.json({ error: 'nome e url são obrigatórios' }, { status: 400 })
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'events deve ser um array com pelo menos um evento' }, { status: 400 })
  }
  const finalSecret = secret && String(secret).trim() ? String(secret).trim() : crypto.randomUUID().replace(/-/g, '')
  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .insert({ nome, url, events, secret: finalSecret, ativo: ativo !== false })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'create', entity: 'webhook', entity_id: data.id, diff: { nome, url, events } })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('webhooks', 'rw')
  if (auth) return auth
  const { id, ...patch } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const { error } = await supabaseAdmin.from('webhooks').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'update', entity: 'webhook', entity_id: id, diff: patch })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('webhooks', 'rw')
  if (auth) return auth
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  await supabaseAdmin.from('webhook_deliveries').delete().eq('webhook_id', id)
  await supabaseAdmin.from('webhooks').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'webhook', entity_id: id })
  return NextResponse.json({ ok: true })
}
