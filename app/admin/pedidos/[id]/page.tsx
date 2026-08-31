'use client'
import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { WILSON_ORDER_IDS } from '@/lib/wilson-pedido-listas'

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

const STATUSES = [
  { value: 'pendente_pagamento', label: 'Pendente PIX', color: '#f59e0b' },
  { value: 'pago', label: 'Pago', color: '#3b82f6' },
  { value: 'pronto_retirada', label: 'Pronto p/ Retirada', color: '#A965ED' },
  { value: 'retirado', label: 'Retirado', color: '#555' },
  { value: 'cancelado', label: 'Cancelado', color: '#ef4444' },
]
const ORDER_TAGS = ['urgente', 'atacadista', 'vip', 'novo cliente', 'problemático']
const TAG_COLORS: Record<string, string> = {
  urgente: '#ef4444', atacadista: '#3b82f6', vip: '#f59e0b', 'novo cliente': '#A965ED', 'problemático': '#A965ED',
}
const AÇÃO_LABEL: Record<string, string> = {
  tags: 'Tags alteradas', notas: 'Notas alteradas', update: 'Pedido editado', bulk_status: 'Status alterado em lote',
}

type Order = {
  id: string; order_num: string; status: string; total_usd: number; total_brl: number
  created_at: string; notas: string | null; comprovante_url: string | null; tags: string[] | null
  entrega_tipo?: 'retirada' | 'entrega_foz' | 'retirada_cde' | 'retirada_foz' | 'envio_brasil' | null
  frete_brl?: number | null
  seguro_brl?: number | null
  seguro_recusado?: boolean | null
  entrega_endereco?: string | null
  customers: { nome: string; cpf: string; telefone: string; email: string; endereco: string; numero: string; bairro: string; cidade: string; uf: string; cep: string } | null
  order_items: { product_name: string; product_brand: string; unit_usd: number; quantity: number; subtotal_usd: number; products: { img_url: string | null; categorias: { nome: string } | null } | null }[]
}
type TimelineItem =
  | { tipo: 'status'; status: string; created_at: string }
  | { tipo: 'acao'; action: string; diff: unknown; user_nome: string; created_at: string }

const waLink = (telefone: string, texto: string) => {
  const digits = telefone.replace(/\D/g, '')
  const numero = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--a-border)' }}>
        <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--a-text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</h3>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: 'var(--a-text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</p>
}
function Value({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--a-text)', fontFamily: mono ? 'monospace' : undefined }}>{children}</p>
}

