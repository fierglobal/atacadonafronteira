import { NextResponse } from 'next/server'
import { isEmBreve } from '@/lib/produto'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { dispatchWebhook } from '@/lib/webhooks'
import { emailConfirmacaoPedido } from '@/lib/email'
import { idsEletronicos, idsFarmacia } from '@/lib/categorias'
import { calcularEntrega, ehEntregaTipo, type EntregaTipo } from '@/lib/entrega'
import { priceForQty, type Tier } from '@/lib/tier'

type Item = { id?: string; name: string; brand?: string; usd: number; quantity: number }
type Form = {
  nome: string; cpf: string; email: string; telefone: string; cidade: string; uf: string
  tipo_pessoa?: 'PF' | 'PJ'; cnpj?: string; razao_social?: string
  po_number?: string
  entrega_tipo?: EntregaTipo
  entrega_endereco?: string
  entrega_cep?: string
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
  let prods: { id: string; estoque: number | null; ativo: boolean; published_at: string | null; badges: string[] | null; usd_price: number; brl_price: number | null; categoria_id: string | null; limite_por_cpf: number | null }[] = []
  let tiersRows: { product_id: string; qty_min: number; qty_max: number | null; brl_price: number }[] = []
  if (productIds.length) {
    const [{ data }, { data: tData }] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('id, name, estoque, ativo, published_at, badges, usd_price, brl_price, categoria_id, limite_por_cpf')
        .in('id', productIds),
      supabaseAdmin
        .from('product_price_tiers')
        .select('product_id, qty_min, qty_max, brl_price')
        .in('product_id', productIds),
    ])
    prods = data || []
    tiersRows = (tData || []).map(t => ({ ...t, brl_price: Number(t.brl_price) }))
    const now = new Date()
    const indisponiveis: string[] = []
    for (const it of itens) {
      if (!it.id) continue
      const p = prods.find(x => x.id === it.id)
      if (!p || !p.ativo) { indisponiveis.push(it.name); continue }
      if (p.published_at && new Date(p.published_at) > now) { indisponiveis.push(it.name); continue }
      // Pré-venda não lançada: a vitrine já esconde preço e botão, mas UI não é barreira —
      // um POST direto aqui compraria um aparelho que ainda não existe.
      if (isEmBreve(p)) { indisponiveis.push(`${it.name} (ainda não está à venda)`); continue }
      if (p.estoque !== null && p.estoque < it.quantity) indisponiveis.push(`${it.name} (resta ${p.estoque})`)
    }
    if (indisponiveis.length) {
      return NextResponse.json({ error: 'Itens indisponíveis: ' + indisponiveis.join('; '), indisponiveis }, { status: 409 })
    }

    // Limite de unidades por CPF (drops/pré-vendas com estoque restrito): soma
    // tudo que esse CPF já tem em pedidos não cancelados (mesmo pedidos
    // separados) + o que está neste pedido, e recusa se passar do limite. Não
    // dá pra confiar só na tela — um POST direto ou vários pedidos burlariam.
    const produtosComLimite = prods.filter(p => p.limite_por_cpf != null)
    if (produtosComLimite.length && cpfDigits) {
      const { data: customersDoCpf } = await supabaseAdmin
        .from('customers')
        .select('id')
        .or(`cpf.eq.${form.cpf},cpf.eq.${cpfDigits}`)
      const customerIds = (customersDoCpf || []).map(c => c.id)
      const quantidadesAnteriores = new Map<string, number>()
      if (customerIds.length) {
        const { data: ordersDoCliente } = await supabaseAdmin
          .from('orders')
          .select('id')
          .in('customer_id', customerIds)
          .neq('status', 'cancelado')
        const orderIds = (ordersDoCliente || []).map(o => o.id)
        if (orderIds.length) {
          const { data: itensAnteriores } = await supabaseAdmin
            .from('order_items')
            .select('product_id, quantity')
            .in('order_id', orderIds)
            .in('product_id', produtosComLimite.map(p => p.id))
          for (const i of (itensAnteriores || [])) {
            if (!i.product_id) continue
            quantidadesAnteriores.set(i.product_id, (quantidadesAnteriores.get(i.product_id) || 0) + i.quantity)
          }
        }
      }
      const excedeLimite: string[] = []
      for (const p of produtosComLimite) {
        const it = itens.find(i => i.id === p.id)
        if (!it) continue
        const jaTem = quantidadesAnteriores.get(p.id) || 0
        if (jaTem + it.quantity > p.limite_por_cpf!) {
          const restam = Math.max(0, p.limite_por_cpf! - jaTem)
          excedeLimite.push(`${it.name} (limite de ${p.limite_por_cpf} por cliente — você ainda pode levar ${restam})`)
        }
      }
      if (excedeLimite.length) {
        return NextResponse.json({ error: 'Limite por cliente excedido: ' + excedeLimite.join('; ') }, { status: 409 })
      }
    }
  }

  // BRL é a fonte principal do preço (products.brl_price); USD é calculado a partir
  // do BRL só como referência de câmbio, nunca o contrário. O preço por unidade
  // respeita o tier de volume (product_price_tiers) — sem isso, um pedido de 100
  // caixas pagava o preço cheio mostrado só pra 1 unidade.
  const brlById = new Map(prods.map(p => [p.id, p.brl_price != null ? Number(p.brl_price) : null]))
  const tiersById = new Map<string, Tier[]>()
  for (const t of tiersRows) {
    const arr = tiersById.get(t.product_id) || []
    arr.push({ qty_min: t.qty_min, qty_max: t.qty_max, brl_price: t.brl_price })
    tiersById.set(t.product_id, arr)
  }
  const itensBrl = itens.map(i => {
    const brlPrice = i.id ? brlById.get(i.id) : undefined
    const unitBrl = brlPrice != null ? priceForQty(i.quantity, brlPrice, i.id ? tiersById.get(i.id) : undefined) : +(i.usd * config.brl_rate).toFixed(2)
    return { ...i, unitBrl, subtotalBrl: +(unitBrl * i.quantity).toFixed(2) }
  })

  let totalBrl = +itensBrl.reduce((s, i) => s + i.subtotalBrl, 0).toFixed(2)

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
  // Compra no site é só retirada — envio para o Brasil não é uma opção que a UI
  // oferece, mas um POST direto ainda poderia tentar; barrado aqui também.
  if (entregaTipo === 'envio_brasil') {
    return NextResponse.json({ error: 'No momento só aceitamos retirada em Ciudad del Este ou Foz do Iguaçu.' }, { status: 400 })
  }

  // Frete NUNCA vem do navegador. A tela mostra um número; aqui ele é refeito a
  // partir da categoria real e do preço com tier já aplicado de cada produto no
  // banco — é o mesmo motivo de o total do pedido não poder nascer do client.
  const catDe = new Map(prods.map(p => [p.id, p.categoria_id]))
  const [eletronicosIds, farmaciaIds] = await Promise.all([idsEletronicos(), idsFarmacia()])
  const cotacao = calcularEntrega(
    itensBrl.map(i => ({
      quantity: i.quantity,
      eletronico: eletronicosIds.has(catDe.get(i.id || '') || ''),
      farmacia: farmaciaIds.has(catDe.get(i.id || '') || ''),
      subtotalBRL: i.subtotalBrl,
    })),
    entregaTipo,
  )
  const freteBrl = cotacao.frete
  const seguroBrl = 0
  totalBrl = +(totalBrl + freteBrl).toFixed(2)
  const totalUsd = +(totalBrl / config.brl_rate).toFixed(2)

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
    entrega_endereco: null,
    entrega_cep: null,
    frete_zona_nome: null,
    frete_prazo_dias: null,
    frete_brl: freteBrl,
    seguro_brl: seguroBrl,
    seguro_recusado: false,
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

  const items = itensBrl.map(i => {
    const unitUsd = +(i.unitBrl / config.brl_rate).toFixed(2)
    return {
      order_id: order.id, product_id: i.id || null, product_name: i.name, product_brand: i.brand || null,
      unit_usd: unitUsd, quantity: i.quantity, subtotal_usd: +(unitUsd * i.quantity).toFixed(2),
      unit_brl: i.unitBrl, subtotal_brl: i.subtotalBrl,
    }
  })
  const { error: ie } = await supabaseAdmin.from('order_items').insert(items)
  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 })

  await supabaseAdmin.from('order_status_history').insert({ order_id: order.id, status: 'pendente_pagamento' })

  if (form.email) {
    emailConfirmacaoPedido(form.email, form.nome, orderNum,
      items.map(i => ({ name: i.product_name, usd: i.unit_usd, quantity: i.quantity })), totalBrl,
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
