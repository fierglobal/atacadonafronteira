import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getConfig } from '@/lib/config'

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

  const { data } = await supabaseAdmin
    .from('order_items')
    .select('product_name, product_brand, unit_usd, quantity, products(brl_price)')
    .eq('order_id', orderId)
  const items = (data || []) as any[]

  // Repreça pelo catálogo atual (products.brl_price), não pelo valor histórico do
  // pedido — só cai pro unit_usd salvo se o produto sumiu ou ainda não tem brl_price.
  const { brl_rate } = await getConfig()

  return NextResponse.json({
    orderNum: order.order_num,
    items: items.map(i => {
      const brl = i.products?.brl_price
      const usd = brl != null && brl_rate > 0 ? Number(brl) / brl_rate : Number(i.unit_usd)
      return { name: i.product_name, brand: i.product_brand, usd, quantity: i.quantity }
    }),
  })
}
