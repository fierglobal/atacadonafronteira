import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin.from('categorias').select('*').order('nome')
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { nome, parent_id } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('categorias')
    .insert({ nome: nome.trim(), parent_id: parent_id || null })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'create', entity: 'categoria', entity_id: data?.id || null, diff: { nome: nome.trim(), parent_id: parent_id || null } })
  return NextResponse.json(data)
}
