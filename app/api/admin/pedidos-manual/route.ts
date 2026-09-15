import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import { getConfig } from '@/lib/config'

export async function POST(req: Request) {
  const auth = await requireAdmin('pedidos', 'rw')
  if (auth) return auth

  const { customer, itens } = await req.json() as { customer: { nome: string; cpf?: string; email?: string; telefone?: string; endereco?: string; cidade?: string }; itens: { id?: string; name: string; brand?: string; usd: number; quantity: number }[] }
  if (!customer?.nome || !itens?.length) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const config = await getConfig()

  // BRL é a fonte principal do preço (products.brl_price); USD é calculado a partir
  // do BRL só como referência de câmbio, nunca o contrário.
  const productIds = itens.map(i => i.id).filter(Boolean) as string[]
  const { data: prods } = productIds.length
    ? await supabaseAdmin.from('products').select('id, brl_price').in('id', productIds)
    : { data: [] as { id: string; brl_price: number | null }[] }
  const brlById = new Map((prods || []).map(p => [p.id, p.brl_price != null ? Number(p.brl_price) : null]))
  const itensBrl = itens.map(i => {
    const brlPrice = i.id ? brlById.get(i.id) : undefined
    const unitBrl = brlPrice != null ? brlPrice : +(i.usd * config.brl_rate).toFixed(2)
    return { ...i, unitBrl, subtotalBrl: +(unitBrl * i.quantity).toFixed(2) }
  })
  const totalBrl = +itensBrl.reduce((s, i) => s + i.subtotalBrl, 0).toFixed(2)
  const totalUsd = +(totalBrl / config.brl_rate).toFixed(2)
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
    .insert({ order_num: orderNum, customer_id: cust.id, total_usd: totalUsd, total_brl: totalBrl })
    .select('id').single()
  if (oe) return NextResponse.json({ error: oe.message }, { status: 500 })

  const items = itensBrl.map(i => {
    const unitUsd = +(i.unitBrl / config.brl_rate).toFixed(2)
    return {
      order_id: order.id,
      product_id: i.id || null,
      product_name: i.name,
      product_brand: i.brand || null,
      unit_usd: unitUsd,
      quantity: i.quantity,
      subtotal_usd: +(unitUsd * i.quantity).toFixed(2),
      unit_brl: i.unitBrl,
      subtotal_brl: i.subtotalBrl,
    }
  })

  const { error: ie } = await supabaseAdmin.from('order_items').insert(items)
  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 })

  await supabaseAdmin.from('order_status_history').insert({ order_id: order.id, status: 'pendente_pagamento' })

  await logAudit({ action: 'create', entity: 'pedido', entity_id: order.id, diff: { customer, itens, orderNum } })

  return NextResponse.json({ ok: true, orderNum })
}
