'use client'
import { useState, useEffect } from 'react'

type Marca = { id: string; nome: string; created_at: string }

const inp: React.CSSProperties = { padding: '10px 14px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%' }

export default function Marcas() {
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const load = async () => {
    const data = await fetch('/api/admin/marcas').then(r => r.json())
    setMarcas(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const criar = async () => {
    if (!novoNome.trim()) return
    setCriando(true)
    setErro('')
    const res = await fetch('/api/admin/marcas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error || 'Erro ao criar'); setCriando(false); return }
    setMarcas(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoNome('')
    setCriando(false)
  }

  const salvarEdicao = async (id: string) => {
    if (!editando || editando.id !== id) return
    setSalvando(id)
    const res = await fetch(`/api/admin/marcas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: editando.nome }),
    })
    if (res.ok) {
      setMarcas(prev => prev.map(m => m.id === id ? { ...m, nome: editando.nome } : m).sort((a, b) => a.nome.localeCompare(b.nome)))
      setEditando(null)
    }
    setSalvando(null)
  }

  const excluir = async (m: Marca) => {
    if (!confirm(`Excluir marca "${m.nome}"? Produtos com essa marca não serão afetados.`)) return
    setSalvando(m.id)
    await fetch(`/api/admin/marcas/${m.id}`, { method: 'DELETE' })
    setMarcas(prev => prev.filter(x => x.id !== m.id))
    setSalvando(null)
  }

  return (
    <div className="marcas-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .marcas-page { padding: 16px !important; }
          .marcas-table-wrap { display: none !important; }
          .marcas-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Marcas</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{marcas.length} marcas cadastradas</p>
      </div>

      {/* Formulário nova marca */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 22, marginBottom: 24, maxWidth: 560 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#A965ED', letterSpacing: '0.1em', margin: '0 0 14px' }}>NOVA MARCA</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && criar()}
            placeholder="Nome da marca..."
            style={{ ...inp, flex: 1 }}
          />
          <button onClick={criar} disabled={criando || !novoNome.trim()}
            style={{ padding: '10px 22px', background: criando || !novoNome.trim() ? 'var(--a-border)' : '#A965ED', color: criando || !novoNome.trim() ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: criando || !novoNome.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
            {criando ? 'Criando...' : '+ Cadastrar'}
          </button>
        </div>
        {erro && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{erro}</p>}
      </div>

      {/* Lista de marcas */}
      <div className="marcas-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden', maxWidth: 560 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Marca', 'Cadastro', ''].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: 32, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Carregando...</td></tr>
            ) : marcas.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 32, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma marca cadastrada</td></tr>
            ) : marcas.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                {/* Nome / edição inline */}
                <td style={{ padding: '11px 18px' }}>
                  {editando?.id === m.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={editando.nome}
                        onChange={e => setEditando({ id: m.id, nome: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(m.id); if (e.key === 'Escape') setEditando(null) }}
                        autoFocus
                        style={{ ...inp, flex: 1, borderColor: 'rgba(169, 101, 237,0.4)' }}
                      />
                      <button onClick={() => salvarEdicao(m.id)} disabled={salvando === m.id}
                        style={{ padding: '6px 12px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {salvando === m.id ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditando(null)}
                        style={{ padding: '6px 10px', background: 'var(--a-border)', color: 'var(--a-text2)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>×</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)' }}>{m.nome}</span>
                  )}
                </td>
                {/* Data */}
                <td style={{ padding: '11px 18px', fontSize: 11, color: 'var(--a-text3)' }}>
                  {new Date(m.created_at).toLocaleDateString('pt-BR')}
                </td>
                {/* Ações */}
                <td style={{ padding: '11px 18px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {editando?.id !== m.id && (
                      <button onClick={() => setEditando({ id: m.id, nome: m.nome })}
                        style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text2)', cursor: 'pointer' }}>
                        Editar
                      </button>
                    )}
                    <button onClick={() => excluir(m)} disabled={salvando === m.id}
                      style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                      {salvando === m.id ? '...' : 'Excluir'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="marcas-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden', maxWidth: 560 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Carregando...</div>
        ) : marcas.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma marca cadastrada</div>
        ) : marcas.map(m => (
          <div key={m.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            {editando?.id === m.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={editando.nome}
                  onChange={e => setEditando({ id: m.id, nome: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(m.id); if (e.key === 'Escape') setEditando(null) }}
                  autoFocus
                  style={{ ...inp, flex: 1, borderColor: 'rgba(169, 101, 237,0.4)' }}
                />
                <button onClick={() => salvarEdicao(m.id)} disabled={salvando === m.id}
                  style={{ padding: '6px 12px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {salvando === m.id ? '...' : '✓'}
                </button>
                <button onClick={() => setEditando(null)}
                  style={{ padding: '6px 10px', background: 'var(--a-border)', color: 'var(--a-text2)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-text)' }}>{m.nome}</span>
                  <span style={{ fontSize: 11, color: 'var(--a-text3)', flexShrink: 0 }}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={() => setEditando({ id: m.id, nome: m.nome })}
                    style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text2)', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => excluir(m)} disabled={salvando === m.id}
                    style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                    {salvando === m.id ? '...' : 'Excluir'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
