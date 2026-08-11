'use client'
import { useState, useEffect } from 'react'

type Webhook = {
  id: string
  nome: string
  url: string
  events: string[]
  secret: string
  ativo: boolean
  created_at: string
}

const EVENTOS = [
  'order.created',
  'order.status_changed',
  'order.comprovante_uploaded',
  'product.created',
  'product.updated',
  'customer.created',
]

export default function Webhooks() {
  const [hooks, setHooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', url: '', events: [] as string[], ativo: true })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [createdSecret, setCreatedSecret] = useState<{ id: string; secret: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<{ id: string; ok: boolean; msg: string } | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/admin/webhooks').then(r => r.json()).catch(() => [])
    setHooks(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const criar = async () => {
    if (!form.nome || !form.url) { setErr('Nome e URL obrigatórios'); return }
    if (form.events.length === 0) { setErr('Selecione ao menos um evento'); return }
    setSaving(true)
    setErr('')
    const r = await fetch('/api/admin/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(d.error || 'Erro ao criar'); setSaving(false); return }
    setCreatedSecret({ id: d.id, secret: d.secret })
    setCopied(false)
    setForm({ nome: '', url: '', events: [], ativo: true })
    setModal(false)
    setSaving(false)
    load()
  }

  const toggleEvent = (ev: string) => {
    setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev] }))
  }

  const toggleAtivo = async (h: Webhook) => {
    setHooks(prev => prev.map(x => x.id === h.id ? { ...x, ativo: !x.ativo } : x))
    await fetch('/api/admin/webhooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: h.id, ativo: !h.ativo }),
    })
  }

  const excluir = async (h: Webhook) => {
    if (!confirm(`Excluir webhook "${h.nome}"?`)) return
    setHooks(prev => prev.filter(x => x.id !== h.id))
    await fetch('/api/admin/webhooks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: h.id }),
    })
  }

  const testar = async (h: Webhook) => {
    setTesting(h.id)
    setTestMsg(null)
    const r = await fetch(`/api/admin/webhooks/${h.id}/test`, { method: 'POST' })
    const d = await r.json().catch(() => ({}))
    setTesting(null)
    if (!r.ok) setTestMsg({ id: h.id, ok: false, msg: d.error || 'Falhou' })
    else setTestMsg({ id: h.id, ok: true, msg: 'Disparado — ver entregas' })
    setTimeout(() => setTestMsg(null), 4000)
  }

  const copiar = (txt: string) => {
    navigator.clipboard.writeText(txt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inp = {
    padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)',
    borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const lbl = { fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Webhooks</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{hooks.length} webhooks cadastrados</p>
        </div>
        <button onClick={() => { setModal(true); setErr(''); setForm({ nome: '', url: '', events: [], ativo: true }) }}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          + Novo Webhook
        </button>
      </div>

      {createdSecret && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', margin: 0, marginBottom: 8 }}>
            ⚠ Guarde o secret agora — não será mostrado novamente
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, padding: '8px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 6, fontSize: 12, color: 'var(--a-text)', fontFamily: 'monospace', overflow: 'auto' }}>
              {createdSecret.secret}
            </code>
            <button onClick={() => copiar(createdSecret.secret)}
              style={{ padding: '8px 14px', background: '#f59e0b', border: 'none', borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            <button onClick={() => setCreatedSecret(null)}
              style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text3)', fontSize: 11, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Nome', 'URL', 'Eventos', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : hooks.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum webhook cadastrado</td></tr>
            ) : hooks.map(h => (
              <tr key={h.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: 'var(--a-text)' }}>{h.nome}</td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)', fontFamily: 'monospace', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</td>
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(h.events || []).map(ev => (
                      <span key={ev} style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(169, 101, 237,0.1)', color: '#A965ED', border: '1px solid rgba(169, 101, 237,0.2)', borderRadius: 4 }}>
                        {ev}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => toggleAtivo(h)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${h.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: h.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: h.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer' }}>
                    {h.ativo ? '● Ativo' : '○ Inativo'}
                  </button>
                </td>
                <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => testar(h)} disabled={testing === h.id}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, color: '#f59e0b', fontSize: 11, cursor: 'pointer', marginRight: 6 }}>
                    {testing === h.id ? '…' : 'Testar'}
                  </button>
                  <a href={`/admin/webhooks/${h.id}/deliveries`}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text2)', fontSize: 11, textDecoration: 'none', marginRight: 6 }}>
                    Entregas
                  </a>
                  <button onClick={() => excluir(h)}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                    Excluir
                  </button>
                  {testMsg && testMsg.id === h.id && (
                    <div style={{ marginTop: 6, fontSize: 11, color: testMsg.ok ? '#A965ED' : '#ef4444' }}>{testMsg.msg}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 500, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Novo Webhook</h2>
              <button onClick={() => setModal(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>NOME</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: Notificação Slack"
                  style={inp} />
              </div>
              <div>
                <label style={lbl}>URL</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div>
                <label style={lbl}>EVENTOS</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--a-bg)', borderRadius: 8, border: '1px solid var(--a-border)' }}>
                  {EVENTOS.map(ev => (
                    <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--a-text2)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                      <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{ev}</code>
                    </label>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                Ativo
              </label>
              {err && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{err}</p>}
              <button onClick={criar} disabled={saving || !form.nome || !form.url || form.events.length === 0}
                style={{ marginTop: 8, padding: '13px', background: (!form.nome || !form.url || form.events.length === 0) ? 'var(--a-border)' : '#A965ED', color: (!form.nome || !form.url || form.events.length === 0) ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : 'Criar Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
