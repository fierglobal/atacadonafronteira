import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('promocoes', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin
    .from('promocoes')
    .select('*')
    .order('prioridade', { ascending: false })
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('promocoes', 'rw')
  if (auth) return auth
  const body = await req.json()
  const { nome, tipo, valor, brinde_product_id, condicoes, prioridade, ativo, inicio, fim, usos_max } = body
  if (!nome || !tipo) return NextResponse.json({ error: 'Nome e tipo são obrigatórios' }, { status: 400 })
  const tipos = ['desconto_pct', 'desconto_fixo', 'brinde', 'frete_gratis']
  if (!tipos.includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('promocoes')
    .insert({
      nome,
      tipo,
      valor: valor !== undefined && valor !== null && valor !== '' ? +valor : null,
      brinde_product_id: brinde_product_id || null,
      condicoes: condicoes || {},
      prioridade: prioridade !== undefined && prioridade !== '' ? +prioridade : 0,
      ativo: ativo !== false,
      inicio: inicio || null,
      fim: fim || null,
      usos_max: usos_max !== undefined && usos_max !== null && usos_max !== '' ? +usos_max : null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'create', entity: 'promocao', entity_id: data.id, diff: { nome, tipo, valor } })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('promocoes', 'rw')
  if (auth) return auth
  const body = await req.json()
  const { id, ...patch } = body
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  if (patch.valor !== undefined && patch.valor !== null && patch.valor !== '') patch.valor = +patch.valor
  if (patch.prioridade !== undefined && patch.prioridade !== '') patch.prioridade = +patch.prioridade
  if (patch.usos_max !== undefined && patch.usos_max !== null && patch.usos_max !== '') patch.usos_max = +patch.usos_max
  const { error } = await supabaseAdmin.from('promocoes').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'update', entity: 'promocao', entity_id: id, diff: patch })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('promocoes', 'rw')
  if (auth) return auth
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  await supabaseAdmin.from('promocoes').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'promocao', entity_id: id })
  return NextResponse.json({ ok: true })
}
