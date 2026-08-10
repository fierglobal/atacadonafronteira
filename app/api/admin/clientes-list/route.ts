import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { calcRFM } from '@/lib/rfm'

export async function GET(req: Request) {
  const auth = await requireAdmin('clientes', 'r')
  if (auth) return auth

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const perPage = Math.min(500, Math.max(10, parseInt(url.searchParams.get('perPage') || '100')))
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count } = await supabaseAdmin
    .from('customers')
    .select('*, orders(id, order_num, total_brl, status, created_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const rows = (data || []).map(c => ({ ...c, rfm: calcRFM(c.orders) }))

  return NextResponse.json({ rows, total: count || 0, page, perPage, data: rows })
}
