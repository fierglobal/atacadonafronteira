'use client'
import { useState, useEffect } from 'react'

type Entity = 'products' | 'customers'
type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'select'

type Def = {
  id: string
  entity: Entity
  field_key: string
  label: string
  field_type: FieldType
  options: unknown
  required: boolean
  ordem: number
  created_at: string
}

const TYPES: { v: FieldType; label: string }[] = [
  { v: 'text', label: 'Texto' },
  { v: 'number', label: 'Número' },
  { v: 'boolean', label: 'Sim/Não' },
  { v: 'date', label: 'Data' },
  { v: 'select', label: 'Lista (select)' },
]

const ENTITIES: { v: Entity; label: string }[] = [
  { v: 'products', label: 'Produtos' },
  { v: 'customers', label: 'Clientes' },
]

export default function CustomFields() {
  const [entity, setEntity] = useState<Entity>('products')
  const [defs, setDefs] = useState<Def[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    field_key: '', label: '', field_type: 'text' as FieldType, options: '', required: false, ordem: '0',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await fetch(`/api/admin/custom-fields?entity=${entity}`).then(r => r.json()).catch(() => [])
    setDefs(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [entity])

  const criar = async () => {
    if (!form.field_key || !form.label) { setErr('field_key e label obrigatórios'); return }
    setSaving(true)
    setErr('')
    let options: unknown = null
    if (form.field_type === 'select' && form.options.trim()) {
      try {
        options = JSON.parse(form.options)
      } catch {
        setErr('Options precisa ser JSON válido (ex: ["A","B","C"])')
        setSaving(false)
        return
      }
    }
    const r = await fetch('/api/admin/custom-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity,
        field_key: form.field_key,
        label: form.label,
        field_type: form.field_type,
        options,
        required: form.required,
        ordem: form.ordem === '' ? 0 : +form.ordem,
      }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(d.error || 'Erro ao criar'); setSaving(false); return }
    setForm({ field_key: '', label: '', field_type: 'text', options: '', required: false, ordem: '0' })
    setModal(false)
    setSaving(false)
    load()
  }

  const toggleRequired = async (d: Def) => {
    setDefs(prev => prev.map(x => x.id === d.id ? { ...x, required: !x.required } : x))
    await fetch('/api/admin/custom-fields', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id, required: !d.required }),
    })
  }

  const excluir = async (d: Def) => {
    if (!confirm(`Excluir campo "${d.label}"?`)) return
    setDefs(prev => prev.filter(x => x.id !== d.id))
    await fetch('/api/admin/custom-fields', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id }),
    })
  }

  const inp = {
    padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)',
    borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const lbl = { fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }

  return (
    <div className="cf-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .cf-page { padding: 16px !important; }
          .cf-table-wrap { display: none !important; }
          .cf-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Campos Customizados</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>Master data dinâmico</p>
        </div>
        <button onClick={() => { setModal(true); setErr('') }}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          + Novo Campo
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {ENTITIES.map(e => (
          <button key={e.v} onClick={() => setEntity(e.v)}
            style={{
              padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8,
              border: `1px solid ${entity === e.v ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`,
              background: entity === e.v ? 'rgba(169, 101, 237,0.08)' : 'transparent',
              color: entity === e.v ? '#A965ED' : 'var(--a-text2)',
              cursor: 'pointer',
            }}>
            {e.label}
          </button>
        ))}
      </div>

      <div className="cf-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Ordem', 'Field key', 'Label', 'Tipo', 'Obrigatório', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : defs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum campo cadastrado para {entity}</td></tr>
            ) : defs.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: 'var(--a-text2)', width: 60 }}>{d.ordem}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: '#A965ED', fontFamily: 'monospace', fontWeight: 700 }}>{d.field_key}</td>
                <td style={{ padding: '12px 18px', fontSize: 13, color: 'var(--a-text)' }}>{d.label}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text3)' }}>{TYPES.find(t => t.v === d.field_type)?.label || d.field_type}</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => toggleRequired(d)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${d.required ? 'rgba(245,158,11,0.3)' : 'var(--a-border)'}`, background: d.required ? 'rgba(245,158,11,0.08)' : 'transparent', color: d.required ? '#f59e0b' : 'var(--a-text3)', cursor: 'pointer' }}>
                    {d.required ? 'Sim' : 'Não'}
                  </button>
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => excluir(d)}
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
      <div className="cf-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : defs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum campo cadastrado para {entity}</div>
        ) : defs.map(d => (
          <div key={d.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--a-text3)' }}>#{d.ordem}</span>{' '}
                <span style={{ fontSize: 11, color: '#A965ED', fontFamily: 'monospace', fontWeight: 700 }}>{d.field_key}</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-text)', margin: '2px 0 0' }}>{d.label}</p>
                <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{TYPES.find(t => t.v === d.field_type)?.label || d.field_type}</span>
              </div>
              <button onClick={() => toggleRequired(d)}
                style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${d.required ? 'rgba(245,158,11,0.3)' : 'var(--a-border)'}`, background: d.required ? 'rgba(245,158,11,0.08)' : 'transparent', color: d.required ? '#f59e0b' : 'var(--a-text3)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {d.required ? 'Obrigatório' : 'Opcional'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--a-border)' }}>
              <button onClick={() => excluir(d)}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Novo Campo — {ENTITIES.find(e => e.v === entity)?.label}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>FIELD KEY (slug)</label>
                <input value={form.field_key} onChange={e => setForm(f => ({ ...f, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="ex: peso_kg, cnpj_secundario"
                  style={{ ...inp, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>LABEL</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="ex: Peso (kg)" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>TIPO</label>
                  <select value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value as FieldType }))}
                    style={{ ...inp, appearance: 'none' as never }}>
                    {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>ORDEM</label>
                  <input value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))}
                    type="number" style={inp} />
                </div>
              </div>
              {form.field_type === 'select' && (
                <div>
                  <label style={lbl}>OPTIONS (JSON)</label>
                  <textarea value={form.options} onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
                    rows={3}
                    placeholder='["A","B","C"] ou [{"value":"a","label":"Opção A"}]'
                    style={{ ...inp, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' as const }} />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))} />
                Obrigatório
              </label>
              {err && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{err}</p>}
              <button onClick={criar} disabled={saving || !form.field_key || !form.label}
                style={{ marginTop: 8, padding: '13px', background: (!form.field_key || !form.label) ? 'var(--a-border)' : '#A965ED', color: (!form.field_key || !form.label) ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : 'Criar Campo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
