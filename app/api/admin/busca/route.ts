import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

function toTsQuery(q: string): string {
  return q.split(/\s+/).filter(Boolean).map(t => t.replace(/[^\w]/g, '') + ':*').join(' & ')
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (auth) return auth

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ orders: [], customers: [], products: [] })

  const tsq = toTsQuery(q)
  const pattern = `%${q}%`

  const ordersP = supabaseAdmin
    .from('orders')
    .select('id, order_num, status, total_brl, created_at, customers(nome, telefone)')
    .ilike('order_num', pattern)
    .order('created_at', { ascending: false })
    .limit(8)

  const customersP = tsq
    ? supabaseAdmin.from('customers')
        .select('id, nome, cpf, telefone, email, created_at')
        .textSearch('search_tsv', tsq, { config: 'simple' })
        .order('created_at', { ascending: false })
        .limit(8)
    : Promise.resolve({ data: [] })

  const productsP = tsq
    ? supabaseAdmin.from('products')
        .select('id, name, brand, usd_price, estoque, ativo')
        .textSearch('search_tsv', tsq, { config: 'portuguese' })
        .limit(8)
    : Promise.resolve({ data: [] })

  const [orders, customers, products] = await Promise.all([ordersP, customersP, productsP])

  return NextResponse.json({
    orders: orders.data || [],
    customers: customers.data || [],
    products: products.data || [],
  })
}
