'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

type ManualItem = { id: string; name: string; brand: string; usd: number; quantity: number }
type Product = { id: string; name: string; brand: string; usd_price: number }

const STATUSES = [
  { value: 'pendente_pagamento', label: 'Pendente PIX', color: '#f59e0b' },
  { value: 'pago', label: 'Pago', color: '#3b82f6' },
  { value: 'pronto_retirada', label: 'Pronto p/ Retirada', color: '#A965ED' },
  { value: 'retirado', label: 'Retirado', color: '#555' },
  { value: 'cancelado', label: 'Cancelado', color: '#ef4444' },
]
const GRUPOS: Record<string, string[]> = {
  ativos: ['pendente_pagamento', 'pago', 'pronto_retirada'],
  concluidos: ['retirado'],
  inativos: ['cancelado'],
}

type Order = {
  id: string; order_num: string; status: string; total_usd: number; total_brl: number
  created_at: string; notas: string | null; comprovante_url: string | null; tags: string[] | null
  entrega_tipo?: 'retirada' | 'entrega_foz' | 'retirada_cde' | 'retirada_foz' | 'envio_brasil' | null
  utm_source?: string | null; utm_campaign?: string | null
  customers: { nome: string; cpf: string; telefone: string; email: string } | null
  order_items: { product_name: string; product_brand: string; unit_usd: number; quantity: number; subtotal_usd: number }[]
}

const TAG_COLORS: Record<string, string> = {
  urgente: '#ef4444', atacadista: '#3b82f6', vip: '#f59e0b', 'novo cliente': '#A965ED', 'problemático': '#A965ED',
}

const sc = (s: string) => STATUSES.find(x => x.value === s)?.color || '#888'
const sl = (s: string) => STATUSES.find(x => x.value === s)?.label || s

function OrigemCell({ o }: { o: Order }) {
  if (!o.utm_source && !o.utm_campaign) return <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>—</span>
  return (
    <span style={{ fontSize: 11, color: 'var(--a-text2)' }} title={[o.utm_source, o.utm_campaign].filter(Boolean).join(' · ')}>
      {o.utm_source}{o.utm_source && o.utm_campaign ? ' · ' : ''}{o.utm_campaign}
    </span>
  )
}

