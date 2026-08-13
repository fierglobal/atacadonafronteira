'use client'
import { useState, useEffect, useCallback } from 'react'

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

type ManualItem = { id: string; name: string; brand: string; usd: number; quantity: number }
type Product = { id: string; name: string; brand: string; usd_price: number }

const STATUSES = [
  { value: '', label: 'Todos' },
  { value: 'pendente_pagamento', label: 'Pendente PIX', color: '#f59e0b' },
  { value: 'pago', label: 'Pago', color: '#3b82f6' },
  { value: 'pronto_retirada', label: 'Pronto p/ Retirada', color: '#A965ED' },
  { value: 'retirado', label: 'Retirado', color: '#555' },
  { value: 'cancelado', label: 'Cancelado', color: '#ef4444' },
]

type Order = {
  id: string; order_num: string; status: string; total_usd: number; total_brl: number
  created_at: string; notas: string | null; comprovante_url: string | null; tags: string[] | null
  entrega_tipo?: 'retirada' | 'entrega_foz' | null
  entrega_endereco?: string | null
  customers: { nome: string; cpf: string; telefone: string; email: string; endereco: string; numero: string; bairro: string; cidade: string; uf: string; cep: string } | null
  order_items: { product_name: string; product_brand: string; unit_usd: number; quantity: number; subtotal_usd: number }[]
}

const ORDER_TAGS = ['urgente', 'atacadista', 'vip', 'novo cliente', 'problemático']
const TAG_COLORS: Record<string, string> = {
  urgente: '#ef4444', atacadista: '#3b82f6', vip: '#f59e0b', 'novo cliente': '#A965ED', 'problemático': '#A965ED',
}

