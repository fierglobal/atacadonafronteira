import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/password'

export async function GET() {
  const auth = await requireAdmin('usuarios', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id, nome, email, role, ativo, totp_enabled, permissions, created_at')
    .order('created_at', { ascending: true })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAdmin('usuarios', 'rw')
  if (auth) return auth
  const { nome, email, senha, role, permissions } = await req.json()
  if (!nome || !email || !senha) return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 })
  const { hash, algo } = await hashPassword(senha)
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert({ nome, email, senha_hash: hash, senha_algo: algo, role: role || 'operador', permissions: permissions || {} })
    .select('id, nome, email, role, ativo, permissions, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'create', entity: 'admin_user', entity_id: data.id, diff: { nome, email, role } })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('usuarios', 'rw')
  if (auth) return auth
  const { id, nome, email, senha, role, ativo, permissions } = await req.json()
  const update: Record<string, unknown> = {}
  if (nome !== undefined) update.nome = nome
  if (email !== undefined) update.email = email
  if (role !== undefined) update.role = role
  if (ativo !== undefined) update.ativo = ativo
  if (permissions !== undefined) update.permissions = permissions
  if (senha) {
    const { hash, algo } = await hashPassword(senha)
    update.senha_hash = hash
    update.senha_algo = algo
  }
  const { error } = await supabaseAdmin.from('admin_users').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'update', entity: 'admin_user', entity_id: id, diff: update })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('usuarios', 'rw')
  if (auth) return auth
  const { id } = await req.json()
  await supabaseAdmin.from('admin_sessions').delete().eq('user_id', id)
  await supabaseAdmin.from('admin_users').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'admin_user', entity_id: id })
  return NextResponse.json({ ok: true })
}
