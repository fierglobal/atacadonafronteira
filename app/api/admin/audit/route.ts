import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const auth = await requireAdmin('audit', 'r')
  if (auth) return auth
  const { searchParams } = new URL(req.url)
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
  const entity = searchParams.get('entity')
  const user = searchParams.get('user')

  let q = supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (entity) q = q.eq('entity', entity)
  if (user) q = q.ilike('user_nome', `%${user}%`)

  const { data, count } = await q
  return NextResponse.json({ items: data || [], total: count || 0, offset, limit })
}
