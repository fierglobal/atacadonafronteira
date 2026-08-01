'use client'
import { useState, useEffect } from 'react'

type Categoria = { id: string; nome: string; parent_id: string | null; created_at: string }

const inp: React.CSSProperties = {
  padding: '10px 14px', background: 'var(--a-bg)', border: '1px solid var(--a-border)',
  borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%',
}

export default function Categorias() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [novoParent, setNovoParent] = useState('')
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; nome: string; parent_id: string | null } | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const load = async () => {
    const data = await fetch('/api/admin/categorias').then(r => r.json())
    setCats(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const criar = async () => {
    if (!novoNome.trim()) return
    setCriando(true); setErro('')
    const res = await fetch('/api/admin/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome.trim(), parent_id: novoParent || null }),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error || 'Erro ao criar'); setCriando(false); return }
    setCats(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoNome(''); setNovoParent('')
    setCriando(false)
  }

  const salvarEdicao = async () => {
    if (!editando) return
    setSalvando(editando.id)
    const res = await fetch(`/api/admin/categorias/${editando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: editando.nome, parent_id: editando.parent_id }),
    })
    if (res.ok) {
      setCats(prev => prev.map(c => c.id === editando.id ? { ...c, nome: editando.nome, parent_id: editando.parent_id } : c).sort((a, b) => a.nome.localeCompare(b.nome)))
      setEditando(null)
    }
    setSalvando(null)
  }

  const excluir = async (c: Categoria) => {
    const temFilhos = cats.some(x => x.parent_id === c.id)
    if (temFilhos && !confirm(`"${c.nome}" tem subcategorias. Excluir mesmo assim?`)) return
    if (!temFilhos && !confirm(`Excluir categoria "${c.nome}"?`)) return
    setSalvando(c.id)
    await fetch(`/api/admin/categorias/${c.id}`, { method: 'DELETE' })
    setCats(prev => prev.filter(x => x.id !== c.id && x.parent_id !== c.id))
    setSalvando(null)
  }

  const pais = cats.filter(c => !c.parent_id).sort((a, b) => a.nome.localeCompare(b.nome))
  const filhos = (parentId: string) => cats.filter(c => c.parent_id === parentId).sort((a, b) => a.nome.localeCompare(b.nome))
  const totalSubs = cats.filter(c => c.parent_id).length

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Categorias</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>
          {pais.length} categorias · {totalSubs} subcategorias
        </p>
      </div>

      {/* Formulário nova categoria */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 22, marginBottom: 24, maxWidth: 620 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#8b5cf6', letterSpacing: '0.1em', margin: '0 0 16px' }}>NOVA CATEGORIA</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: novoParent === '' ? 0 : 0 }}>
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && criar()}
            placeholder="Nome da categoria..."
            style={{ ...inp, flex: 1 }}
          />
          <select
            value={novoParent}
            onChange={e => setNovoParent(e.target.value)}
            style={{ ...inp, width: 200, cursor: 'pointer' }}
          >
            <option value="">Categoria principal</option>
            {pais.map(p => <option key={p.id} value={p.id}>↳ Sub de: {p.nome}</option>)}
          </select>
          <button
            onClick={criar}
            disabled={criando || !novoNome.trim()}
            style={{ padding: '10px 22px', background: criando || !novoNome.trim() ? 'var(--a-border)' : '#8b5cf6', color: criando || !novoNome.trim() ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: criando || !novoNome.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
          >
            {criando ? 'Criando...' : '+ Cadastrar'}
          </button>
        </div>
        {erro && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{erro}</p>}
      </div>

      {/* Árvore de categorias */}
      <div style={{ maxWidth: 620 }}>
        {loading ? (
          <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>
            Carregando...
          </div>
        ) : pais.length === 0 ? (
          <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>
            Nenhuma categoria cadastrada
          </div>
        ) : pais.map(cat => (
          <div key={cat.id} style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
            {/* Categoria principal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: filhos(cat.id).length > 0 ? '1px solid var(--a-border)' : 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                {editando?.id === cat.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={editando.nome}
                      onChange={e => setEditando({ ...editando, nome: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditando(null) }}
                      autoFocus
                      style={{ ...inp, flex: 1, borderColor: 'rgba(139,92,246,0.4)' }}
                    />
                    <select
                      value={editando.parent_id || ''}
                      onChange={e => setEditando({ ...editando, parent_id: e.target.value || null })}
                      style={{ ...inp, width: 180, cursor: 'pointer' }}
                    >
                      <option value="">Categoria principal</option>
                      {pais.filter(p => p.id !== cat.id).map(p => <option key={p.id} value={p.id}>↳ Sub de: {p.nome}</option>)}
                    </select>
                    <button onClick={salvarEdicao} disabled={salvando === cat.id}
                      style={{ padding: '7px 12px', background: '#8b5cf6', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      {salvando === cat.id ? '...' : '✓'}
                    </button>
                    <button onClick={() => setEditando(null)}
                      style={{ padding: '7px 10px', background: 'var(--a-border)', color: 'var(--a-text2)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-text)' }}>{cat.nome}</span>
                )}
              </div>
              {editando?.id !== cat.id && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--a-text3)', marginRight: 4 }}>
                    {filhos(cat.id).length > 0 ? `${filhos(cat.id).length} sub` : ''}
                  </span>
                  <button onClick={() => setEditando({ id: cat.id, nome: cat.nome, parent_id: cat.parent_id })}
                    style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text2)', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => excluir(cat)} disabled={salvando === cat.id}
                    style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                    {salvando === cat.id ? '...' : 'Excluir'}
                  </button>
                </div>
              )}
            </div>

            {/* Subcategorias */}
            {filhos(cat.id).map((sub, idx) => (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px 11px 36px', background: 'var(--a-bg)', borderBottom: idx < filhos(cat.id).length - 1 ? '1px solid var(--a-border)' : 'none' }}>
                <span style={{ color: 'var(--a-border)', fontSize: 14, flexShrink: 0 }}>↳</span>
                <div style={{ flex: 1 }}>
                  {editando?.id === sub.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        value={editando.nome}
                        onChange={e => setEditando({ ...editando, nome: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditando(null) }}
                        autoFocus
                        style={{ ...inp, flex: 1, borderColor: 'rgba(139,92,246,0.4)' }}
                      />
                      <select
                        value={editando.parent_id || ''}
                        onChange={e => setEditando({ ...editando, parent_id: e.target.value || null })}
                        style={{ ...inp, width: 180, cursor: 'pointer' }}
                      >
                        <option value="">Categoria principal</option>
                        {pais.map(p => <option key={p.id} value={p.id}>↳ Sub de: {p.nome}</option>)}
                      </select>
                      <button onClick={salvarEdicao} disabled={salvando === sub.id}
                        style={{ padding: '7px 12px', background: '#8b5cf6', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {salvando === sub.id ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditando(null)}
                        style={{ padding: '7px 10px', background: 'var(--a-border)', color: 'var(--a-text2)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>×</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--a-text2)' }}>{sub.nome}</span>
                  )}
                </div>
                {editando?.id !== sub.id && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditando({ id: sub.id, nome: sub.nome, parent_id: sub.parent_id })}
                      style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text2)', cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => excluir(sub)} disabled={salvando === sub.id}
                      style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                      {salvando === sub.id ? '...' : 'Excluir'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Órfãs sem pai (edge case) */}
        {cats.filter(c => c.parent_id && !cats.find(p => p.id === c.parent_id)).map(c => (
          <div key={c.id} style={{ background: 'var(--a-surface)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, marginBottom: 10, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>⚠ Categoria órfã</span>
            <span style={{ fontSize: 13, color: 'var(--a-text)', flex: 1 }}>{c.nome}</span>
            <button onClick={() => excluir(c)}
              style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
