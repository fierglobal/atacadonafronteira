'use client'
import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'

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
  order_items: { product_name: string; product_brand: string; unit_usd: number; quantity: number; subtotal_usd: number }[]
}
type TimelineItem =
  | { tipo: 'status'; status: string; created_at: string }
  | { tipo: 'acao'; action: string; diff: unknown; user_nome: string; created_at: string }

const waLink = (telefone: string, texto: string) => {
  const digits = telefone.replace(/\D/g, '')
  const numero = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

export default function PedidoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

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
  const rotuloEntrega = envio ? '📦 ENVIO PARA O BRASIL' : foz ? '🚚 RETIRADA EM FOZ DO IGUAÇU' : '🏬 Retirada em Ciudad del Este'
  const destaque = envio || foz
  const semSeguro = envio && order.seguro_recusado === true
  const nomeCliente = order.customers?.nome || 'cliente'

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <Link href="/admin/pedidos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--a-text3)', textDecoration: 'none', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        Pedidos
      </Link>

      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.1em', marginBottom: 4 }}>PEDIDO</p>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#A965ED', margin: 0 }}>{order.order_num}</h1>
            <p style={{ fontSize: 12, color: 'var(--a-text3)', marginTop: 4 }}>{new Date(order.created_at).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>STATUS</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => updateStatus(s.value)} disabled={updating}
                style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${order.status === s.value ? s.color : 'var(--a-border)'}`, background: order.status === s.value ? `${s.color}15` : 'transparent', color: order.status === s.value ? s.color : 'var(--a-text3)', cursor: updating ? 'wait' : 'pointer', transition: 'all 0.15s' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mensagens rápidas */}
        {order.customers?.telefone && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>MENSAGEM RÁPIDA (WHATSAPP)</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a target="_blank" rel="noopener noreferrer"
                href={waLink(order.customers.telefone, `Oi ${nomeCliente}! Recebemos seu pagamento do pedido ${order.order_num}. Já estamos preparando 🙂`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#25d366', textDecoration: 'none' }}>
                Confirmar pagamento
              </a>
              <a target="_blank" rel="noopener noreferrer"
                href={waLink(order.customers.telefone, `Oi ${nomeCliente}! Seu pedido ${order.order_num} está pronto pra retirada. Qualquer dúvida é só chamar!`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#25d366', textDecoration: 'none' }}>
                Avisar pronto p/ retirada
              </a>
            </div>
          </div>
        )}

        {/* Tags */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>TAGS</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ORDER_TAGS.map(tag => {
              const active = (order.tags || []).includes(tag)
              const c = TAG_COLORS[tag] || '#888'
              return (
                <button key={tag} onClick={() => toggleTag(tag)}
                  style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${active ? c : 'var(--a-border)'}`, background: active ? `${c}18` : 'transparent', color: active ? c : 'var(--a-text3)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {active ? '✓ ' : ''}{tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Recebimento */}
        <div style={{ background: destaque ? 'rgba(246,189,12,0.12)' : 'var(--a-border)', border: destaque ? '1px solid rgba(246,189,12,0.5)' : 'none', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>RECEBIMENTO</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)', margin: 0 }}>{rotuloEntrega}</p>
          {envio && order.entrega_endereco && (
            <p style={{ fontSize: 12, color: 'var(--a-text2)', margin: '4px 0 0' }}>{order.entrega_endereco}</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--a-text2)', margin: '6px 0 0' }}>
            Frete R$ {Number(order.frete_brl || 0).toFixed(2).replace('.', ',')}
            {' · '}
            Seguro R$ {Number(order.seguro_brl || 0).toFixed(2).replace('.', ',')}
          </p>
          {semSeguro && (
            <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: '6px 0 0' }}>
              ⚠ CLIENTE RECUSOU O SEGURO — sem reposição em caso de extravio
            </p>
          )}
        </div>

        {/* Cliente */}
        {order.customers && (
          <div style={{ background: 'var(--a-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>CLIENTE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Nome', order.customers.nome],
                ['CPF', order.customers.cpf],
                ['WhatsApp', order.customers.telefone],
                ['E-mail', order.customers.email],
                ['Endereço', [order.customers.endereco, order.customers.numero].filter(Boolean).join(', ') + (order.customers.bairro ? ` — ${order.customers.bairro}` : '') || '— (retirada, sem endereço)'],
                ['Cidade', order.customers.cidade ? `${order.customers.cidade}/${order.customers.uf}${order.customers.cep ? ` — CEP ${order.customers.cep}` : ''}` : '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p style={{ fontSize: 9, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>{k}</p>
                  <p style={{ fontSize: 12, color: 'var(--a-text)', margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ background: 'var(--a-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>PRODUTOS</p>
          {(order.order_items || []).map((item, i) => {
            const estoque = stockMap[item.product_name]
            const estoqueColor = estoque === undefined ? '#555' : estoque === null ? '#A965ED' : estoque === 0 ? '#ef4444' : estoque <= 5 ? '#f59e0b' : '#A965ED'
            const estoqueLabel = estoque === undefined ? '' : estoque === null ? '∞' : `${estoque} un.`
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: 'var(--a-text2)', flex: 1, marginRight: 12 }}>{item.product_name} × {item.quantity}</span>
                {estoqueLabel && <span style={{ fontSize: 10, fontWeight: 700, color: estoqueColor, marginRight: 10, whiteSpace: 'nowrap' }}>{estoqueLabel}</span>}
                <span style={{ color: '#A965ED', fontWeight: 700 }}>USD {item.subtotal_usd.toFixed(2)}</span>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--a-border)', paddingTop: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
            <span style={{ fontSize: 13 }}>Total</span>
            <span style={{ color: '#A965ED' }}>{fmt(order.total_brl)}</span>
          </div>
        </div>

        {/* Comprovante */}
        {order.comprovante_url && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: '#A965ED', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>COMPROVANTE DE PAGAMENTO</p>
            <a href={order.comprovante_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(169, 101, 237,0.06)', border: '1px solid rgba(169, 101, 237,0.2)', borderRadius: 8, color: '#A965ED', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Ver comprovante
            </a>
          </div>
        )}

        {/* Timeline (histórico de status + ações) */}
        {timeline.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>HISTÓRICO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {timeline.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'var(--a-bg)', borderRadius: 6 }}>
                  <span style={{ color: h.tipo === 'status' ? (STATUSES.find(s => s.value === h.status)?.color || '#888') : 'var(--a-text2)', fontWeight: 700 }}>
                    {h.tipo === 'status' ? (STATUSES.find(s => s.value === h.status)?.label || h.status) : (AÇÃO_LABEL[h.action] || h.action)}
                  </span>
                  <span style={{ color: 'var(--a-text3)' }}>{new Date(h.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        <div>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>NOTAS INTERNAS</p>
          <textarea
            defaultValue={order.notas || ''}
            onBlur={e => updateNotas(e.target.value)}
            rows={3}
            placeholder="Observações internas..."
            style={{ width: '100%', padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text2)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
      </div>
    </div>
  )
}
