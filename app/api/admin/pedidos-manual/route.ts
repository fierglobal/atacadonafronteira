import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import { getConfig } from '@/lib/config'

export async function POST(req: Request) {
  const auth = await requireAdmin('pedidos', 'rw')
  if (auth) return auth

  const { customer, itens } = await req.json()
  if (!customer?.nome || !itens?.length) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const config = await getConfig()
  const totalUsd = +(itens as { usd: number; quantity: number }[]).reduce((s, i) => s + i.usd * i.quantity, 0).toFixed(2)
  const orderNum = `AP${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

  const { data: cust, error: ce } = await supabaseAdmin
    .from('customers')
    .insert({
      nome: customer.nome, cpf: customer.cpf || '', email: customer.email || '',
      telefone: customer.telefone || '', cep: '', endereco: customer.endereco || '',
      numero: '', complemento: '', bairro: '', cidade: customer.cidade || '', uf: '',
    })
    .select('id').single()
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 })

  const { data: order, error: oe } = await supabaseAdmin
    .from('orders')
    .insert({ order_num: orderNum, customer_id: cust.id, total_usd: totalUsd, total_brl: +(totalUsd * config.brl_rate).toFixed(2) })
    .select('id').single()
  if (oe) return NextResponse.json({ error: oe.message }, { status: 500 })

  const items = (itens as { id?: string; name: string; brand?: string; usd: number; quantity: number }[]).map(i => ({
    order_id: order.id,
    product_id: i.id || null,
    product_name: i.name,
    product_brand: i.brand || null,
    unit_usd: i.usd,
    quantity: i.quantity,
    subtotal_usd: +(i.usd * i.quantity).toFixed(2),
  }))

  const { error: ie } = await supabaseAdmin.from('order_items').insert(items)
  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 })

  await supabaseAdmin.from('order_status_history').insert({ order_id: order.id, status: 'pendente_pagamento' })

  await logAudit({ action: 'create', entity: 'pedido', entity_id: order.id, diff: { customer, itens, orderNum } })

  return NextResponse.json({ ok: true, orderNum })
}
