import { Fragment } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { notFound } from 'next/navigation'
import { ENTREGA_LABEL, ehEntregaTipo, type EntregaTipo } from '@/lib/entrega'
import Logo from '@/components/Logo'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

type OrderItem = { product_name: string; product_brand: string | null; unit_usd: number; unit_brl: number | null; quantity: number; subtotal_usd: number; subtotal_brl: number | null; categoriaNome: string }
type OrderItemRaw = { product_id: string | null; product_name: string; product_brand: string | null; unit_usd: number; unit_brl: number | null; quantity: number; subtotal_usd: number; subtotal_brl: number | null; products: { categoria_id: string | null } | null }
type Customer = { nome: string; cpf: string; email: string; telefone: string; cidade: string; uf: string }

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_META: Record<string, { label: (envio: boolean) => string; bg: string; color: string }> = {
  pendente_pagamento: { label: () => 'Aguardando pagamento (PIX)', bg: '#fff7ed', color: '#c2410c' },
  pago: { label: () => 'Pago', bg: '#f0fdf4', color: '#15803d' },
  pronto_retirada: { label: envio => envio ? 'Enviado' : 'Pronto para retirada', bg: '#eef2ff', color: '#420E76' },
  retirado: { label: envio => envio ? 'Entregue' : 'Retirado', bg: '#f0fdf4', color: '#065f46' },
  cancelado: { label: () => 'Cancelado', bg: '#fef2f2', color: '#b91c1c' },
}

