'use client'
import { useState, useEffect } from 'react'

type Promo = {
  id: string
  nome: string
  tipo: 'desconto_pct' | 'desconto_fixo' | 'brinde' | 'frete_gratis'
  valor: number | null
  brinde_product_id: string | null
  condicoes: Record<string, unknown> | null
  prioridade: number
  ativo: boolean
  inicio: string | null
  fim: string | null
  usos_max: number | null
  usos_count: number
  created_at: string
}

type FormState = {
  id?: string
  nome: string
  tipo: 'desconto_pct' | 'desconto_fixo' | 'brinde' | 'frete_gratis'
  valor: string
  brinde_product_id: string
  condicoes: string
  prioridade: string
  ativo: boolean
  inicio: string
  fim: string
  usos_max: string
}

const empty: FormState = {
  nome: '', tipo: 'desconto_pct', valor: '', brinde_product_id: '',
  condicoes: '', prioridade: '0', ativo: true, inicio: '', fim: '', usos_max: ''
}

const TIPOS: { v: FormState['tipo']; label: string }[] = [
  { v: 'desconto_pct', label: 'Desconto %' },
  { v: 'desconto_fixo', label: 'Desconto Fixo (R$)' },
  { v: 'brinde', label: 'Brinde' },
  { v: 'frete_gratis', label: 'Frete Grátis' },
]

