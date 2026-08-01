import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const auth = await requireAdmin('cupons', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin.from('cupons').select('*').order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('cupons', 'rw')
  if (auth) return auth
  const { codigo, desconto_pct, validade, usos_max } = await req.json()
  if (!codigo || !desconto_pct) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const payload = { codigo: codigo.toUpperCase().trim(), desconto_pct: +desconto_pct, validade: validade || null, usos_max: usos_max ? +usos_max : null }
  const { data, error } = await supabaseAdmin
    .from('cupons')
    .insert(payload)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'create', entity: 'cupom', entity_id: data?.id || null, diff: payload })
  return NextResponse.json(data)
}
