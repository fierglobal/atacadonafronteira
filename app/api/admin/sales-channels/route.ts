import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('configuracoes', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin
    .from('sales_channels')
    .select('*')
    .order('created_at', { ascending: true })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { slug, nome, descricao, ativo } = await req.json()
  if (!slug || !nome) return NextResponse.json({ error: 'slug e nome são obrigatórios' }, { status: 400 })
  const slugNorm = String(slug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-')
  const { data, error } = await supabaseAdmin
    .from('sales_channels')
    .insert({ slug: slugNorm, nome, descricao: descricao || null, ativo: ativo !== false })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'create', entity: 'sales_channel', entity_id: data.id, diff: { slug: slugNorm, nome } })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { id, ...patch } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  if (patch.slug) patch.slug = String(patch.slug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-')
  const { error } = await supabaseAdmin.from('sales_channels').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'update', entity: 'sales_channel', entity_id: id, diff: patch })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  await supabaseAdmin.from('sales_channels').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'sales_channel', entity_id: id })
  return NextResponse.json({ ok: true })
}
