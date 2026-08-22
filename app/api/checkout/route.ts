import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { dispatchWebhook } from '@/lib/webhooks'
import { emailConfirmacaoPedido } from '@/lib/email'
import { idsEletronicos } from '@/lib/categorias'
import { calcularEntrega, ehEntregaTipo, type EntregaTipo } from '@/lib/entrega'

type Item = { id?: string; name: string; brand?: string; usd: number; quantity: number }
type Form = {
  nome: string; cpf: string; email: string; telefone: string; cidade: string; uf: string
  tipo_pessoa?: 'PF' | 'PJ'; cnpj?: string; razao_social?: string
  po_number?: string
  entrega_tipo?: EntregaTipo
  entrega_endereco?: string
  seguro_recusado?: boolean
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string }
  honeypot?: string
}

const onlyDigits = (s: string | undefined | null) => (s || '').replace(/\D/g, '')

export async function POST(req: Request) {
  const rl = rateLimit(`checkout:${getIp(req)}`, 5, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 })

  const body = await req.json()
  const form = body.form as Form
  const itens = body.itens as Item[]
  const userId = body.userId as string | null
  const cupomIds = (body.cupomIds || (body.cupomId ? [body.cupomId] : [])) as string[]
  const nomeRetirador = body.nomeRetirador as string | null

  if (form.honeypot && form.honeypot.length > 0) {
    return NextResponse.json({ error: 'Erro de validação' }, { status: 400 })
  }
  if (!itens?.length) return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })

  const config = await getConfig()

  const cpfDigits = onlyDigits(form.cpf)
  if (cpfDigits) {
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id, bloqueado')
      .or(`cpf.eq.${form.cpf},cpf.eq.${cpfDigits}`)
      .limit(1)
      .maybeSingle()
    if (existing?.bloqueado) {
      return NextResponse.json({ error: 'Não foi possível concluir o pedido. Entre em contato pelo WhatsApp.' }, { status: 403 })
    }
  }

  const productIds = itens.map(i => i.id).filter(Boolean) as string[]
  if (productIds.length) {
    const { data: prods } = await supabaseAdmin
      .from('products')
      .select('id, name, estoque, ativo, published_at')
      .in('id', productIds)
    const now = new Date()
    const indisponiveis: string[] = []
    for (const it of itens) {
      if (!it.id) continue
      const p = (prods || []).find(x => x.id === it.id)
      if (!p || !p.ativo) { indisponiveis.push(it.name); continue }
      if (p.published_at && new Date(p.published_at) > now) { indisponiveis.push(it.name); continue }
      if (p.estoque !== null && p.estoque < it.quantity) indisponiveis.push(`${it.name} (resta ${p.estoque})`)
    }
    if (indisponiveis.length) {
      return NextResponse.json({ error: 'Itens indisponíveis: ' + indisponiveis.join('; '), indisponiveis }, { status: 409 })
    }
  }

  const totalUsd = +itens.reduce((s, i) => s + i.usd * i.quantity, 0).toFixed(2)
  let totalBrl = +(totalUsd * config.brl_rate).toFixed(2)

  const cupomIdsAplicados: string[] = []
  let totalDescontoPct = 0
  if (cupomIds.length) {
    const { data: cupons } = await supabaseAdmin
      .from('cupons')
      .select('id, desconto_pct, ativo, validade, usos_max, usos_count')
      .in('id', cupomIds.slice(0, 2))
    for (const cupom of (cupons || [])) {
      if (!cupom.ativo) continue
      if (cupom.validade && new Date(cupom.validade) < new Date()) continue
      if (cupom.usos_max && cupom.usos_count >= cupom.usos_max) continue
      totalDescontoPct += cupom.desconto_pct
      cupomIdsAplicados.push(cupom.id)
    }
    totalDescontoPct = Math.min(totalDescontoPct, 90)
    if (totalDescontoPct > 0) {
      totalBrl = +(totalBrl * (1 - totalDescontoPct / 100)).toFixed(2)
      for (const cid of cupomIdsAplicados) {
        const cupom = (cupons || []).find(c => c.id === cid)
        if (cupom) supabaseAdmin.from('cupons').update({ usos_count: (cupom.usos_count || 0) + 1 }).eq('id', cid).then(() => {})
      }
    }
  }

  if (config.pedido_minimo_brl && totalBrl < config.pedido_minimo_brl) {
    return NextResponse.json({
      error: `Pedido mínimo R$ ${config.pedido_minimo_brl.toFixed(2).replace('.', ',')}. Total atual R$ ${totalBrl.toFixed(2).replace('.', ',')}.`,
      pedido_minimo: config.pedido_minimo_brl, total_atual: totalBrl,
    }, { status: 422 })
  }

  const entregaTipo: EntregaTipo = ehEntregaTipo(form.entrega_tipo) ? form.entrega_tipo : 'retirada_cde'
  if (entregaTipo === 'envio_brasil' && !(form.entrega_endereco || '').trim()) {
    return NextResponse.json({ error: 'Informe o endereço completo para o envio.' }, { status: 400 })
  }

  // Frete e seguro NUNCA vêm do navegador. A tela mostra um número; aqui ele é
  // refeito a partir da categoria real de cada produto no banco. Se divergir, vale
  // este — é o mesmo motivo de o total do pedido não poder nascer do client.
  const [eletronicosIds, { data: prodsCat }] = await Promise.all([
    idsEletronicos(),
    supabaseAdmin.from('products').select('id, categoria_id').in('id', productIds.length ? productIds : ['00000000-0000-0000-0000-000000000000']),
  ])
  const catDe = new Map((prodsCat || []).map(p => [p.id as string, p.categoria_id as string | null]))
  const cotacao = calcularEntrega(
    itens.map(i => ({ quantity: i.quantity, eletronico: eletronicosIds.has(catDe.get(i.id || '') || '') })),
    entregaTipo,
    form.seguro_recusado === true,
  )
  const freteBrl = cotacao.frete
  const seguroBrl = cotacao.seguro
  totalBrl = +(totalBrl + freteBrl + seguroBrl).toFixed(2)

  const orderNum = `AF${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  const copyHash = (crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)).slice(0, 16)
  const pixExpiraEm = new Date(Date.now() + config.pix_expiry_minutes * 60_000).toISOString()

  const customerPayload: Record<string, unknown> = {
    nome: form.nome, cpf: form.cpf, email: form.email, telefone: form.telefone,
    cidade: form.cidade, uf: form.uf, user_id: userId || null,
  }
  if (form.tipo_pessoa === 'PJ') {
    customerPayload.cnpj = form.cnpj || null
    customerPayload.razao_social = form.razao_social || null
  }
  if (form.utm?.source) customerPayload.origem = form.utm.source


  const { data: customer, error: ce } = await supabaseAdmin
    .from('customers').insert(customerPayload).select('id').single()
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 })

  const orderPayload: Record<string, unknown> = {
    order_num: orderNum, customer_id: customer.id, user_id: userId || null,
    total_usd: totalUsd, total_brl: totalBrl, copy_hash: copyHash,
    pix_expira_em: pixExpiraEm,
    po_number: form.po_number || null,
    entrega_tipo: entregaTipo,
    entrega_endereco: entregaTipo === 'envio_brasil' ? form.entrega_endereco!.trim() : null,
    frete_brl: freteBrl,
    seguro_brl: seguroBrl,
    seguro_recusado: cotacao.seguroDisponivel ? form.seguro_recusado === true : false,
    tipo_pessoa: form.tipo_pessoa || 'PF',
    cnpj: form.tipo_pessoa === 'PJ' ? (form.cnpj || null) : null,
    razao_social: form.tipo_pessoa === 'PJ' ? (form.razao_social || null) : null,
    utm_source: form.utm?.source || null,
    utm_medium: form.utm?.medium || null,
    utm_campaign: form.utm?.campaign || null,
    utm_content: form.utm?.content || null,
    utm_term: form.utm?.term || null,
    cupom_ids: cupomIdsAplicados.length ? cupomIdsAplicados : null,
  }
  if (nomeRetirador) orderPayload.notas = `Retirada por: ${nomeRetirador}`

  const { data: order, error: oe } = await supabaseAdmin
    .from('orders').insert(orderPayload).select('id').single()
  if (oe) return NextResponse.json({ error: oe.message }, { status: 500 })

  const items = itens.map(i => ({
    order_id: order.id, product_name: i.name, product_brand: i.brand || null,
    unit_usd: i.usd, quantity: i.quantity, subtotal_usd: +(i.usd * i.quantity).toFixed(2),
  }))
  const { error: ie } = await supabaseAdmin.from('order_items').insert(items)
  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 })

  await supabaseAdmin.from('order_status_history').insert({ order_id: order.id, status: 'pendente_pagamento' })

  if (form.email) {
    emailConfirmacaoPedido(form.email, form.nome, orderNum,
      itens.map(i => ({ name: i.name, usd: i.usd, quantity: i.quantity })), totalBrl,
    ).catch(() => {})
  }

  dispatchWebhook('order.created', {
    order_id: order.id, order_num: orderNum,
    customer: { id: customer.id, nome: form.nome, email: form.email, telefone: form.telefone, cidade: form.cidade, uf: form.uf },
    total_usd: totalUsd, total_brl: totalBrl,
    items: items.map(i => ({ name: i.product_name, qty: i.quantity, unit_usd: i.unit_usd })),
    utm: form.utm || {}, po_number: form.po_number || null,
  }).catch(() => {})

  return NextResponse.json({
    ok: true, orderId: order.id, orderNum, copyHash,
    pixExpiraEm, estimatedReadyTime: config.estimated_ready_time,
    // O valor do PIX sai daqui, não de uma reconta no navegador: a tela não
    // conhece frete nem seguro finais, e um QR com valor menor que o pedido
    // significa cliente pagando a menos sem ninguém notar.
    totalBrl, freteBrl, seguroBrl,
  })
}
