'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'

type Product = {
  id: string; name: string; brand: string; img_url: string; ativo: boolean
  estoque: number | null; categoria_id: string | null
}
type Categoria = { id: string; nome: string; parent_id: string | null }

type Draft = { value: string; saving: boolean; saved: boolean; error: string }

export default function Estoque() {
  const [products, setProducts] = useState<Product[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'sem_estoque' | 'baixo' | 'ok' | 'ilimitado'>('todos')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/produtos-list').then(r => r.json()),
      fetch('/api/admin/categorias').then(r => r.json()),
    ]).then(([prods, cats]) => {
      setProducts(Array.isArray(prods) ? prods : [])
      setCategorias(Array.isArray(cats) ? cats : [])
      const init: Record<string, Draft> = {}
      prods.forEach((p: Product) => {
        init[p.id] = { value: p.estoque?.toString() ?? '', saving: false, saved: false, error: '' }
      })
      setDrafts(init)
      setLoading(false)
    })
  }, [])

  const setDraft = (id: string, value: string) =>
    setDrafts(d => ({ ...d, [id]: { ...d[id], value, saved: false, error: '' } }))

  const salvar = async (p: Product) => {
    const draft = drafts[p.id]
    if (!draft) return
    const novoEstoque = draft.value === '' ? null : parseInt(draft.value)
    if (draft.value !== '' && (isNaN(novoEstoque!) || novoEstoque! < 0)) {
      setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], error: 'Valor inválido' } }))
      return
    }
    setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], saving: true, error: '' } }))
    const res = await fetch(`/api/admin/produtos/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estoque: novoEstoque }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, estoque: novoEstoque } : x))
      setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], saving: false, saved: true, error: '' } }))
      setTimeout(() => setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], saved: false } })), 2500)
    } else {
      setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], saving: false, error: 'Erro ao salvar' } }))
    }
  }

  const catMap = Object.fromEntries(categorias.map(c => [c.id, c.nome]))

  const changed = (p: Product) => {
    const d = drafts[p.id]
    if (!d) return false
    const original = p.estoque?.toString() ?? ''
    return d.value !== original
  }

  const filtered = products.filter(p => {
    if (search) {
      const s = search.toLowerCase()
      if (!p.name?.toLowerCase().includes(s) && !p.brand?.toLowerCase().includes(s)) return false
    }
    if (filterCat && p.categoria_id !== filterCat) return false
    if (filterStatus === 'sem_estoque' && p.estoque !== 0) return false
    if (filterStatus === 'baixo' && (p.estoque === null || p.estoque === 0 || p.estoque > 5)) return false
    if (filterStatus === 'ok' && (p.estoque === null || p.estoque <= 5)) return false
    if (filterStatus === 'ilimitado' && p.estoque !== null) return false
    return true
  })

  const semEstoque = products.filter(p => p.estoque === 0).length
  const baixo = products.filter(p => p.estoque !== null && p.estoque > 0 && p.estoque <= 5).length
  const ilimitado = products.filter(p => p.estoque === null).length

  const subCats = categorias.filter(c => c.parent_id)

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Estoque</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{products.length} produtos</p>
      </div>

      {/* Alertas rápidos */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        {[
          { label: 'Sem estoque', count: semEstoque, color: '#ef4444', filter: 'sem_estoque' },
          { label: 'Estoque baixo (≤5)', count: baixo, color: '#f59e0b', filter: 'baixo' },
          { label: 'Ilimitado', count: ilimitado, color: 'var(--a-text3)', filter: 'ilimitado' },
        ].map(({ label, count, color, filter }) => (
          <button key={filter} onClick={() => setFilterStatus(f => f === filter ? 'todos' : filter as any)}
            style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${filterStatus === filter ? color : 'var(--a-border)'}`, background: filterStatus === filter ? `${color}15` : 'var(--a-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color }}>{count}</span>
            <span style={{ fontSize: 12, color: 'var(--a-text2)', fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..."
          style={{ padding: '9px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, width: 240, outline: 'none' }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '9px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
          <option value="">Todas as categorias</option>
          {subCats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {(search || filterCat || filterStatus !== 'todos') && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus('todos') }}
            style={{ padding: '9px 14px', fontSize: 12, color: 'var(--a-text3)', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 8, cursor: 'pointer' }}>
            Limpar filtros
          </button>
        )}
        <span style={{ fontSize: 12, color: 'var(--a-text3)', marginLeft: 'auto' }}>
          {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Produto', 'Categoria', 'Status', 'Estoque', ''].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--a-border)' }}>
                  <td colSpan={5} style={{ padding: '18px', height: 56 }}>
                    <div style={{ height: 14, background: 'var(--a-border)', borderRadius: 4, width: `${60 + (i % 3) * 15}%`, opacity: 0.5 }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum produto encontrado</td></tr>
            ) : filtered.map(p => {
              const draft = drafts[p.id] || { value: '', saving: false, saved: false, error: '' }
              const isDirty = changed(p)
              const estoqueNum = p.estoque
              const statusColor = estoqueNum === null ? 'var(--a-text3)' : estoqueNum === 0 ? '#ef4444' : estoqueNum <= 5 ? '#f59e0b' : '#8b5cf6'
              const statusLabel = estoqueNum === null ? 'Ilimitado' : estoqueNum === 0 ? 'Sem estoque' : estoqueNum <= 5 ? 'Baixo' : 'Ok'

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--a-border)', opacity: p.ativo ? 1 : 0.45 }}>
                  {/* Produto */}
                  <td style={{ padding: '11px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 7, overflow: 'hidden', background: 'var(--a-border)', flexShrink: 0, position: 'relative' }}>
                        {p.img_url && <Image src={p.img_url} alt="" fill style={{ objectFit: 'cover' }} unoptimized />}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-text)', margin: 0, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        {p.brand && <p style={{ fontSize: 10, color: 'var(--a-text3)', margin: 0, marginTop: 2 }}>{p.brand}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td style={{ padding: '11px 18px' }}>
                    <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>
                      {p.categoria_id ? catMap[p.categoria_id] || '—' : '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '11px 18px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: '3px 9px', borderRadius: 5, border: `1px solid ${statusColor}30`, whiteSpace: 'nowrap' }}>
                      {statusLabel}
                    </span>
                  </td>

                  {/* Input estoque */}
                  <td style={{ padding: '11px 18px', minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number" min="0"
                        value={draft.value}
                        onChange={e => setDraft(p.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && isDirty && salvar(p)}
                        placeholder="∞"
                        style={{ width: 90, padding: '7px 10px', background: 'var(--a-bg)', border: `1px solid ${isDirty ? 'rgba(139,92,246,0.5)' : 'var(--a-border)'}`, borderRadius: 7, color: 'var(--a-text)', fontSize: 13, outline: 'none', textAlign: 'center', transition: 'border-color 0.15s' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>un.</span>
                    </div>
                    {draft.error && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>{draft.error}</p>}
                  </td>

                  {/* Salvar */}
                  <td style={{ padding: '11px 18px' }}>
                    {draft.saved ? (
                      <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700 }}>✓ Salvo</span>
                    ) : (
                      <button
                        onClick={() => salvar(p)}
                        disabled={!isDirty || draft.saving}
                        style={{
                          padding: '7px 18px', fontSize: 12, fontWeight: 700, borderRadius: 7, cursor: !isDirty || draft.saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                          background: !isDirty ? 'transparent' : draft.saving ? 'var(--a-border)' : '#8b5cf6',
                          color: !isDirty ? 'var(--a-text3)' : draft.saving ? 'var(--a-text3)' : '#000',
                          border: !isDirty ? '1px solid var(--a-border)' : 'none',
                        }}>
                        {draft.saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