export default function Pedidos() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [history, setHistory] = useState<{ status: string; created_at: string }[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [modalManual, setModalManual] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [manualCustomer, setManualCustomer] = useState({ nome: '', cpf: '', telefone: '', email: '', cidade: '', endereco: '' })
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSuccess, setManualSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const url = new URL('/api/admin/pedidos-list', window.location.origin)
    url.searchParams.set('perPage', '200')
    const r = await fetch(url)
    const data = await r.json()
    setOrders(Array.isArray(data) ? data : (data.rows || []))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selectOrder = async (o: Order) => {
    setSelected(o)
    setHistory([])
    setStockMap({})
    const { history: h, stockMap: sm } = await fetch(`/api/admin/pedidos/${o.id}`).then(r => r.json()).catch(() => ({ history: [], stockMap: {} }))
    setHistory(h || [])
    setStockMap(sm || {})
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true)
    await fetch(`/api/admin/pedidos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(false)
    setSelected(prev => prev ? { ...prev, status } : null)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    setHistory(prev => [{ status, created_at: new Date().toISOString() }, ...prev])
  }

  const toggleTag = async (id: string, tag: string, current: string[]) => {
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    setSelected(prev => prev ? { ...prev, tags: next } : null)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, tags: next } : o))
    await fetch(`/api/admin/pedidos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    })
  }

  const updateNotas = async (id: string, notas: string) => {
    await fetch(`/api/admin/pedidos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas }),
    })
  }

  const exportCSV = () => {
    const rows = [['Pedido', 'Cliente', 'CPF', 'Telefone', 'Total BRL', 'Status', 'Data']]
    filtered.forEach(o => rows.push([
      o.order_num,
      o.customers?.nome || '',
      o.customers?.cpf || '',
      o.customers?.telefone || '',
      o.total_brl.toFixed(2),
      o.status,
      new Date(o.created_at).toLocaleDateString('pt-BR'),
    ]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const openModalManual = async () => {
    setModalManual(true)
    setManualSuccess('')
    if (allProducts.length === 0) {
      const data = await fetch('/api/admin/produtos-list?perPage=500').then(r => r.json()).catch(() => ({ rows: [] }))
      const list = Array.isArray(data) ? data : (data.rows || [])
      setAllProducts(list.filter((p: Product) => p.usd_price > 0))
    }
  }

  const addManualItem = (p: Product) => {
    setManualItems(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: p.id, name: p.name, brand: p.brand, usd: p.usd_price, quantity: 1 }]
    })
  }

  const submitManual = async () => {
    if (!manualCustomer.nome || manualItems.length === 0) return
    setManualSaving(true)
    const res = await fetch('/api/admin/pedidos-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: manualCustomer, itens: manualItems }),
    })
    const d = await res.json()
    if (d.ok) {
      setManualSuccess(d.orderNum)
      setManualCustomer({ nome: '', cpf: '', telefone: '', email: '', cidade: '', endereco: '' })
      setManualItems([])
      load()
    }
    setManualSaving(false)
  }

  const filtered = orders.filter(o => {
    if (filter && o.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return o.order_num.toLowerCase().includes(s) || (o.customers?.nome || '').toLowerCase().includes(s) || (o.customers?.telefone || '').includes(s)
    }
    return true
  })

  const sc = (s: string) => STATUSES.find(x => x.value === s)?.color || '#888'
  const sl = (s: string) => STATUSES.find(x => x.value === s)?.label || s

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Pedidos</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{orders.length} pedidos</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido, cliente..."
            style={{ padding: '9px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, width: 220, outline: 'none' }} />
          <button onClick={exportCSV}
            style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ↓ CSV
          </button>
          <button onClick={openModalManual}
            style={{ padding: '9px 16px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Novo Pedido
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${filter === s.value ? (s.color || '#A965ED') : 'var(--a-border)'}`, background: filter === s.value ? `${s.color || '#A965ED'}15` : 'transparent', color: filter === s.value ? (s.color || '#A965ED') : 'var(--a-text3)', cursor: 'pointer', transition: 'all 0.15s' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Pedido', 'Cliente', 'Telefone', 'Total', 'Status', 'Data', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum pedido encontrado</td></tr>
            ) : filtered.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--a-surface)', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => selectOrder(o)}>
                <td style={{ padding: '12px 18px', fontSize: 12, color: '#A965ED', fontWeight: 700 }}>{o.order_num}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text)' }}>{o.customers?.nome || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text2)' }}>{o.customers?.telefone || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700 }}>{fmt(o.total_brl)}</td>
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: sc(o.status), background: `${sc(o.status)}15`, padding: '3px 8px', borderRadius: 4, border: `1px solid ${sc(o.status)}30`, whiteSpace: 'nowrap', width: 'fit-content' }}>
                      {sl(o.status)}
                    </span>
                    {(o.tags || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(o.tags || []).map(tag => (
                          <span key={tag} style={{ fontSize: 9, fontWeight: 700, color: TAG_COLORS[tag] || '#888', background: `${TAG_COLORS[tag] || '#888'}15`, padding: '2px 6px', borderRadius: 99, border: `1px solid ${TAG_COLORS[tag] || '#888'}30` }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)' }}>{new Date(o.created_at).toLocaleDateString('pt-BR')} {new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: '12px 18px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--a-text3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.1em', marginBottom: 4 }}>PEDIDO</p>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#A965ED', margin: 0 }}>{selected.order_num}</h2>
                <p style={{ fontSize: 12, color: 'var(--a-text3)', marginTop: 4 }}>{new Date(selected.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>STATUS</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUSES.slice(1).map(s => (
                  <button key={s.value} onClick={() => updateStatus(selected.id, s.value)} disabled={updating}
                    style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${selected.status === s.value ? s.color : 'var(--a-border)'}`, background: selected.status === s.value ? `${s.color}15` : 'transparent', color: selected.status === s.value ? s.color : 'var(--a-text3)', cursor: updating ? 'wait' : 'pointer', transition: 'all 0.15s' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>TAGS</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ORDER_TAGS.map(tag => {
                  const active = (selected.tags || []).includes(tag)
                  const c = TAG_COLORS[tag] || '#888'
                  return (
                    <button key={tag} onClick={() => toggleTag(selected.id, tag, selected.tags || [])}
                      style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${active ? c : 'var(--a-border)'}`, background: active ? `${c}18` : 'transparent', color: active ? c : 'var(--a-text3)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {active ? '✓ ' : ''}{tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Forma de recebimento — entrega em Foz precisa saltar aos olhos
                de quem separa o pedido */}
            <div style={{ background: selected.entrega_tipo === 'entrega_foz' ? 'rgba(246,189,12,0.12)' : 'var(--a-border)', border: selected.entrega_tipo === 'entrega_foz' ? '1px solid rgba(246,189,12,0.5)' : 'none', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>RECEBIMENTO</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)', margin: 0 }}>
                {selected.entrega_tipo === 'entrega_foz' ? '🚚 ENTREGA EM FOZ DO IGUAÇU (equipe própria)' : 'Retirada na loja'}
              </p>
              {selected.entrega_tipo === 'entrega_foz' && selected.entrega_endereco && (
                <p style={{ fontSize: 12, color: 'var(--a-text2)', margin: '4px 0 0' }}>{selected.entrega_endereco}</p>
              )}
            </div>

            {/* Cliente */}
            {selected.customers && (
              <div style={{ background: 'var(--a-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>CLIENTE</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Nome', selected.customers.nome],
                    ['CPF', selected.customers.cpf],
                    ['WhatsApp', selected.customers.telefone],
                    ['E-mail', selected.customers.email],
                    ['Endereço', `${selected.customers.endereco}, ${selected.customers.numero} — ${selected.customers.bairro}`],
                    ['Cidade', `${selected.customers.cidade}/${selected.customers.uf} — CEP ${selected.customers.cep}`],
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
              {(selected.order_items || []).map((item, i) => {
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
                <span style={{ color: '#A965ED' }}>{fmt(selected.total_brl)}</span>
              </div>
            </div>

            {/* Comprovante */}
            {selected.comprovante_url && (
              <div>
                <p style={{ fontSize: 10, color: '#A965ED', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>COMPROVANTE DE PAGAMENTO</p>
                <a href={selected.comprovante_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(169, 101, 237,0.06)', border: '1px solid rgba(169, 101, 237,0.2)', borderRadius: 8, color: '#A965ED', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Ver comprovante
                </a>
              </div>
            )}

            {/* Histórico de status */}
            {history.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>HISTÓRICO</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'var(--a-bg)', borderRadius: 6 }}>
                      <span style={{ color: STATUSES.find(s => s.value === h.status)?.color || '#888', fontWeight: 700 }}>
                        {STATUSES.find(s => s.value === h.status)?.label || h.status}
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
                defaultValue={selected.notas || ''}
                onBlur={e => updateNotas(selected.id, e.target.value)}
                rows={3}
                placeholder="Observações internas..."
                style={{ width: '100%', padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text2)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Pedido */}
      {modalManual && (
        <div onClick={() => setModalManual(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Novo Pedido Manual</h2>
              <button onClick={() => setModalManual(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {manualSuccess ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 32, margin: '0 0 12px' }}>✓</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#A965ED', margin: '0 0 8px' }}>Pedido criado!</p>
                <p style={{ fontSize: 14, color: 'var(--a-text2)', margin: '0 0 24px' }}>{manualSuccess}</p>
                <button onClick={() => { setModalManual(false); setManualSuccess('') }} style={{ padding: '10px 24px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Fechar</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Cliente */}
                <div>
                  <p style={{ fontSize: 10, color: '#A965ED', fontWeight: 800, letterSpacing: '0.1em', margin: '0 0 14px' }}>DADOS DO CLIENTE</p>
                  {(['nome', 'cpf', 'telefone', 'email', 'cidade', 'endereco'] as const).map(k => (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: 'var(--a-text2)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>{k.toUpperCase()}</label>
                      <input value={manualCustomer[k]} onChange={e => setManualCustomer(p => ({ ...p, [k]: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 7, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                    </div>
                  ))}
                </div>

                {/* Produtos */}
                <div>
                  <p style={{ fontSize: 10, color: '#A965ED', fontWeight: 800, letterSpacing: '0.1em', margin: '0 0 14px' }}>PRODUTOS</p>
                  <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 14, border: '1px solid var(--a-border)', borderRadius: 8 }}>
                    {allProducts.map(p => (
                      <div key={p.id} onClick={() => addManualItem(p)}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--a-border)', fontSize: 12 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-border)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ color: 'var(--a-text2)', flex: 1 }}>{p.name}</span>
                        <span style={{ color: '#A965ED', fontWeight: 700, whiteSpace: 'nowrap' }}>+  USD {p.usd_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {manualItems.length > 0 && (
                    <div style={{ background: 'var(--a-border)', borderRadius: 8, padding: '10px 12px' }}>
                      {manualItems.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--a-text2)', flex: 1 }}>{item.name}</span>
                          <button onClick={() => setManualItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                            style={{ width: 22, height: 22, background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>−</button>
                          <span style={{ fontSize: 12, color: 'var(--a-text)', minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => setManualItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                            style={{ width: 22, height: 22, background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>+</button>
                          <button onClick={() => setManualItems(prev => prev.filter(i => i.id !== item.id))}
                            style={{ width: 22, height: 22, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</button>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid var(--a-border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: 'var(--a-text2)' }}>Total USD</span>
                        <span style={{ color: '#A965ED' }}>{manualItems.reduce((s, i) => s + i.usd * i.quantity, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!manualSuccess && (
              <button onClick={submitManual} disabled={manualSaving || !manualCustomer.nome || manualItems.length === 0}
                style={{ marginTop: 24, width: '100%', padding: '13px', background: (!manualCustomer.nome || manualItems.length === 0) ? 'var(--a-border)' : '#A965ED', color: (!manualCustomer.nome || manualItems.length === 0) ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: manualSaving ? 'wait' : 'pointer' }}>
                {manualSaving ? 'Criando...' : 'Criar Pedido'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
