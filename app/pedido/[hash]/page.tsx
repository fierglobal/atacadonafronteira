import { Fragment } from 'react'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { notFound } from 'next/navigation'
import { ENTREGA_LABEL, ehEntregaTipo, type EntregaTipo } from '@/lib/entrega'
import Logo from '@/components/Logo'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }): Promise<Metadata> {
  const { hash } = await params
  const { data: order } = await supabaseAdmin.from('orders').select('order_num').eq('copy_hash', hash).single()
  return { title: order ? `Pedido ${order.order_num} — Atacado na Fronteira` : 'Pedido não encontrado' }
}

type OrderItem = { product_name: string; product_brand: string | null; unit_usd: number; unit_brl: number | null; quantity: number; subtotal_usd: number; subtotal_brl: number | null; categoriaNome: string }
type OrderItemRaw = { product_id: string | null; product_name: string; product_brand: string | null; unit_usd: number; unit_brl: number | null; quantity: number; subtotal_usd: number; subtotal_brl: number | null; products: { categoria_id: string | null } | null }
type Customer = { nome: string; cpf: string; email: string; telefone: string; cidade: string; uf: string }

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_META: Record<string, { label: (envio: boolean) => string; bg: string; color: string }> = {
  pendente_pagamento: { label: () => 'Aguardando pagamento (PIX)', bg: '#fff7ed', color: '#c2410c' },
  pago: { label: () => 'Pago', bg: '#f0fdf4', color: '#15803d' },
  pronto_retirada: { label: envio => envio ? 'Enviado' : 'Pronto para retirada', bg: '#FAF1E9', color: '#9D7133' },
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

  const grupos = xs.reduce((acc, it) => {
    ;(acc[it.categoriaNome] ||= []).push(it)
    return acc
  }, {} as Record<string, OrderItem[]>)
  const categorias = Object.keys(grupos).sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b))
  const mostrarGrupos = categorias.length > 1
  const pago = ['pago', 'pronto_retirada', 'retirado'].includes(order.status)

  return (
    <>
      <style>{`
        @page { margin: 12mm; }
        #pedido-copia-doc, #pedido-copia-doc * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-sizing: border-box; }
        #pedido-copia-doc { color: #0a0a0a; background: #fafafa; margin: 0; padding: 32px 16px 64px; font-size: 13px; line-height: 1.5; min-height: 100vh; }
        #pedido-copia-doc table { width: 100%; border-collapse: collapse; }
        @media print {
          .no-print { display: none !important; }
          #pedido-copia-doc { background: #fff; padding: 0; }
          .print-card { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
          .bridge-accent { display: none !important; }
        }
      `}</style>
      <div id="pedido-copia-doc">
        <div style={{ maxWidth: 800, margin: '0 auto' }} className="print-card">
          <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div className="bridge-accent" style={{ height: 4, background: 'linear-gradient(90deg,#D6A865,#E1BC84,#D6A865)' }} />

            {/* Header */}
            <div style={{ padding: '32px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
              <Logo size={32} />
              <div style={{ textAlign: 'right' }}>
                <div className="no-print" style={{ marginBottom: 14 }}>
                  <PrintButton />
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Pedido</p>
                <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: '#0a0a0a' }}>#{order.order_num}</p>
                <p style={{ fontSize: 11, color: '#737373', margin: '4px 0 0' }}>Gerado em {dt}</p>
              </div>
            </div>

            {/* Status badge */}
            <div style={{ padding: '20px 32px 24px', borderBottom: '1px solid #ececec' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: statusBg, color: statusColor, border: `1px solid ${statusColor}30`, fontSize: 11, fontWeight: 900, borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {statusLabel}
              </span>
            </div>

            {/* Cliente + Retirada */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#ececec' }}>
              <div style={{ background: '#ffffff', padding: 32 }}>
                <h2 style={{ fontSize: 11, fontWeight: 900, color: '#9D7133', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 20px' }}>Dados do Cliente</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Nome Completo</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: 0 }}>{c.nome}</p>
                  </div>
                  {order.tipo_pessoa === 'PJ' ? (
                    <>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Razão Social</p>
                        <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>{order.razao_social || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>CNPJ</p>
                        <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>{order.cnpj || '—'}</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>CPF</p>
                      <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>{c.cpf}</p>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>E-mail</p>
                      <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>{c.email}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>WhatsApp</p>
                      <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>{c.telefone}</p>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Localidade</p>
                    <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>{c.cidade}/{c.uf}</p>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fafafa', padding: 32 }}>
                <h2 style={{ fontSize: 11, fontWeight: 900, color: '#9D7133', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 20px' }}>
                  {envio ? 'Informações de Entrega' : 'Informações de Retirada'}
                </h2>
                <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9D7133" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div>
                      {envio ? (
                        <>
                          <p style={{ fontSize: 12, fontWeight: 900, color: '#0a0a0a', textTransform: 'uppercase', margin: 0 }}>Endereço de entrega</p>
                          <p style={{ fontSize: 13, color: '#525252', margin: '6px 0 0', lineHeight: 1.6 }}>{order.entrega_endereco || '—'}</p>
                          {order.codigo_rastreio && (
                            <p style={{ fontSize: 11, fontWeight: 900, color: '#9D7133', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 0' }}>Rastreio: {order.codigo_rastreio}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 12, fontWeight: 900, color: '#0a0a0a', textTransform: 'uppercase', margin: 0 }}>Ponto de Coleta Ciudad del Este</p>
                          <p style={{ fontSize: 13, color: '#525252', margin: '6px 0 0', lineHeight: 1.6 }}>Retirada em nossa loja, no centro comercial de Ciudad del Este, Paraguai.</p>
                          {order.nome_retirador && (
                            <p style={{ fontSize: 12, color: '#525252', margin: '8px 0 0' }}>Retirador: <strong style={{ color: '#0a0a0a' }}>{order.nome_retirador}</strong></p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: '#737373', lineHeight: 1.6, margin: '20px 0 0' }}>
                  * Apresente este documento digital ou impresso junto a um documento original com foto para realizar a retirada.
                </p>
              </div>
            </div>

            {/* Itens */}
            <div style={{ padding: 32 }}>
              <h2 style={{ fontSize: 11, fontWeight: 900, color: '#9D7133', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 20px' }}>Itens da Mercadoria</h2>
              <table>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(214,168,101,0.1)' }}>
                    <th style={{ padding: '0 16px 14px 0', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Produto</th>
                    <th style={{ padding: '0 16px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Qtd</th>
                    <th style={{ padding: '0 16px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit. (R$)</th>
                    <th style={{ padding: '0 0 14px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map(cat => (
                    <Fragment key={cat}>
                      {mostrarGrupos && (
                        <tr>
                          <td colSpan={4} style={{ paddingTop: 20, paddingBottom: 8, fontSize: 10, fontWeight: 900, color: '#9D7133', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f5f5f5' }}>{cat}</td>
                        </tr>
                      )}
                      {grupos[cat].map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '14px 16px 14px 0' }}>
                            <span style={{ fontWeight: 700, color: '#0a0a0a' }}>{it.product_name}</span>
                            {it.product_brand && <span style={{ display: 'block', fontSize: 11, color: '#737373', marginTop: 2 }}>{it.product_brand}</span>}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>{String(it.quantity).padStart(2, '0')}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#525252' }}>R$ {fmt(it.unit_brl ?? it.unit_usd * taxaDoPedido)}</td>
                          <td style={{ padding: '14px 0 14px 16px', textAlign: 'right', fontWeight: 700, color: '#0a0a0a' }}>R$ {fmt(it.subtotal_brl ?? it.subtotal_usd * taxaDoPedido)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, marginLeft: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#525252' }}>
                  <span>Subtotal</span><span>R$ {fmt(subtotalItens)}</span>
                </div>
                {descontoValor > 0.01 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#525252' }}>
                    <span>Desconto{cupomCodigos.length ? ` (${cupomCodigos.join(', ')})` : ''}</span><span>-R$ {fmt(descontoValor)}</span>
                  </div>
                )}
                {freteBrl > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#525252' }}>
                    <span>Frete</span><span>R$ {fmt(freteBrl)}</span>
                  </div>
                )}
                {seguroBrl > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#525252' }}>
                    <span>Seguro de carga</span><span>R$ {fmt(seguroBrl)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, paddingTop: 14, borderTop: '1px solid #ececec' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total do Pedido</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#9D7133', letterSpacing: '-0.02em' }}>R$ {fmt(totalBRL)}</span>
                </div>
                <p style={{ fontSize: 10, color: '#a3a3a3', textAlign: 'right', margin: '2px 0 0' }}>USD ${order.total_usd.toFixed(2)} · taxa {config.brl_rate}</p>
              </div>

              {order.notas && (
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #ececec' }}>
                  <h2 style={{ fontSize: 11, fontWeight: 900, color: '#9D7133', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>Observações</h2>
                  <p style={{ fontSize: 13, color: '#525252', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{order.notas}</p>
                </div>
              )}

              {/* Payment footer */}
              <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #ececec', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: pago ? 'rgba(15,122,61,0.1)' : 'rgba(245,158,11,0.1)', color: pago ? '#0f7a3d' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {pago ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                      {pago ? 'Pagamento Confirmado' : 'Aguardando Pagamento'}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0a', margin: '2px 0 0' }}>Transação via PIX · {dt}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Autenticação Digital</p>
                  <p style={{ fontSize: 9, fontFamily: 'monospace', color: '#a3a3a3', margin: '2px 0 0' }}>{hash}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="no-print" style={{ maxWidth: 800, margin: '32px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <a href="/" style={{ fontSize: 12, fontWeight: 900, color: '#9D7133', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ← Voltar para o catálogo
            </a>
            <p style={{ fontSize: 11, color: '#737373', lineHeight: 1.6, margin: 0 }}>
              © 2026 Atacado na Fronteira. Esta é uma cópia pública do pedido.<br />
              O uso indevido deste documento é passível de sanções legais.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