export default function Promocoes() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/admin/promocoes').then(r => r.json()).catch(() => [])
    setPromos(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const abrirNovo = () => { setForm(empty); setErr(''); setModal(true) }
  const abrirEdicao = (p: Promo) => {
    setForm({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      valor: p.valor != null ? String(p.valor) : '',
      brinde_product_id: p.brinde_product_id || '',
      condicoes: p.condicoes ? JSON.stringify(p.condicoes, null, 2) : '',
      prioridade: String(p.prioridade ?? 0),
      ativo: !!p.ativo,
      inicio: p.inicio ? p.inicio.slice(0, 16) : '',
      fim: p.fim ? p.fim.slice(0, 16) : '',
      usos_max: p.usos_max != null ? String(p.usos_max) : '',
    })
    setErr('')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) { setErr('Informe o nome'); return }
    setSaving(true)
    setErr('')
    let condicoes: Record<string, unknown> = {}
    if (form.condicoes.trim()) {
      try {
        const parsed = JSON.parse(form.condicoes)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) condicoes = parsed as Record<string, unknown>
        else throw new Error()
      } catch {
        setErr('Condições devem ser JSON válido (objeto)')
        setSaving(false)
        return
      }
    }
    const payload = {
      id: form.id,
      nome: form.nome.trim(),
      tipo: form.tipo,
      valor: form.valor === '' ? null : +form.valor,
      brinde_product_id: form.brinde_product_id || null,
      condicoes,
      prioridade: form.prioridade === '' ? 0 : +form.prioridade,
      ativo: form.ativo,
      inicio: form.inicio || null,
      fim: form.fim || null,
      usos_max: form.usos_max === '' ? null : +form.usos_max,
    }
    const method = form.id ? 'PATCH' : 'POST'
    const r = await fetch('/api/admin/promocoes', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(d.error || 'Erro ao salvar'); setSaving(false); return }
    setModal(false)
    setSaving(false)
    load()
  }

  const toggleAtivo = async (p: Promo) => {
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x))
    await fetch('/api/admin/promocoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, ativo: !p.ativo }),
    })
  }

  const excluir = async (p: Promo) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return
    setPromos(prev => prev.filter(x => x.id !== p.id))
    await fetch('/api/admin/promocoes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    })
  }

  const fmtValor = (p: Promo) => {
    if (p.tipo === 'desconto_pct') return p.valor != null ? `${p.valor}%` : '—'
    if (p.tipo === 'desconto_fixo') return p.valor != null ? `R$ ${Number(p.valor).toFixed(2)}` : '—'
    if (p.tipo === 'brinde') return p.brinde_product_id || 'Brinde'
    if (p.tipo === 'frete_gratis') return 'Frete Grátis'
    return '—'
  }

  const inp = {
    padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)',
    borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const lbl = { fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }

  return (
    <div className="promos-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .promos-page { padding: 16px !important; }
          .promos-table-wrap { display: none !important; }
          .promos-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Promoções</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{promos.length} promoções cadastradas</p>
        </div>
        <button onClick={abrirNovo}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          + Nova Promoção
        </button>
      </div>

      <div className="promos-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Nome', 'Tipo', 'Valor', 'Prioridade', 'Status', 'Usos', 'Período', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma promoção cadastrada</td></tr>
            ) : promos.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: 'var(--a-text)' }}>{p.nome}</td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text2)' }}>
                  {TIPOS.find(t => t.v === p.tipo)?.label || p.tipo}
                </td>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>{fmtValor(p)}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text2)' }}>{p.prioridade}</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => toggleAtivo(p)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${p.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: p.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: p.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer' }}>
                    {p.ativo ? '● Ativo' : '○ Inativo'}
                  </button>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text)' }}>
                  {p.usos_count}{p.usos_max ? ` / ${p.usos_max}` : ''}
                </td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)' }}>
                  {p.inicio ? new Date(p.inicio).toLocaleDateString('pt-BR') : '—'}
                  {' → '}
                  {p.fim ? new Date(p.fim).toLocaleDateString('pt-BR') : '∞'}
                </td>
                <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => abrirEdicao(p)}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--a-border)', borderRadius: 6, color: 'var(--a-text2)', fontSize: 11, cursor: 'pointer', marginRight: 6 }}>
                    Editar
                  </button>
                  <button onClick={() => excluir(p)}
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
      <div className="promos-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : promos.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma promoção cadastrada</div>
        ) : promos.map(p => (
          <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-text)', margin: 0 }}>{p.nome}</p>
                <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{TIPOS.find(t => t.v === p.tipo)?.label || p.tipo} · prioridade {p.prioridade}</span>
              </div>
              <button onClick={() => toggleAtivo(p)}
                style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${p.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: p.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: p.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {p.ativo ? '● Ativo' : '○ Inativo'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b' }}>{fmtValor(p)}</span>
              <span style={{ fontSize: 11, color: 'var(--a-text2)' }}>Usos: {p.usos_count}{p.usos_max ? ` / ${p.usos_max}` : ''}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '6px 0 0' }}>
              {p.inicio ? new Date(p.inicio).toLocaleDateString('pt-BR') : '—'} → {p.fim ? new Date(p.fim).toLocaleDateString('pt-BR') : '∞'}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--a-border)' }}>
              <button onClick={() => abrirEdicao(p)}
                style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text2)', cursor: 'pointer' }}>
                Editar
              </button>
              <button onClick={() => excluir(p)}
                style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 560, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{form.id ? 'Editar Promoção' : 'Nova Promoção'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>NOME</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} placeholder="ex: Desconto verão atacadista" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>TIPO</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as FormState['tipo'] }))}
                    style={{ ...inp, appearance: 'none' as never }}>
                    {TIPOS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>VALOR</label>
                  <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    type="number" step="0.01" placeholder={form.tipo === 'desconto_pct' ? '%' : 'R$'}
                    disabled={form.tipo === 'frete_gratis' || form.tipo === 'brinde'}
                    style={{ ...inp, opacity: (form.tipo === 'frete_gratis' || form.tipo === 'brinde') ? 0.5 : 1 }} />
                </div>
              </div>

              {form.tipo === 'brinde' && (
                <div>
                  <label style={lbl}>ID DO PRODUTO BRINDE</label>
                  <input value={form.brinde_product_id} onChange={e => setForm(f => ({ ...f, brinde_product_id: e.target.value }))}
                    placeholder="UUID ou SKU do produto"
                    style={inp} />
                </div>
              )}

              <div>
                <label style={lbl}>CONDIÇÕES (JSON)</label>
                <textarea value={form.condicoes} onChange={e => setForm(f => ({ ...f, condicoes: e.target.value }))}
                  rows={5}
                  placeholder={'{"categoria_id": "...", "marca": "...", "valor_min": 100, "qty_min": 5, "cliente_tag": "vip"}'}
                  style={{ ...inp, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' as const }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>PRIORIDADE</label>
                  <input value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                    type="number" style={inp} />
                </div>
                <div>
                  <label style={lbl}>MÁXIMO DE USOS</label>
                  <input value={form.usos_max} onChange={e => setForm(f => ({ ...f, usos_max: e.target.value }))}
                    type="number" min="1" placeholder="ilimitado" style={inp} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>INÍCIO</label>
                  <input value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))}
                    type="datetime-local" style={inp} />
                </div>
                <div>
                  <label style={lbl}>FIM</label>
                  <input value={form.fim} onChange={e => setForm(f => ({ ...f, fim: e.target.value }))}
                    type="datetime-local" style={inp} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                Ativo
              </label>

              {err && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{err}</p>}

              <button onClick={salvar} disabled={saving || !form.nome.trim()}
                style={{ marginTop: 8, padding: '13px', background: !form.nome.trim() ? 'var(--a-border)' : '#A965ED', color: !form.nome.trim() ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : form.id ? 'Salvar Alterações' : 'Criar Promoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
