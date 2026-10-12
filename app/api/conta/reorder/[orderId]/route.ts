import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: order } = await supabaseAdmin
    .from('orders').select('id, order_num, user_id').eq('id', orderId).single()
  if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  type OrderItemRow = {
    product_name: string; product_brand: string | null; unit_usd: number; quantity: number
    products: { usd_price: number | null; usd_price_promo: number | null } | null
  }
  const { data } = await supabaseAdmin
    .from('order_items')
    .select('product_name, product_brand, unit_usd, quantity, products(usd_price, usd_price_promo)')
    .eq('order_id', orderId)
    .returns<OrderItemRow[]>()
  const items = data || []

  // Repreça pelo catálogo atual (products.usd_price/usd_price_promo), não pelo
  // valor histórico do pedido — só cai pro unit_usd salvo se o produto sumiu.
  // Saída já é em USD, câmbio não entra nesta conta.

  return NextResponse.json({
    orderNum: order.order_num,
    items: items.map(i => {
      const p = i.products
      const usdAtual = p?.usd_price != null
        ? ((p.usd_price_promo != null && Number(p.usd_price_promo) < Number(p.usd_price)) ? Number(p.usd_price_promo) : Number(p.usd_price))
        : null
      return { name: i.product_name, brand: i.product_brand, usd: usdAtual ?? Number(i.unit_usd), quantity: i.quantity }
    }),
  })
}
