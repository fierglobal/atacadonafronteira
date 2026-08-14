import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { rateLimit, getIp } from '@/lib/rate-limit'

export async function GET(req: Request, { params }: { params: Promise<{ orderNum: string }> }) {
  const rl = rateLimit(`pedido-pix:${getIp(req)}`, 20, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 })
  const { orderNum } = await params
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_num, status, total_brl, total_usd, copy_hash, pix_expira_em, created_at, customer_id')
    .eq('order_num', orderNum)
    .single()
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (order.status !== 'pendente_pagamento') {
    return NextResponse.json({ error: 'Este pedido já foi processado', status: order.status }, { status: 410 })
  }

  const [{ data: customer }, { data: items }, config] = await Promise.all([
    supabaseAdmin.from('customers').select('nome, telefone').eq('id', order.customer_id).single(),
    supabaseAdmin.from('order_items').select('product_name, quantity, unit_usd, subtotal_usd').eq('order_id', order.id),
    getConfig(),
  ])

  return NextResponse.json({
    orderNum: order.order_num,
    totalBRL: order.total_brl,
    totalUSD: order.total_usd,
    copyHash: order.copy_hash,
    pixExpiraEm: order.pix_expira_em,
    createdAt: order.created_at,
    customer, items: items || [],
    pixKey: config.pix_key,
    pixHolder: config.pix_holder,
  })
}
