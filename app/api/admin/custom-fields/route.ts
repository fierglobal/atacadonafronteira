import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

const ENTITIES = ['products', 'customers']
const TYPES = ['text', 'number', 'boolean', 'date', 'select']

export async function GET(req: Request) {
  const auth = await requireAdmin('configuracoes', 'r')
  if (auth) return auth
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')
  let q = supabaseAdmin.from('custom_field_defs').select('*').order('ordem', { ascending: true }).order('created_at', { ascending: true })
  if (entity && ENTITIES.includes(entity)) q = q.eq('entity', entity)
  const { data } = await q
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { entity, field_key, label, field_type, options, required, ordem } = await req.json()
  if (!entity || !ENTITIES.includes(entity)) return NextResponse.json({ error: 'entity inválida' }, { status: 400 })
  if (!field_key || !label || !field_type) return NextResponse.json({ error: 'field_key, label e field_type obrigatórios' }, { status: 400 })
  if (!TYPES.includes(field_type)) return NextResponse.json({ error: 'field_type inválido' }, { status: 400 })
  const key = String(field_key).toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
  const { data, error } = await supabaseAdmin
    .from('custom_field_defs')
    .insert({
      entity,
      field_key: key,
      label,
      field_type,
      options: options || null,
      required: !!required,
      ordem: ordem !== undefined && ordem !== '' ? +ordem : 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'create', entity: 'custom_field_def', entity_id: data.id, diff: { entity, field_key: key, label } })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { id, ...patch } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  if (patch.field_type && !TYPES.includes(patch.field_type)) return NextResponse.json({ error: 'field_type inválido' }, { status: 400 })
  if (patch.field_key) patch.field_key = String(patch.field_key).toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
  if (patch.ordem !== undefined && patch.ordem !== '') patch.ordem = +patch.ordem
  const { error } = await supabaseAdmin.from('custom_field_defs').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'update', entity: 'custom_field_def', entity_id: id, diff: patch })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  await supabaseAdmin.from('custom_field_defs').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'custom_field_def', entity_id: id })
  return NextResponse.json({ ok: true })
}