export default function Pedidos() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [grupo, setGrupo] = useState<'ativos' | 'concluidos' | 'inativos' | 'todos'>('ativos')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [statusAlvo, setStatusAlvo] = useState('')
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [modalManual, setModalManual] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [manualCustomer, setManualCustomer] = useState({ nome: '', cpf: '', telefone: '', email: '', cidade: '', endereco: '' })
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSuccess, setManualSuccess] = useState('')

  const POR_PAGINA = 50

  const load = useCallback(async () => {
    setLoading(true)
    const url = new URL('/api/admin/pedidos-list', window.location.origin)
    url.searchParams.set('perPage', '500')
    const r = await fetch(url)
    const data = await r.json()
    setOrders(Array.isArray(data) ? data : (data.rows || []))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPagina(1); setSelecionados(new Set()) }, [grupo, search])

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
      const data = await fetch('/api/admin/produtos-list?perPage=5000').then(r => r.json()).catch(() => ({ rows: [] }))
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

  const toggleSelecionado = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const alterarStatusEmMassa = async () => {
    if (selecionados.size === 0 || !statusAlvo) return
    setAlterandoStatus(true)
    try {
      const res = await fetch('/api/admin/pedidos/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selecionados), status: statusAlvo }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => selecionados.has(o.id) ? { ...o, status: statusAlvo } : o))
        setSelecionados(new Set())
        setStatusAlvo('')
      }
    } finally {
      setAlterandoStatus(false)
    }
  }

  const filtered = orders.filter(o => {
    if (grupo !== 'todos' && !GRUPOS[grupo]?.includes(o.status)) return false
    if (search) {
      const s = search.toLowerCase()
      return o.order_num.toLowerCase().includes(s) || (o.customers?.nome || '').toLowerCase().includes(s) || (o.customers?.telefone || '').includes(s)
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA))
  const paginados = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const countGrupo = (g: string) => g === 'todos' ? orders.length : orders.filter(o => GRUPOS[g]?.includes(o.status)).length
  const valorTotalFiltro = filtered.reduce((s, o) => s + o.total_brl, 0)

  return (
    <div className="pedidos-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .pedidos-page { padding: 16px !important; }
          .pedidos-actions { width: 100%; }
          .pedidos-search { flex: 1 1 auto !important; width: auto !important; }
          .pedidos-table-wrap { display: none !important; }
          .pedidos-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Pedidos</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} · {fmt(valorTotalFiltro)} no total
          </p>
        </div>
        <div className="pedidos-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="pedidos-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido, cliente..."
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

      {/* Abas de grupo — scroll horizontal contido só nesta faixa (não na página) */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--a-border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as const }}>
        {([
          { v: 'ativos', label: 'Ativos' },
          { v: 'concluidos', label: 'Concluídos' },
          { v: 'inativos', label: 'Cancelados' },
          { v: 'todos', label: 'Todos' },
        ] as const).map(f => (
          <button key={f.v} onClick={() => setGrupo(f.v)}
            style={{ padding: '9px 4px', marginRight: 20, fontSize: 13, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', color: grupo === f.v ? '#A965ED' : 'var(--a-text3)', borderBottom: grupo === f.v ? '2px solid #A965ED' : '2px solid transparent', marginBottom: -1, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {f.label} <span style={{ color: 'var(--a-text3)', fontWeight: 600 }}>({countGrupo(f.v)})</span>
          </button>
        ))}
      </div>

      {/* Barra de ação em massa */}
      {selecionados.size > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: 'rgba(169, 101, 237,0.08)', border: '1px solid rgba(169, 101, 237,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#A965ED' }}>{selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}</span>
          <select value={statusAlvo} onChange={e => setStatusAlvo(e.target.value)} disabled={alterandoStatus}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 7, border: '1px solid var(--a-border)', background: 'var(--a-bg)', color: 'var(--a-text)', cursor: 'pointer', outline: 'none' }}>
            <option value="">Mudar status…</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {statusAlvo && (
            <button onClick={alterarStatusEmMassa} disabled={alterandoStatus}
              style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 7, background: '#A965ED', color: '#000', border: 'none', cursor: 'pointer', opacity: alterandoStatus ? 0.6 : 1 }}>
              {alterandoStatus ? '...' : `Aplicar (${selecionados.size})`}
            </button>
          )}
          <button onClick={() => { setSelecionados(new Set()); setStatusAlvo('') }} style={{ fontSize: 12, color: 'var(--a-text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Limpar seleção
          </button>
        </div>
      )}

      {/* Table — desktop; no mobile vira cards empilhados abaixo (8 colunas não
          cabem numa tela estreita e forçavam scroll lateral) */}
      <div className="pedidos-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              <th style={{ padding: '11px 12px', width: 30 }}>
                <div onClick={() => setSelecionados(prev => paginados.length > 0 && paginados.every(p => prev.has(p.id)) ? new Set() : new Set(paginados.map(p => p.id)))}
                  style={{ width: 15, height: 15, border: `2px solid ${paginados.length > 0 && paginados.every(p => selecionados.has(p.id)) ? '#A965ED' : 'var(--a-border)'}`, borderRadius: 4, background: paginados.length > 0 && paginados.every(p => selecionados.has(p.id)) ? '#A965ED' : 'transparent', cursor: 'pointer' }} />
              </th>
              {['Pedido', 'Cliente', 'Telefone', 'Origem', 'Total', 'Status', 'Data', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : paginados.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum pedido encontrado</td></tr>
            ) : paginados.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--a-surface)', cursor: 'pointer', background: selecionados.has(o.id) ? 'rgba(169, 101, 237,0.05)' : 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!selecionados.has(o.id)) e.currentTarget.style.background = 'var(--a-border)' }}
                onMouseLeave={e => { if (!selecionados.has(o.id)) e.currentTarget.style.background = 'transparent' }}
                onClick={() => router.push(`/admin/pedidos/${o.id}`)}>
                <td style={{ padding: '12px' }} onClick={e => toggleSelecionado(o.id, e)}>
                  <div style={{ width: 15, height: 15, border: `2px solid ${selecionados.has(o.id) ? '#A965ED' : 'var(--a-border)'}`, borderRadius: 4, background: selecionados.has(o.id) ? '#A965ED' : 'transparent', cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: '#A965ED', fontWeight: 700 }}>{o.order_num}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text)' }}>{o.customers?.nome || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text2)' }}>{o.customers?.telefone || '—'}</td>
                <td style={{ padding: '12px 18px' }}><OrigemCell o={o} /></td>
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

      {/* Cards mobile — faixa de status no topo, dados essenciais, total no rodapé */}
      <div className="pedidos-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : paginados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum pedido encontrado</div>
        ) : paginados.map(o => (
          <div key={o.id} onClick={() => router.push(`/admin/pedidos/${o.id}`)}
            style={{ cursor: 'pointer', borderBottom: '1px solid var(--a-border)', background: selecionados.has(o.id) ? 'rgba(169, 101, 237,0.06)' : 'transparent' }}>
            <div style={{ height: 4, background: sc(o.status) }} />
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div onClick={e => toggleSelecionado(o.id, e)}
                    style={{ width: 15, height: 15, border: `2px solid ${selecionados.has(o.id) ? '#A965ED' : 'var(--a-border)'}`, borderRadius: 4, background: selecionados.has(o.id) ? '#A965ED' : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#A965ED' }}>{o.order_num}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--a-text3)', flexShrink: 0 }}>
                  {new Date(o.created_at).toLocaleDateString('pt-BR')} {new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p style={{ margin: '10px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--a-text)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                {o.customers?.nome || '—'}
              </p>
              {o.customers?.telefone && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--a-text3)' }}>{o.customers.telefone}</p>}

              <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: sc(o.status), background: `${sc(o.status)}15`, padding: '3px 8px', borderRadius: 4, border: `1px solid ${sc(o.status)}30`, whiteSpace: 'nowrap' as const }}>
                  {sl(o.status)}
                </span>
                {(o.tags || []).map(tag => (
                  <span key={tag} style={{ fontSize: 9, fontWeight: 700, color: TAG_COLORS[tag] || '#888', background: `${TAG_COLORS[tag] || '#888'}15`, padding: '2px 6px', borderRadius: 99, border: `1px solid ${TAG_COLORS[tag] || '#888'}30` }}>
                    {tag}
                  </span>
                ))}
              </div>

              {(o.utm_source || o.utm_campaign) && (
                <div style={{ marginTop: 8 }}><OrigemCell o={o} /></div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--a-border)' }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--a-text)' }}>{fmt(o.total_brl)}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--a-text3)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            style={{ border: '1px solid var(--a-border)', background: pagina === 1 ? 'var(--a-bg)' : 'var(--a-surface)', color: pagina === 1 ? 'var(--a-text3)' : 'var(--a-text)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: pagina === 1 ? 'default' : 'pointer' }}>
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: 'var(--a-text2)' }}>
            Página <strong style={{ color: 'var(--a-text)' }}>{pagina}</strong> de <strong style={{ color: 'var(--a-text)' }}>{totalPaginas}</strong>
          </span>
          <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
            style={{ border: '1px solid var(--a-border)', background: pagina === totalPaginas ? 'var(--a-bg)' : 'var(--a-surface)', color: pagina === totalPaginas ? 'var(--a-text3)' : 'var(--a-text)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: pagina === totalPaginas ? 'default' : 'pointer' }}>
            Próxima →
          </button>
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
