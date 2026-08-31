'use client'
import { useState, useEffect } from 'react'

type Channel = {
  id: string
  slug: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
}

export default function SalesChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ slug: '', nome: '', descricao: '', ativo: true })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/admin/sales-channels').then(r => r.json()).catch(() => [])
    setChannels(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const criar = async () => {
    if (!form.slug || !form.nome) { setErr('Slug e nome obrigatórios'); return }
    setSaving(true)
    setErr('')
    const r = await fetch('/api/admin/sales-channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(d.error || 'Erro ao criar'); setSaving(false); return }
    setForm({ slug: '', nome: '', descricao: '', ativo: true })
    setModal(false)
    setSaving(false)
    load()
  }

  const toggleAtivo = async (c: Channel) => {
    setChannels(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x))
    await fetch('/api/admin/sales-channels', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, ativo: !c.ativo }),
    })
  }

  const excluir = async (c: Channel) => {
    if (!confirm(`Excluir canal "${c.nome}"?`)) return
    setChannels(prev => prev.filter(x => x.id !== c.id))
    await fetch('/api/admin/sales-channels', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id }),
    })
  }

  const inp = {
    padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)',
    borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const lbl = { fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }

  return (
    <div className="canais-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .canais-page { padding: 16px !important; }
          .canais-table-wrap { display: none !important; }
          .canais-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Canais de Venda</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{channels.length} canais cadastrados</p>
        </div>
        <button onClick={() => { setModal(true); setErr('') }}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          + Novo Canal
        </button>
      </div>

      <div className="canais-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Slug', 'Nome', 'Descrição', 'Status', 'Criado em', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : channels.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum canal cadastrado</td></tr>
            ) : channels.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                <td style={{ padding: '12px 18px', fontSize: 12, color: '#A965ED', fontFamily: 'monospace', fontWeight: 700 }}>{c.slug}</td>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: 'var(--a-text)' }}>{c.nome}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text3)' }}>{c.descricao || '—'}</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => toggleAtivo(c)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${c.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: c.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: c.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer' }}>
                    {c.ativo ? '● Ativo' : '○ Inativo'}
                  </button>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => excluir(c)}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="canais-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : channels.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum canal cadastrado</div>
        ) : channels.map(c => (
          <div key={c.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 11, color: '#A965ED', fontFamily: 'monospace', fontWeight: 700 }}>{c.slug}</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-text)', margin: '2px 0 0' }}>{c.nome}</p>
              </div>
              <button onClick={() => toggleAtivo(c)}
                style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${c.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: c.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: c.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {c.ativo ? '● Ativo' : '○ Inativo'}
              </button>
            </div>
            {c.descricao && <p style={{ fontSize: 12, color: 'var(--a-text3)', margin: '8px 0 0' }}>{c.descricao}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--a-border)' }}>
              <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
              <button onClick={() => excluir(c)}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 440, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Novo Canal</h2>
              <button onClick={() => setModal(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>SLUG</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') }))}
                  placeholder="ex: ecommerce, whatsapp, marketplace"
                  style={{ ...inp, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>NOME</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: E-commerce Web"
                  style={inp} />
              </div>
              <div>
                <label style={lbl}>DESCRIÇÃO</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  style={{ ...inp, resize: 'vertical' as const }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                Ativo
              </label>
              {err && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{err}</p>}
              <button onClick={criar} disabled={saving || !form.slug || !form.nome}
                style={{ marginTop: 8, padding: '13px', background: (!form.slug || !form.nome) ? 'var(--a-border)' : '#A965ED', color: (!form.slug || !form.nome) ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : 'Criar Canal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
