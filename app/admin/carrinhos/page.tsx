'use client'
import { useState, useEffect, useCallback } from 'react'

type Session = {
  id: string; nome: string | null; telefone: string | null; email: string | null
  itens: { name: string; qty: number; usd: number }[] | null
  total_usd: number | null; contatado: boolean; created_at: string
}

const fmt = (n: number) => `USD ${n.toFixed(2)}`
const elapsed = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return `${s}s atrás`
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`
  return `${Math.floor(s / 86400)}d atrás`
}

export default function Carrinhos() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'hoje' | '7d'>('hoje')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/admin/carrinhos').then(r => r.json())
    setSessions(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const marcarContatado = async (id: string, val: boolean) => {
    await fetch(`/api/admin/carrinhos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contatado: val }),
    })
    setSessions(prev => prev.map(s => s.id === id ? { ...s, contatado: val } : s))
  }

  const waLink = (s: Session) => {
    const itensText = (s.itens || []).map(i => `• ${i.name} ×${i.qty}`).join('\n')
    const msg = `Olá${s.nome ? ` ${s.nome.split(' ')[0]}` : ''}! Vi que você montou um carrinho conosco mas não finalizou.\n\n${itensText}\n\nTotal: ${fmt(s.total_usd || 0)}\n\nPosso ajudar a concluir seu pedido? 😊`
    return `https://wa.me/${(s.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  const now = Date.now()
  const filtered = sessions.filter(s => {
    const dt = new Date(s.created_at).getTime()
    if (filter === 'hoje') return now - dt < 86400000
    if (filter === '7d') return now - dt < 7 * 86400000
    return true
  })

  const naoContatados = filtered.filter(s => !s.contatado).length

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Carrinhos Abandonados</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>
          {filtered.length} carrinhos · <span style={{ color: '#f59e0b', fontWeight: 700 }}>{naoContatados} não contatados</span>
        </p>
      </div>

      {/* Alertas */}
      {naoContatados > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>{naoContatados} cliente{naoContatados !== 1 ? 's' : ''} com carrinho abandonado aguardando contato</span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['hoje', 'Hoje'], ['7d', 'Últimos 7 dias'], ['todos', 'Todos']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${filter === v ? '#A965ED' : 'var(--a-border)'}`, background: filter === v ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: filter === v ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer', transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 11, color: 'var(--a-text3)', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Cliente', 'Telefone', 'Itens', 'Total', 'Tempo', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum carrinho abandonado nesse período</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--a-border)', opacity: s.contatado ? 0.5 : 1 }}>
                <td style={{ padding: '12px 18px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', margin: 0 }}>{s.nome || 'Anônimo'}</p>
                  {s.email && <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '2px 0 0' }}>{s.email}</p>}
                </td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text2)' }}>{s.telefone || '—'}</td>
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(s.itens || []).slice(0, 3).map((item, i) => (
                      <span key={i} style={{ fontSize: 11, color: 'var(--a-text2)' }}>
                        {item.name?.slice(0, 28)}{item.name?.length > 28 ? '…' : ''} ×{item.qty}
                      </span>
                    ))}
                    {(s.itens || []).length > 3 && <span style={{ fontSize: 10, color: 'var(--a-text3)' }}>+{(s.itens || []).length - 3} mais</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#A965ED' }}>
                  {s.total_usd ? fmt(s.total_usd) : '—'}
                </td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)', whiteSpace: 'nowrap' }}>
                  {elapsed(s.created_at)}
                </td>
                <td style={{ padding: '12px 18px' }}>
                  {s.contatado
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#A965ED', background: 'rgba(169, 101, 237,0.1)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(169, 101, 237,0.2)' }}>Contatado</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(245,158,11,0.2)' }}>Pendente</span>
                  }
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {s.telefone && (
                      <a href={waLink(s)} target="_blank" rel="noopener"
                        style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.06)', color: '#25d366', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        WhatsApp
                      </a>
                    )}
                    <button onClick={() => marcarContatado(s.id, !s.contatado)}
                      style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text3)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {s.contatado ? 'Desfazer' : '✓ Contatado'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
