import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth
  const { data, error } = await supabaseAdmin
    .from('marcas')
    .select('id, nome, created_at')
    .order('nome')
  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { nome } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('marcas')
    .insert({ nome: nome.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'create', entity: 'marca', entity_id: data?.id || null, diff: { nome: nome.trim() } })
  return NextResponse.json(data)
}
