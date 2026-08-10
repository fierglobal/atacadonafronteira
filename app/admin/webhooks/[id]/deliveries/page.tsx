'use client'
import { useState, useEffect, use, Fragment } from 'react'

type Delivery = {
  id: string
  webhook_id: string
  event: string
  payload: unknown
  status_code: number | null
  response_body: string | null
  error: string | null
  attempt: number
  delivered_at: string | null
  created_at: string
}

export default function Deliveries({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [items, setItems] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await fetch(`/api/admin/webhooks/${id}/deliveries`).then(r => r.json()).catch(() => [])
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const statusColor = (d: Delivery): string => {
    if (d.error) return '#ef4444'
    const s = d.status_code || 0
    if (s >= 200 && s < 300) return '#8b5cf6'
    if (s >= 400) return '#ef4444'
    return '#f59e0b'
  }

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <a href="/admin/webhooks" style={{ fontSize: 11, color: 'var(--a-text3)', textDecoration: 'none' }}>← Webhooks</a>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, marginTop: 6 }}>Entregas</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{items.length} entregas recentes</p>
        </div>
        <button onClick={load}
          style={{ padding: '9px 18px', background: 'var(--a-border)', border: 'none', borderRadius: 8, color: 'var(--a-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Atualizar
        </button>
      </div>

      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Data', 'Evento', 'Status', 'Erro', 'Tentativa', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma entrega ainda</td></tr>
            ) : items.map(d => (
              <Fragment key={d.id}>
                <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                  <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)', fontFamily: 'monospace' }}>
                    {new Date(d.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <code style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 4 }}>
                      {d.event}
                    </code>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 800, color: statusColor(d) }}>
                    {d.status_code ?? (d.error ? 'ERR' : '—')}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 11, color: '#ef4444', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.error || '—'}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text2)' }}>{d.attempt}</td>
                  <td style={{ padding: '12px 18px' }}>
                    <button onClick={() => setOpen(open === d.id ? null : d.id)}
                      style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text2)', fontSize: 11, cursor: 'pointer' }}>
                      {open === d.id ? 'Ocultar' : 'Ver payload'}
                    </button>
                  </td>
                </tr>
                {open === d.id && (
                  <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                    <td colSpan={6} style={{ padding: '14px 22px', background: 'var(--a-bg)' }}>
                      <div style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>PAYLOAD</div>
                      <pre style={{ margin: 0, marginBottom: 12, padding: 12, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 6, fontSize: 11, color: 'var(--a-text)', fontFamily: 'monospace', overflow: 'auto', maxHeight: 240 }}>
                        {JSON.stringify(d.payload, null, 2)}
                      </pre>
                      <div style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>RESPONSE</div>
                      <pre style={{ margin: 0, padding: 12, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 6, fontSize: 11, color: 'var(--a-text2)', fontFamily: 'monospace', overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
                        {d.response_body || '(vazio)'}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
