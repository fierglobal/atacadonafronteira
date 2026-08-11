'use client'
import { useState, useEffect } from 'react'

type Cupom = {
  id: string; codigo: string; desconto_pct: number; ativo: boolean
  validade: string | null; usos_max: number | null; usos_count: number; created_at: string
}

export default function Cupons() {
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ codigo: '', desconto_pct: '', validade: '', usos_max: '' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/admin/cupons').then(r => r.json()).catch(() => [])
    setCupons(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const criar = async () => {
    if (!form.codigo || !form.desconto_pct) return
    setSaving(true)
    await fetch('/api/admin/cupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: form.codigo,
        desconto_pct: +form.desconto_pct,
        validade: form.validade || null,
        usos_max: form.usos_max ? +form.usos_max : null,
      }),
    })
    setForm({ codigo: '', desconto_pct: '', validade: '', usos_max: '' })
    setModal(false)
    setSaving(false)
    load()
  }

  const toggleAtivo = async (c: Cupom) => {
    setCupons(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x))
    await fetch(`/api/admin/cupons/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !c.ativo }),
    })
  }

  const excluir = async (id: string) => {
    if (!confirm('Excluir este cupom?')) return
    setCupons(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/admin/cupons/${id}`, { method: 'DELETE' })
  }

  const copiar = (codigo: string) => {
    navigator.clipboard.writeText(codigo)
    setCopied(codigo)
    setTimeout(() => setCopied(null), 2000)
  }

  const gerarCodigo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    setForm(f => ({ ...f, codigo: Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }))
  }

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Cupons de Desconto</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{cupons.length} cupons cadastrados</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          + Novo Cupom
        </button>
      </div>

      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Código', 'Desconto', 'Status', 'Validade', 'Usos', 'Criado em', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : cupons.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum cupom cadastrado</td></tr>
            ) : cupons.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#A965ED', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{c.codigo}</span>
                    <button onClick={() => copiar(c.codigo)}
                      style={{ padding: '3px 8px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 4, color: 'var(--a-text3)', fontSize: 10, cursor: 'pointer' }}>
                      {copied === c.codigo ? '✓' : 'Copiar'}
                    </button>
                  </div>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 16, fontWeight: 900, color: '#f59e0b' }}>{c.desconto_pct}%</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => toggleAtivo(c)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${c.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: c.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: c.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer' }}>
                    {c.ativo ? '● Ativo' : '○ Inativo'}
                  </button>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text3)' }}>
                  {c.validade ? (new Date(c.validade) < new Date() ? <span style={{ color: '#ef4444' }}>Expirado ({c.validade})</span> : c.validade) : '—'}
                </td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text)' }}>
                  {c.usos_count}{c.usos_max ? ` / ${c.usos_max}` : ''}
                </td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => excluir(c.id)}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Novo Cupom</h2>
              <button onClick={() => setModal(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>CÓDIGO</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                    placeholder="ex: BEMVINDO10" maxLength={20}
                    style={{ flex: 1, padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.06em', outline: 'none' }} />
                  <button onClick={gerarCodigo}
                    style={{ padding: '10px 14px', background: 'var(--a-border)', border: 'none', borderRadius: 8, color: 'var(--a-text2)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Gerar
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>DESCONTO (%)</label>
                <input value={form.desconto_pct} onChange={e => setForm(f => ({ ...f, desconto_pct: e.target.value }))}
                  type="number" min="1" max="100" placeholder="ex: 10"
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>VALIDADE (opcional)</label>
                  <input value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))}
                    type="date"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>MÁXIMO DE USOS</label>
                  <input value={form.usos_max} onChange={e => setForm(f => ({ ...f, usos_max: e.target.value }))}
                    type="number" min="1" placeholder="ilimitado"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              </div>

              <button onClick={criar} disabled={saving || !form.codigo || !form.desconto_pct}
                style={{ marginTop: 8, padding: '13px', background: (!form.codigo || !form.desconto_pct) ? 'var(--a-border)' : '#A965ED', color: (!form.codigo || !form.desconto_pct) ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : 'Criar Cupom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
