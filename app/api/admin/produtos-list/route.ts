import { NextResponse } from 'next/server'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

// perPage acima de 1000 pede mais do que o PostgREST devolve numa tacada só
// (db-max-rows do projeto corta em 1000 e ignora o range pedido, calado — foi
// o mesmo bug que sumiu a categoria Medicube). Acima desse teto, pagina de
// verdade em blocos de 1000 pra montar a fatia pedida inteira.
export async function GET(req: Request) {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const perPage = Math.min(5000, Math.max(10, parseInt(url.searchParams.get('perPage') || '100')))
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  if (perPage <= 1000) {
    const { data, count, error } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .range(from, to)
    if (error) return NextResponse.json({ rows: [], total: 0, page, perPage }, { status: 500 })
    return NextResponse.json({ rows: data || [], total: count || 0, page, perPage })
  }

  // perPage > 1000 só é usado por telas que querem o catálogo inteiro (nenhum
  // caller hoje pede page > 1 nesse modo) — busca tudo do zero, ignora from/to.
  const data = await fetchAllRows<Record<string, unknown>>((f, t) =>
    supabaseAdmin.from('products').select('*').order('sort_order', { ascending: true }).range(f, t)
  )
  return NextResponse.json({ rows: data, total: data.length, page, perPage })
}
