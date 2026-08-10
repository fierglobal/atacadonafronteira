import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

function legacyToken() {
  return process.env.ADMIN_PASSWORD
    ? createHash('sha256').update(`legacy:${process.env.ADMIN_PASSWORD}`).digest('hex')
    : null
}

export type Permission = 'r' | 'rw'
export type PermissionScope =
  | 'produtos' | 'pedidos' | 'clientes' | 'financeiro'
  | 'cupons' | 'promocoes' | 'marketing' | 'configuracoes'
  | 'usuarios' | 'webhooks' | 'audit' | 'import' | 'avaliacoes'

export type AdminSession = {
  id: string
  user_id: string
  nome: string
  role: 'dono' | 'operador'
  permissions: Partial<Record<PermissionScope, Permission>>
}

const ALL_PERMS: Record<PermissionScope, Permission> = {
  produtos: 'rw', pedidos: 'rw', clientes: 'rw', financeiro: 'rw',
  cupons: 'rw', promocoes: 'rw', marketing: 'rw', configuracoes: 'rw',
  usuarios: 'rw', webhooks: 'rw', audit: 'r', import: 'rw', avaliacoes: 'rw',
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null

  const lt = legacyToken()
  if (lt && token === lt) {
    return { id: 'legacy', user_id: 'legacy', nome: 'Admin', role: 'dono', permissions: ALL_PERMS }
  }

  const { data: session } = await supabaseAdmin
    .from('admin_sessions')
    .select('id, user_id, user_nome, user_role, expires_at')
    .eq('id', token)
    .single()
  if (!session) return null
  if (new Date(session.expires_at) < new Date()) return null

  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('permissions, ativo')
    .eq('id', session.user_id)
    .single()
  if (!user || !user.ativo) return null

  const perms = session.user_role === 'dono'
    ? ALL_PERMS
    : (user.permissions || {})

  return {
    id: session.id,
    user_id: session.user_id,
    nome: session.user_nome,
    role: session.user_role,
    permissions: perms,
  }
}

export async function requireAdmin(scope?: PermissionScope, level: Permission = 'r'): Promise<NextResponse | null> {
  const sess = await getAdminSession()
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!scope) return null
  const have = sess.permissions[scope]
  if (!have) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (level === 'rw' && have !== 'rw') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function logAudit(opts: {
  action: string
  entity: string
  entity_id?: string | null
  diff?: Record<string, unknown> | null
  ip?: string | null
}) {
  const sess = await getAdminSession()
  await supabaseAdmin.from('audit_logs').insert({
    user_id: sess?.user_id === 'legacy' ? null : sess?.user_id || null,
    user_nome: sess?.nome || 'unknown',
    action: opts.action,
    entity: opts.entity,
    entity_id: opts.entity_id || null,
    diff: opts.diff || null,
    ip: opts.ip || null,
  }).then(() => {})
}
