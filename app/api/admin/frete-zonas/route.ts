import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('configuracoes', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin
    .from('frete_zonas')
    .select('*')
    .order('ordem', { ascending: true })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { nome, cep_inicio, cep_fim, prazo_dias_uteis, ativo, ordem } = await req.json()
  if (!nome || !prazo_dias_uteis) return NextResponse.json({ error: 'nome e prazo (dias úteis) são obrigatórios' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('frete_zonas')
    .insert({
      nome,
      cep_inicio: cep_inicio || null,
      cep_fim: cep_fim || null,
      prazo_dias_uteis: Number(prazo_dias_uteis),
      ativo: ativo !== false,
      ordem: ordem != null ? Number(ordem) : 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'create', entity: 'frete_zona', entity_id: data.id, diff: { nome, cep_inicio, cep_fim, prazo_dias_uteis } })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { id, ...patch } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  if (patch.prazo_dias_uteis != null) patch.prazo_dias_uteis = Number(patch.prazo_dias_uteis)
  if (patch.ordem != null) patch.ordem = Number(patch.ordem)
  if ('cep_inicio' in patch) patch.cep_inicio = patch.cep_inicio || null
  if ('cep_fim' in patch) patch.cep_fim = patch.cep_fim || null
  const { error } = await supabaseAdmin.from('frete_zonas').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'update', entity: 'frete_zona', entity_id: id, diff: patch })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('configuracoes', 'rw')
  if (auth) return auth
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  await supabaseAdmin.from('frete_zonas').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'frete_zona', entity_id: id })
  return NextResponse.json({ ok: true })
}