export default function PedidoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [comprovantePopup, setComprovantePopup] = useState(false)

  const load = useCallback(async () => {
    const d = await fetch(`/api/admin/pedidos/${id}`).then(r => r.json()).catch(() => null)
    if (d) {
      setOrder(d.order)
      setTimeline(d.timeline || [])
      setStockMap(d.stockMap || {})
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const patch = async (payload: object) => {
    setUpdating(true)
    await fetch(`/api/admin/pedidos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setUpdating(false)
    await load()
  }

  const updateStatus = (status: string) => patch({ status })
  const toggleTag = (tag: string) => {
    if (!order) return
    const current = order.tags || []
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    setOrder({ ...order, tags: next })
    patch({ tags: next })
  }
  const updateNotas = (notas: string) => patch({ notas })

  if (loading) {
    return <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh', color: 'var(--a-text3)' }}>Carregando...</div>
  }
  if (!order) {
    return (
      <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
        <p style={{ color: 'var(--a-text3)' }}>Pedido não encontrado.</p>
        <Link href="/admin/pedidos" style={{ color: '#A965ED' }}>← Voltar pra lista</Link>
      </div>
    )
  }

  const t = order.entrega_tipo
  const envio = t === 'envio_brasil'
  const foz = t === 'retirada_foz' || t === 'entrega_foz'
  const rotuloEntrega = envio ? '📦 Envio para o Brasil' : foz ? '🚚 Retirada em Foz do Iguaçu' : '🏬 Retirada em Ciudad del Este'
  const semSeguro = envio && order.seguro_recusado === true
  const nomeCliente = order.customers?.nome || 'cliente'
  const st = STATUSES.find(s => s.value === order.status)
  const frete = Number(order.frete_brl || 0)
  const seguro = Number(order.seguro_brl || 0)

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 900px) {
          .pedido-page { padding: 16px !important; }
          .pedido-grid3, .pedido-grid2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="pedido-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Link href="/admin/pedidos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--a-text3)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            Pedidos
          </Link>
          <span style={{ color: 'var(--a-border2)', fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--a-text)', fontWeight: 700 }}>{order.order_num}</span>
        </div>

        {/* Header card */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--a-text)' }}>Pedido {order.order_num}</h1>
            <span style={{ fontSize: 12, color: 'var(--a-text2)', background: 'var(--a-border)', padding: '3px 10px', borderRadius: 6 }}>
              {new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {st && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: `${st.color}18`, color: st.color }}>
                {updating ? 'Salvando...' : st.label}
              </span>
            )}
            {(order.tags || []).map(tag => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${TAG_COLORS[tag] || '#888'}18`, color: TAG_COLORS[tag] || '#888' }}>
                {tag}
              </span>
            ))}
            {semSeguro && (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                ⚠ SEM SEGURO
              </span>
            )}
            <span style={{ fontSize: 13, color: 'var(--a-text2)', marginLeft: 'auto' }}>
              Total: <strong style={{ color: 'var(--a-text)' }}>{fmt(order.total_brl)}</strong>
            </span>
          </div>

          {/* Ações: mudar status */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--a-border)' }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => updateStatus(s.value)} disabled={updating}
                style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${order.status === s.value ? s.color : 'var(--a-border)'}`, background: order.status === s.value ? `${s.color}15` : 'transparent', color: order.status === s.value ? s.color : 'var(--a-text3)', cursor: updating ? 'wait' : 'pointer', transition: 'all 0.15s' }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* WhatsApp contextual — só a mensagem relevante pro status atual */}
          {order.customers?.telefone && (order.status === 'pago' || order.status === 'pronto_retirada') && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {order.status === 'pago' && (
                <a target="_blank" rel="noopener noreferrer"
                  href={waLink(order.customers.telefone, `Oi ${nomeCliente}! Recebemos seu pagamento do pedido ${order.order_num}. Já estamos preparando 🙂`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#25d366', textDecoration: 'none' }}>
                  ✓ Confirmar pagamento
                </a>
              )}
              {order.status === 'pronto_retirada' && (
                <a target="_blank" rel="noopener noreferrer"
                  href={waLink(order.customers.telefone, `Oi ${nomeCliente}! Seu pedido ${order.order_num} está pronto pra retirada. Qualquer dúvida é só chamar!`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#25d366', textDecoration: 'none' }}>
                  ✓ Avisar pronto p/ retirada
                </a>
              )}
            </div>
          )}
        </div>

        {/* 3 colunas: Cliente / Recebimento / Pagamento */}
        <div className="pedido-grid3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Card title="Cliente">
            <Label>Nome</Label>
            <Value>{order.customers?.nome || '—'}</Value>
            {order.customers?.cpf && (<><Label>CPF</Label><Value mono>{order.customers.cpf}</Value></>)}
            {order.customers?.telefone && (
              <>
                <Label>WhatsApp</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--a-text)', fontFamily: 'monospace' }}>{order.customers.telefone}</span>
                  <a href={waLink(order.customers.telefone, '')} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', background: '#25d366', color: '#fff', width: 20, height: 20, borderRadius: 5, justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                  </a>
                </div>
              </>
            )}
            {order.customers?.email && (<><Label>E-mail</Label><Value>{order.customers.email}</Value></>)}
            <Label>Endereço</Label>
            <Value>
              {[order.customers?.endereco, order.customers?.numero].filter(Boolean).join(', ') + (order.customers?.bairro ? ` — ${order.customers.bairro}` : '')
                || (envio ? '— (ver endereço de entrega ao lado →)' : '— (retirada, sem endereço)')}
            </Value>
            {order.customers?.cidade && (<><Label>Cidade</Label><Value>{order.customers.cidade}/{order.customers.uf}{order.customers.cep ? ` — CEP ${order.customers.cep}` : ''}</Value></>)}
          </Card>

          <Card title="Recebimento">
            <Label>Modalidade</Label>
            <Value>{rotuloEntrega}</Value>
            {envio && order.entrega_endereco && (
              <>
                <Label>Endereço de entrega</Label>
                <Value>{order.entrega_endereco}</Value>
              </>
            )}
            {semSeguro && (
              <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: '4px 0 0' }}>
                ⚠ Cliente recusou o seguro — sem reposição em caso de extravio
              </p>
            )}
          </Card>

          <Card title="Pagamento">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚡</div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--a-text)' }}>PIX</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: order.comprovante_url ? '#A965ED' : 'var(--a-text3)', fontWeight: 700 }}>
                  {order.comprovante_url ? '✓ Comprovante recebido' : 'Aguardando comprovante'}
                </p>
              </div>
            </div>
            <Label>Total</Label>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--a-text)' }}>{fmt(order.total_brl)}</p>
          </Card>
        </div>

        {/* 2 colunas: Produtos+Resumo | sidebar de admin */}
        <div className="pedido-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>
          <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden', height: 'fit-content' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--a-border)' }}>
              <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--a-text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Produtos</h3>
            </div>
            {(() => {
              const itens = order.order_items || []
              const grupos = itens.reduce((acc, item) => {
                const cat = item.products?.categorias?.nome || 'Outros'
                ;(acc[cat] ||= []).push(item)
                return acc
              }, {} as Record<string, typeof itens>)
              const categorias = Object.keys(grupos).sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b))
              const mostrarGrupos = categorias.length > 1 || WILSON_ORDER_IDS.has(order.id)
              return categorias.map(cat => (
                <div key={cat}>
                  {mostrarGrupos && (
                    <p style={{ margin: 0, padding: '8px 16px 4px', fontSize: 10, fontWeight: 800, color: '#A965ED', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--a-bg)' }}>{cat}</p>
                  )}
                  {grupos[cat].map((item, i) => {
                    const estoque = stockMap[item.product_name]
                    const estoqueColor = estoque === undefined ? '#555' : estoque === null ? '#A965ED' : estoque === 0 ? '#ef4444' : estoque <= 5 ? '#f59e0b' : '#A965ED'
                    const estoqueLabel = estoque === undefined ? '' : estoque === null ? '∞' : `${estoque} un.`
                    const img = item.products?.img_url
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--a-bg)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 7, overflow: 'hidden', background: 'var(--a-bg)', border: '1px solid var(--a-border)', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
                          ) : (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--a-text3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--a-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                            {item.product_brand && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 4, padding: '1px 6px' }}>{item.product_brand.toUpperCase()}</span>
                            )}
                            {estoqueLabel && <span style={{ fontSize: 9, fontWeight: 700, color: estoqueColor }}>{estoqueLabel} em estoque</span>}
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--a-text3)' }}>{item.quantity}x · USD {item.unit_usd.toFixed(2)}/un</p>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#A965ED', flexShrink: 0 }}>USD {item.subtotal_usd.toFixed(2)}</p>
                      </div>
                    )
                  })}
                </div>
              ))
            })()}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--a-border)', background: 'var(--a-bg)' }}>
              {frete > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--a-text2)', marginBottom: 6 }}>
                  <span>Frete</span><span>{fmt(frete)}</span>
                </div>
              )}
              {seguro > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--a-text2)', marginBottom: 6 }}>
                  <span>Seguro</span><span>{fmt(seguro)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--a-border)', marginTop: 4, fontWeight: 900 }}>
                <span style={{ fontSize: 13, color: 'var(--a-text)' }}>Total</span>
                <span style={{ color: '#A965ED' }}>{fmt(order.total_brl)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card title="Comprovante">
              {order.comprovante_url ? (
                <>
                  <button onClick={() => setComprovantePopup(true)}
                    style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--a-border)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: 'none' }}>
                    {order.comprovante_url.match(/\.pdf$/i) ? (
                      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--a-text3)' }}>
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Ver PDF</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={order.comprovante_url} alt="Comprovante" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                    )}
                  </button>
                  <a href={order.comprovante_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#A965ED', textAlign: 'center', textDecoration: 'none' }}>
                    Abrir em nova aba ↗
                  </a>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--a-text3)' }}>Nenhum comprovante enviado ainda.</p>
              )}
            </Card>

            <Card title="Tags">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ORDER_TAGS.map(tag => {
                  const active = (order.tags || []).includes(tag)
                  const c = TAG_COLORS[tag] || '#888'
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${active ? c : 'var(--a-border)'}`, background: active ? `${c}18` : 'transparent', color: active ? c : 'var(--a-text3)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {active ? '✓ ' : ''}{tag}
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card title="Notas Internas">
              <textarea
                defaultValue={order.notas || ''}
                onBlur={e => updateNotas(e.target.value)}
                rows={3}
                placeholder="Observações internas..."
                style={{ width: '100%', padding: '9px 11px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 7, color: 'var(--a-text2)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' as const }} />
            </Card>

            {timeline.length > 0 && (
              <Card title="Histórico">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {timeline.map((h, i) => {
                    const color = h.tipo === 'status' ? (STATUSES.find(s => s.value === h.status)?.color || '#888') : '#A965ED'
                    const label = h.tipo === 'status' ? (STATUSES.find(s => s.value === h.status)?.label || h.status) : (AÇÃO_LABEL[h.action] || h.action)
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < timeline.length - 1 ? '1px solid var(--a-bg)' : 'none' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                          <div style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 2 }}>
                            {h.tipo === 'acao' && h.user_nome ? `${h.user_nome} · ` : ''}
                            {new Date(h.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Popup do comprovante */}
      {comprovantePopup && order.comprovante_url && (
        <div onClick={() => setComprovantePopup(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setComprovantePopup(false)}
              style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>
              ×
            </button>
            {order.comprovante_url.match(/\.pdf$/i) ? (
              <iframe src={order.comprovante_url} style={{ width: '80vw', height: '80vh', border: 'none' }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.comprovante_url} alt="Comprovante" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
