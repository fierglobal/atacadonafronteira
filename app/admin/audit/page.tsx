'use client'
import { useState, useEffect, Fragment } from 'react'

type Log = {
  id: string
  user_id: string | null
  user_nome: string
  action: string
  entity: string
  entity_id: string | null
  diff: unknown
  ip: string | null
  created_at: string
}

const LIMIT = 50

export default function Audit() {
  const [items, setItems] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entity, setEntity] = useState('')
  const [user, setUser] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = async (nextOffset = offset) => {
    setLoading(true)
    const params = new URLSearchParams({
      offset: String(nextOffset),
      limit: String(LIMIT),
    })
    if (entity) params.set('entity', entity)
    if (user) params.set('user', user)
    const r = await fetch(`/api/admin/audit?${params.toString()}`).then(r => r.json()).catch(() => ({ items: [], total: 0 }))
    setItems(Array.isArray(r.items) ? r.items : [])
    setTotal(r.total || 0)
    setOffset(nextOffset)
    setLoading(false)
  }

  useEffect(() => { load(0) }, [])

  const filtrar = () => load(0)

  const actionColor = (a: string): string => {
    if (a === 'create') return '#A965ED'
    if (a === 'delete') return '#ef4444'
    if (a === 'update') return '#f59e0b'
    if (a === 'test') return '#A965ED'
    return 'var(--a-text2)'
  }

  const truncDiff = (d: unknown): string => {
    if (!d) return '—'
    const s = JSON.stringify(d)
    return s.length > 80 ? s.slice(0, 80) + '…' : s
  }

  const inp = {
    padding: '8px 12px', background: 'var(--a-surface)', border: '1px solid var(--a-border)',
    borderRadius: 8, color: 'var(--a-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div className="audit-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .audit-page { padding: 16px !important; }
          .audit-table-wrap { display: none !important; }
          .audit-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Auditoria</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>
          {total} registros — exibindo {items.length} (offset {offset})
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={entity} onChange={e => setEntity(e.target.value)}
          placeholder="Filtrar por entity (ex: webhook, promocao)"
          style={{ ...inp, width: 280 }} />
        <input value={user} onChange={e => setUser(e.target.value)}
          placeholder="Filtrar por usuário"
          style={{ ...inp, width: 240 }} />
        <button onClick={filtrar}
          style={{ padding: '8px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          Filtrar
        </button>
        <button onClick={() => { setEntity(''); setUser(''); setTimeout(() => load(0), 0) }}
          style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text2)', fontSize: 12, cursor: 'pointer' }}>
          Limpar
        </button>
      </div>

      <div className="audit-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Data', 'Usuário', 'Ação', 'Entity', 'Entity ID', 'Diff', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum registro</td></tr>
            ) : items.map(l => (
              <Fragment key={l.id}>
                <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                  <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {new Date(l.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text)' }}>{l.user_nome}</td>
                  <td style={{ padding: '12px 18px', fontSize: 11, fontWeight: 800, color: actionColor(l.action), textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                    {l.action}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 11, color: '#A965ED', fontFamily: 'monospace' }}>{l.entity}</td>
                  <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)', fontFamily: 'monospace', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.entity_id || '—'}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)', fontFamily: 'monospace', maxWidth: 320 }}>
                    {truncDiff(l.diff)}
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    {l.diff ? (
                      <button onClick={() => setOpen(open === l.id ? null : l.id)}
                        style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text2)', fontSize: 11, cursor: 'pointer' }}>
                        {open === l.id ? 'Ocultar' : 'Ver'}
                      </button>
                    ) : null}
                  </td>
                </tr>
                {open === l.id && (
                  <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                    <td colSpan={7} style={{ padding: '14px 22px', background: 'var(--a-bg)' }}>
                      <pre style={{ margin: 0, padding: 12, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 6, fontSize: 11, color: 'var(--a-text)', fontFamily: 'monospace', overflow: 'auto', maxHeight: 280 }}>
                        {JSON.stringify(l.diff, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="audit-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum registro</div>
        ) : items.map(l => (
          <div key={l.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--a-text3)', fontFamily: 'monospace' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: actionColor(l.action), textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{l.action}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--a-text)', margin: '6px 0 0' }}>{l.user_nome}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#A965ED', fontFamily: 'monospace' }}>{l.entity}</span>
              {l.entity_id && <span style={{ fontSize: 10, color: 'var(--a-text3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{l.entity_id}</span>}
            </div>
            {l.diff != null && (
              <>
                <button onClick={() => setOpen(open === l.id ? null : l.id)}
                  style={{ marginTop: 8, padding: '4px 10px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text2)', fontSize: 11, cursor: 'pointer' }}>
                  {open === l.id ? 'Ocultar' : 'Ver diff'}
                </button>
                {open === l.id && (
                  <pre style={{ margin: '8px 0 0', padding: 12, background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 6, fontSize: 11, color: 'var(--a-text)', fontFamily: 'monospace', overflow: 'auto', maxHeight: 280 }}>
                    {JSON.stringify(l.diff, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <button onClick={() => load(Math.max(0, offset - LIMIT))} disabled={offset === 0 || loading}
          style={{ padding: '8px 18px', background: offset === 0 ? 'var(--a-border)' : 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: offset === 0 ? 'var(--a-text3)' : 'var(--a-text2)', fontSize: 12, cursor: offset === 0 ? 'default' : 'pointer' }}>
          ← Anterior
        </button>
        <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>
          {offset + 1}–{offset + items.length} de {total}
        </span>
        <button onClick={() => load(offset + LIMIT)} disabled={offset + LIMIT >= total || loading}
          style={{ padding: '8px 18px', background: offset + LIMIT >= total ? 'var(--a-border)' : 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: offset + LIMIT >= total ? 'var(--a-text3)' : 'var(--a-text2)', fontSize: 12, cursor: offset + LIMIT >= total ? 'default' : 'pointer' }}>
          Próxima →
        </button>
      </div>
    </div>
  )
}
