import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const perPage = Math.min(500, Math.max(10, parseInt(url.searchParams.get('perPage') || '100')))
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count, error } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: true })
    .range(from, to)

  if (error) return NextResponse.json({ rows: [], total: 0, page, perPage }, { status: 500 })
  return NextResponse.json({ rows: data || [], total: count || 0, page, perPage })
}
