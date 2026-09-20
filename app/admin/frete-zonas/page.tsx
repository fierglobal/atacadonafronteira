'use client'
import { useState, useEffect } from 'react'

type Zona = {
  id: string
  nome: string
  cep_inicio: string | null
  cep_fim: string | null
  prazo_dias_uteis: number
  ativo: boolean
  ordem: number
  created_at: string
}

const FORM_VAZIO = { nome: '', cep_inicio: '', cep_fim: '', prazo_dias_uteis: '', ativo: true, ordem: '0' }

export default function FreteZonas() {
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/admin/frete-zonas').then(r => r.json()).catch(() => [])
    setZonas(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const abrirNova = () => {
    setEditId(null)
    setForm(FORM_VAZIO)
    setErr('')
    setModal(true)
  }

  const abrirEdicao = (z: Zona) => {
    setEditId(z.id)
    setForm({
      nome: z.nome,
      cep_inicio: z.cep_inicio || '',
      cep_fim: z.cep_fim || '',
      prazo_dias_uteis: String(z.prazo_dias_uteis),
      ativo: z.ativo,
      ordem: String(z.ordem),
    })
    setErr('')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome || !form.prazo_dias_uteis) { setErr('Nome e prazo são obrigatórios'); return }
    setSaving(true)
    setErr('')
    const body = {
      nome: form.nome,
      cep_inicio: form.cep_inicio.trim(),
      cep_fim: form.cep_fim.trim(),
      prazo_dias_uteis: +form.prazo_dias_uteis,
      ativo: form.ativo,
      ordem: form.ordem === '' ? 0 : +form.ordem,
    }
    const r = await fetch('/api/admin/frete-zonas', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editId ? { id: editId, ...body } : body),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(d.error || 'Erro ao salvar'); setSaving(false); return }
    setModal(false)
    setSaving(false)
    load()
  }

  const toggleAtivo = async (z: Zona) => {
    setZonas(prev => prev.map(x => x.id === z.id ? { ...x, ativo: !x.ativo } : x))
    await fetch('/api/admin/frete-zonas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: z.id, ativo: !z.ativo }),
    })
  }

  const excluir = async (z: Zona) => {
    if (!confirm(`Excluir zona "${z.nome}"?`)) return
    setZonas(prev => prev.filter(x => x.id !== z.id))
    await fetch('/api/admin/frete-zonas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: z.id }),
    })
  }

  const inp = {
    padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)',
    borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const lbl = { fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }

  return (
    <div className="fz-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .fz-page { padding: 16px !important; }
          .fz-table-wrap { display: none !important; }
          .fz-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Zonas de Frete</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{zonas.length} zonas cadastradas — CEP em branco cobre qualquer faixa não coberta pelas outras</p>
        </div>
        <button onClick={abrirNova}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          + Nova Zona
        </button>
      </div>

      <div className="fz-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Ordem', 'Nome', 'CEP início', 'CEP fim', 'Prazo', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : zonas.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma zona cadastrada</td></tr>
            ) : zonas.map(z => (
              <tr key={z.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: 'var(--a-text2)', width: 60 }}>{z.ordem}</td>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: 'var(--a-text)' }}>{z.nome}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text3)', fontFamily: 'monospace' }}>{z.cep_inicio || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text3)', fontFamily: 'monospace' }}>{z.cep_fim || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: 13, color: 'var(--a-text)' }}>{z.prazo_dias_uteis} dia{z.prazo_dias_uteis === 1 ? '' : 's'} útil{z.prazo_dias_uteis === 1 ? '' : 'eis'}</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => toggleAtivo(z)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${z.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: z.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: z.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer' }}>
                    {z.ativo ? '● Ativo' : '○ Inativo'}
                  </button>
                </td>
                <td style={{ padding: '12px 18px', display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirEdicao(z)}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text2)', fontSize: 11, cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => excluir(z)}
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
      <div className="fz-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : zonas.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma zona cadastrada</div>
        ) : zonas.map(z => (
          <div key={z.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--a-text3)' }}>#{z.ordem}</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-text)', margin: '2px 0 0' }}>{z.nome}</p>
                <span style={{ fontSize: 11, color: 'var(--a-text3)', fontFamily: 'monospace' }}>{z.cep_inicio || '—'} a {z.cep_fim || '—'}</span>
              </div>
              <button onClick={() => toggleAtivo(z)}
                style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${z.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: z.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: z.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {z.ativo ? '● Ativo' : '○ Inativo'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--a-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--a-text2)' }}>{z.prazo_dias_uteis} dia{z.prazo_dias_uteis === 1 ? '' : 's'} útil{z.prazo_dias_uteis === 1 ? '' : 'eis'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => abrirEdicao(z)}
                  style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text2)', fontSize: 11, cursor: 'pointer' }}>
                  Editar
                </button>
                <button onClick={() => excluir(z)}
                  style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{editId ? 'Editar Zona' : 'Nova Zona'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>NOME</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: São Paulo Express" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>CEP INÍCIO</label>
                  <input value={form.cep_inicio} onChange={e => setForm(f => ({ ...f, cep_inicio: e.target.value }))}
                    placeholder="01000000" style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={lbl}>CEP FIM</label>
                  <input value={form.cep_fim} onChange={e => setForm(f => ({ ...f, cep_fim: e.target.value }))}
                    placeholder="05999999" style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0 }}>Deixe os dois em branco pra criar uma zona catch-all (ex: &quot;Restante do Brasil&quot;).</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>PRAZO (DIAS ÚTEIS)</label>
                  <input value={form.prazo_dias_uteis} onChange={e => setForm(f => ({ ...f, prazo_dias_uteis: e.target.value }))}
                    type="number" min="0" style={inp} />
                </div>
                <div>
                  <label style={lbl}>ORDEM</label>
                  <input value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))}
                    type="number" style={inp} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                Ativo
              </label>
              {err && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{err}</p>}
              <button onClick={salvar} disabled={saving || !form.nome || !form.prazo_dias_uteis}
                style={{ marginTop: 8, padding: '13px', background: (!form.nome || !form.prazo_dias_uteis) ? 'var(--a-border)' : '#A965ED', color: (!form.nome || !form.prazo_dias_uteis) ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Criar Zona'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
