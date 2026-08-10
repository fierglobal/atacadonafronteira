'use client'
import { useState, useEffect } from 'react'

type Review = {
  id: string; product_id: string; nome: string; rating: number
  comentario: string | null; aprovado: boolean; created_at: string
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: 14, letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => i < n ? '★' : '☆').join('')}
    </span>
  )
}

export default function Avaliacoes() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')

  const load = async (f: string) => {
    setLoading(true)
    const data = await fetch(`/api/admin/reviews?filter=${f}`).then(r => r.json()).catch(() => [])
    setReviews(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  const aprovar = async (r: Review) => {
    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, aprovado: true } : x))
    await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, aprovado: true }),
    })
    if (filter === 'pending') setReviews(prev => prev.filter(x => x.id !== r.id))
  }

  const recusar = async (id: string) => {
    setReviews(prev => prev.filter(x => x.id !== id))
    await fetch('/api/admin/reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const pendingCount = reviews.filter(r => !r.aprovado).length

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Avaliações de Produtos</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{reviews.length} avaliações</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['pending', 'approved', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${filter === f ? '#8b5cf6' : 'var(--a-border)'}`, background: filter === f ? 'rgba(139,92,246,0.08)' : 'transparent', color: filter === f ? '#8b5cf6' : 'var(--a-text3)', cursor: 'pointer' }}>
            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--a-text3)' }}>Carregando...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--a-text3)' }}>
          <p style={{ fontSize: 16 }}>Nenhuma avaliação {filter === 'pending' ? 'pendente' : filter === 'approved' ? 'aprovada' : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background: 'var(--a-surface)', border: `1px solid ${!r.aprovado ? 'rgba(245,158,11,0.3)' : 'var(--a-border)'}`, borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#8b5cf6', flexShrink: 0 }}>
                {r.nome[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)' }}>{r.nome}</span>
                  <Stars n={r.rating} />
                  <span style={{ fontSize: 10, color: 'var(--a-text3)' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  {!r.aprovado && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>Pendente</span>
                  )}
                </div>
                <p style={{ fontSize: 10, color: 'var(--a-text3)', marginBottom: 6 }}>Produto: <span style={{ color: 'var(--a-text2)' }}>{r.product_id}</span></p>
                {r.comentario && <p style={{ fontSize: 13, color: 'var(--a-text2)', margin: 0, lineHeight: 1.5 }}>{r.comentario}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {!r.aprovado && (
                  <button onClick={() => aprovar(r)}
                    style={{ padding: '7px 14px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#8b5cf6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Aprovar
                  </button>
                )}
                <button onClick={() => recusar(r.id)}
                  style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {r.aprovado ? 'Remover' : 'Recusar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