export default async function PedidoCopia({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_num, total_usd, total_brl, status, created_at, notas, customer_id, entrega_tipo, entrega_endereco, frete_brl, seguro_brl, codigo_rastreio, nome_retirador, tipo_pessoa, cnpj, razao_social, cupom_ids')
    .eq('copy_hash', hash)
    .single()
  if (!order) return notFound()

  const [{ data: customer }, { data: items }, { data: cupons }, config] = await Promise.all([
    supabaseAdmin.from('customers').select('nome, cpf, email, telefone, cidade, uf').eq('id', order.customer_id).single(),
    supabaseAdmin.from('order_items').select('product_id, product_name, product_brand, unit_usd, unit_brl, quantity, subtotal_usd, subtotal_brl, products(categoria_id)').eq('order_id', order.id),
    order.cupom_ids?.length
      ? supabaseAdmin.from('cupons').select('codigo').in('id', order.cupom_ids)
      : Promise.resolve({ data: [] as { codigo: string }[] }),
    getConfig(),
  ])

  const c = (customer as Customer) || { nome: '', cpf: '', email: '', telefone: '', cidade: '', uf: '' }
  const raw = (items as unknown as OrderItemRaw[]) || []

  // products.categoria_id não tem FK formal para categorias — PostgREST recusa o
  // embed aninhado products(categorias(nome)) com PGRST200, resolvido à mão aqui.
  const catIds = [...new Set(raw.map(i => i.products?.categoria_id).filter(Boolean))] as string[]
  const catMap = new Map<string, string>()
  if (catIds.length) {
    const { data: cats } = await supabaseAdmin.from('categorias').select('id, nome').in('id', catIds)
    ;(cats || []).forEach(cat => catMap.set(cat.id, cat.nome))
  }
  const xs: OrderItem[] = raw.map(i => ({
    product_name: i.product_name, product_brand: i.product_brand, unit_usd: i.unit_usd, unit_brl: i.unit_brl,
    quantity: i.quantity, subtotal_usd: i.subtotal_usd, subtotal_brl: i.subtotal_brl,
    categoriaNome: (i.products?.categoria_id && catMap.get(i.products.categoria_id)) || 'Outros',
  }))
  const totalBRL = order.total_brl || order.total_usd * config.brl_rate
  // Pedidos antigos não têm unit_brl/subtotal_brl por item — taxa do próprio pedido
  // reconstrói o BRL de cada linha pra elas somarem exatamente o total.
  const taxaDoPedido = order.total_usd > 0 ? totalBRL / order.total_usd : config.brl_rate
  const dt = new Date(order.created_at).toLocaleString('pt-BR')

  const entregaTipo: EntregaTipo = ehEntregaTipo(order.entrega_tipo) ? order.entrega_tipo : 'retirada_cde'
  const envio = entregaTipo === 'envio_brasil'
  const freteBrl = Number(order.frete_brl || 0)
  const seguroBrl = Number(order.seguro_brl || 0)
  const subtotalItens = xs.reduce((s, i) => s + (i.subtotal_brl ?? i.subtotal_usd * taxaDoPedido), 0)
  // order_items guarda o valor cheio (pré-cupom) — o desconto é a diferença entre
  // esse subtotal e o que o total final realmente cobrou de mercadoria.
  const descontoValor = Math.max(0, +(subtotalItens + freteBrl + seguroBrl - totalBRL).toFixed(2))
  const cupomCodigos = (cupons || []).map(cp => cp.codigo)
  const statusMeta = STATUS_META[order.status]
  const statusLabel = statusMeta ? statusMeta.label(envio) : order.status
  const statusBg = statusMeta?.bg ?? '#f3f4f6'
  const statusColor = statusMeta?.color ?? '#374151'

  return (
    <html lang="pt-BR">
      <head>
        <title>Pedido {order.order_num} — Atacado na Fronteira</title>
        <style>{`
          @page { margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0a0a0a; background: #fff; padding: 24px; max-width: 720px; margin: 0 auto; font-size: 13px; line-height: 1.5; }
          h1 { font-size: 22px; margin: 0 0 4px; color: #420E76; }
          h2 { font-size: 13px; text-transform: uppercase; color: #420E76; margin: 24px 0 8px; letter-spacing: 0.08em; font-weight: 800; border-bottom: 1px solid #ececec; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; color: #737373; padding: 8px 4px; border-bottom: 2px solid #ececec; }
          td { padding: 8px 4px; border-bottom: 1px solid #ececec; vertical-align: top; }
          .right { text-align: right; }
          .muted { color: #737373; font-size: 11px; }
          .total { font-size: 18px; font-weight: 900; color: #420E76; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
          .btn { display: inline-block; padding: 10px 18px; background: #420E76; color: #fff; border-radius: 4px; text-decoration: none; font-size: 13px; }
          @media print { .no-print { display: none } }
        `}</style>
      </head>
      <body>
        <div style={{ height: 5, background: 'linear-gradient(90deg,#420E76,#A965ED)', borderRadius: 3, marginBottom: 18 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <Logo size={30} />
            <p className="muted" style={{ marginTop: 8 }}>Cópia do pedido</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, margin: 0, color: '#737373' }}>Pedido</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>#{order.order_num}</p>
            <p className="muted" style={{ margin: '4px 0 0' }}>{dt}</p>
          </div>
        </div>

        <span className="badge" style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>

        <h2>Cliente</h2>
        <table>
          <tbody>
            <tr><td style={{ width: 120, color: '#737373' }}>Nome</td><td>{c.nome}</td></tr>
            {order.tipo_pessoa === 'PJ' ? (
              <>
                <tr><td style={{ color: '#737373' }}>Razão Social</td><td>{order.razao_social || '—'}</td></tr>
                <tr><td style={{ color: '#737373' }}>CNPJ</td><td>{order.cnpj || '—'}</td></tr>
              </>
            ) : (
              <tr><td style={{ color: '#737373' }}>CPF</td><td>{c.cpf}</td></tr>
            )}
            <tr><td style={{ color: '#737373' }}>Telefone</td><td>{c.telefone}</td></tr>
            <tr><td style={{ color: '#737373' }}>E-mail</td><td>{c.email}</td></tr>
            <tr><td style={{ color: '#737373' }}>Cidade</td><td>{c.cidade}/{c.uf}</td></tr>
          </tbody>
        </table>

        <h2>Entrega</h2>
        <table>
          <tbody>
            <tr><td style={{ width: 120, color: '#737373' }}>Modalidade</td><td>{ENTREGA_LABEL[entregaTipo]}</td></tr>
            {envio ? (
              <>
                <tr><td style={{ color: '#737373' }}>Endereço</td><td>{order.entrega_endereco || '—'}</td></tr>
                {order.codigo_rastreio && <tr><td style={{ color: '#737373' }}>Rastreio</td><td>{order.codigo_rastreio}</td></tr>}
              </>
            ) : order.nome_retirador ? (
              <tr><td style={{ color: '#737373' }}>Retirador</td><td>{order.nome_retirador}</td></tr>
            ) : null}
          </tbody>
        </table>

        <h2>Pagamento</h2>
        <table>
          <tbody>
            <tr><td style={{ width: 120, color: '#737373' }}>Forma de pagamento</td><td>PIX</td></tr>
          </tbody>
        </table>

        <h2>Itens</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="right">Qtd</th>
              <th className="right">Unit. (R$)</th>
              <th className="right">Subtotal (R$)</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const grupos = xs.reduce((acc, it) => {
                ;(acc[it.categoriaNome] ||= []).push(it)
                return acc
              }, {} as Record<string, OrderItem[]>)
              const categorias = Object.keys(grupos).sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b))
              const mostrarGrupos = categorias.length > 1
              return categorias.map(cat => (
                <Fragment key={cat}>
                  {mostrarGrupos && (
                    <tr><td colSpan={4} style={{ fontSize: 11, fontWeight: 700, color: '#420E76', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 10 }}>{cat}</td></tr>
                  )}
                  {grupos[cat].map((it, i) => (
                    <tr key={i}>
                      <td>
                        {it.product_name}
                        {it.product_brand && <div className="muted">{it.product_brand}</div>}
                      </td>
                      <td className="right">{it.quantity}</td>
                      <td className="right">R$ {fmt(it.unit_brl ?? it.unit_usd * taxaDoPedido)}</td>
                      <td className="right">R$ {fmt(it.subtotal_brl ?? it.subtotal_usd * taxaDoPedido)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))
            })()}
          </tbody>
        </table>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#374151', marginBottom: 4 }}>
            <span className="muted">Subtotal</span><span>R$ {fmt(subtotalItens)}</span>
          </div>
          {descontoValor > 0.01 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#374151', marginBottom: 4 }}>
              <span className="muted">Desconto{cupomCodigos.length ? ` (${cupomCodigos.join(', ')})` : ''}</span><span>-R$ {fmt(descontoValor)}</span>
            </div>
          )}
          {freteBrl > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#374151', marginBottom: 4 }}>
              <span className="muted">Frete</span><span>R$ {fmt(freteBrl)}</span>
            </div>
          )}
          {seguroBrl > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#374151', marginBottom: 4 }}>
              <span className="muted">Seguro de carga</span><span>R$ {fmt(seguroBrl)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 8, borderTop: '2px solid #420E76' }}>
            <span className="muted">Total geral</span>
            <span className="total">R$ {fmt(totalBRL)}</span>
          </div>
        </div>
        <p className="muted" style={{ textAlign: 'right', margin: '4px 0 0' }}>USD ${order.total_usd.toFixed(2)} · taxa {config.brl_rate}</p>

        {order.notas && <><h2>Observações</h2><p style={{ whiteSpace: 'pre-wrap' }}>{order.notas}</p></>}

        <PrintButton />

        <p style={{ marginTop: 40, textAlign: 'center', fontSize: 10, color: '#aaa' }}>
          atacadonafronteira.com · documento gerado automaticamente
        </p>
      </body>
    </html>
  )
}
