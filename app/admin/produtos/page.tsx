'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Product = { id: string; name: string; brand: string; usd_price: number; img_url: string; ativo: boolean; sort_order: number; estoque: number | null }

const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([])
  const [brlRate, setBrlRate] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const [editingPrice, setEditingPrice] = useState<{ id: string; price: string } | null>(null)
  const [editingEstoque, setEditingEstoque] = useState<{ id: string; val: string } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [brandDropOpen, setBrandDropOpen] = useState(false)
  const brandRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/produtos-list?perPage=500').then(r => r.json()).then(data => {
      setProducts(data.rows || data || [])
      setLoading(false)
    })
    fetch('/api/config/loja').then(r => r.json()).then(d => setBrlRate(d.brl_rate || 0)).catch(() => {})
  }, [])

  const patch = async (id: string, payload: object) => {
    setSaving(id)
    await fetch(`/api/admin/produtos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(null)
  }

  const toggleAtivo = async (p: Product) => {
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x))
    await patch(p.id, { ativo: !p.ativo })
  }

  const savePrice = async (id: string) => {
    if (!editingPrice || editingPrice.id !== id) return
    const price = parseFloat(editingPrice.price.replace(',', '.'))
    if (isNaN(price) || price <= 0) return
    setProducts(prev => prev.map(x => x.id === id ? { ...x, usd_price: price } : x))
    setEditingPrice(null)
    await patch(id, { usd_price: price })
  }

  const saveEstoque = async (id: string) => {
    if (!editingEstoque || editingEstoque.id !== id) return
    const val = editingEstoque.val === '' ? null : parseInt(editingEstoque.val)
    setProducts(prev => prev.map(x => x.id === id ? { ...x, estoque: val } : x))
    setEditingEstoque(null)
    await patch(id, { estoque: val })
  }

  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setBrandDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = products.filter(p => {
    if (search) {
      const s = search.toLowerCase()
      if (!p.name?.toLowerCase().includes(s) && !p.brand?.toLowerCase().includes(s)) return false
    }
    if (filterBrand && filterBrand !== 'Todos') {
      if (p.brand !== filterBrand) return false
    }
    if (filterStatus === 'ativos' && !p.ativo) return false
    if (filterStatus === 'inativos' && p.ativo) return false
    return true
  })

  const ativos = products.filter(p => p.ativo).length

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Produtos</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{ativos} ativos de {products.length}</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto ou marca..."
          style={{ padding: '9px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, width: 260, outline: 'none' }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, padding: 3 }}>
          {(['todos', 'ativos', 'inativos'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: '5px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: filterStatus === s ? (s === 'ativos' ? 'rgba(169, 101, 237,0.15)' : s === 'inativos' ? 'rgba(239,68,68,0.12)' : 'var(--a-bg)') : 'transparent', color: filterStatus === s ? (s === 'ativos' ? '#A965ED' : s === 'inativos' ? '#ef4444' : 'var(--a-text)') : 'var(--a-text3)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Brand dropdown */}
        <div ref={brandRef} style={{ position: 'relative' }}>
          <button onClick={() => setBrandDropOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1px solid ${filterBrand ? '#f59e0b' : 'var(--a-border)'}`, background: filterBrand ? 'rgba(245,158,11,0.08)' : 'var(--a-surface)', color: filterBrand ? '#f59e0b' : 'var(--a-text2)', cursor: 'pointer', minWidth: 160, justifyContent: 'space-between' }}>
            <span>{filterBrand || 'Todas as marcas'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: brandDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {brandDropOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 220, maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
              <button onClick={() => { setFilterBrand(''); setBrandDropOpen(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, fontWeight: filterBrand === '' ? 700 : 400, background: filterBrand === '' ? 'rgba(169, 101, 237,0.07)' : 'transparent', color: filterBrand === '' ? '#A965ED' : 'var(--a-text)', border: 'none', cursor: 'pointer' }}>
                Todas as marcas
              </button>
              <div style={{ height: 1, background: 'var(--a-border)', margin: '4px 0' }} />
              {brands.map(b => (
                <button key={b} onClick={() => { setFilterBrand(b); setBrandDropOpen(false) }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, fontWeight: filterBrand === b ? 700 : 400, background: filterBrand === b ? 'rgba(245,158,11,0.08)' : 'transparent', color: filterBrand === b ? '#f59e0b' : 'var(--a-text2)', border: 'none', cursor: 'pointer' }}>
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear brand */}
        {filterBrand && (
          <button onClick={() => setFilterBrand('')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text3)', cursor: 'pointer' }}>
            × Limpar
          </button>
        )}

        <span style={{ fontSize: 12, color: 'var(--a-text3)', marginLeft: 'auto' }}>
          {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Produto', 'Marca', 'Preço (USD / BRL)', 'Estoque', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <div style={{ height: 64, background: i % 2 === 0 ? 'var(--a-surface)' : 'var(--a-bg)', margin: 0 }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum produto encontrado</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--a-border)', opacity: p.ativo ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                {/* Thumbnail + Nome */}
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', background: 'var(--a-bg)', border: '1px solid var(--a-border)', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.img_url ? (
                        <Image src={p.img_url} alt={p.name} fill style={{ objectFit: 'contain', padding: 4 }} unoptimized
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--a-text3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--a-text)', margin: 0, lineHeight: 1.4, maxWidth: 260, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.name}</p>
                  </div>
                </td>

                {/* Marca */}
                <td style={{ padding: '10px 16px' }}>
                  {p.brand && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(245,158,11,0.2)', whiteSpace: 'nowrap' }}>
                      {p.brand.toUpperCase()}
                    </span>
                  )}
                </td>

                {/* Preço */}
                <td style={{ padding: '10px 16px', minWidth: 140 }}>
                  {editingPrice?.id === p.id ? (
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <input
                        value={editingPrice.price}
                        onChange={e => setEditingPrice({ id: p.id, price: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') savePrice(p.id); if (e.key === 'Escape') setEditingPrice(null) }}
                        autoFocus
                        style={{ width: 90, padding: '5px 8px', background: 'var(--a-bg)', border: '1px solid rgba(169, 101, 237,0.4)', borderRadius: 6, color: '#A965ED', fontSize: 13, fontWeight: 700, outline: 'none' }}
                      />
                      <button onClick={() => savePrice(p.id)} style={{ padding: '4px 8px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingPrice(null)} style={{ padding: '4px 7px', background: 'var(--a-border)', color: 'var(--a-text2)', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>×</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingPrice({ id: p.id, price: p.usd_price.toString() })}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#A965ED' }}>USD {p.usd_price.toFixed(2)}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--a-text3)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </span>
                      {brlRate > 0 && <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{fmtBRL(p.usd_price * brlRate)}</span>}
                    </button>
                  )}
                </td>

                {/* Estoque */}
                <td style={{ padding: '10px 16px', minWidth: 130 }}>
                  {editingEstoque?.id === p.id ? (
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <input
                        type="number" min="0"
                        value={editingEstoque.val}
                        onChange={e => setEditingEstoque({ id: p.id, val: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') saveEstoque(p.id); if (e.key === 'Escape') setEditingEstoque(null) }}
                        autoFocus placeholder="∞"
                        style={{ width: 80, padding: '5px 8px', background: 'var(--a-bg)', border: '1px solid rgba(169, 101, 237,0.4)', borderRadius: 6, color: '#A965ED', fontSize: 13, outline: 'none' }}
                      />
                      <button onClick={() => saveEstoque(p.id)} style={{ padding: '4px 8px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingEstoque(null)} style={{ padding: '4px 7px', background: 'var(--a-border)', color: 'var(--a-text2)', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>×</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingEstoque({ id: p.id, val: p.estoque?.toString() ?? '' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <span style={{ fontSize: 12, color: p.estoque === 0 ? '#ef4444' : p.estoque !== null ? '#f59e0b' : 'var(--a-text3)', fontWeight: p.estoque !== null ? 700 : 400 }}>
                        {p.estoque === null ? '∞ ilimitado' : p.estoque === 0 ? 'Sem estoque' : `${p.estoque} un.`}
                      </span>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--a-text3)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                </td>

                {/* Toggle */}
                <td style={{ padding: '10px 16px' }}>
                  <button onClick={() => toggleAtivo(p)} disabled={saving === p.id}
                    style={{ padding: '5px 12px', fontSize: 10, fontWeight: 700, borderRadius: 5, border: `1px solid ${p.ativo ? 'rgba(169, 101, 237,0.4)' : 'rgba(239,68,68,0.4)'}`, background: p.ativo ? 'rgba(169, 101, 237,0.1)' : 'rgba(239,68,68,0.1)', color: p.ativo ? '#A965ED' : '#ef4444', cursor: saving === p.id ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                    {saving === p.id ? '...' : p.ativo ? 'ATIVO' : 'INATIVO'}
                  </button>
                </td>

                {/* Actions */}
                <td style={{ padding: '10px 16px' }}>
                  <Link href={`/admin/produtos/${p.id}`}
                    style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text2)', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
