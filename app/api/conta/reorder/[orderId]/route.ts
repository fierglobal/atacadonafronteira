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

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('product_name, product_brand, unit_usd, quantity')
    .eq('order_id', orderId)

  return NextResponse.json({
    orderNum: order.order_num,
    items: (items || []).map(i => ({
      name: i.product_name, brand: i.product_brand,
      usd: Number(i.unit_usd), quantity: i.quantity,
    })),
  })
}
