'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

type Order = { id: string; order_num: string; total_brl: number; status: string; created_at: string }
type Rfm = { recencia_dias: number | null; frequencia: number; monetario: number; score: number; segmento: string }
type Customer = any

const CUSTOMER_TAGS = ['atacadista', 'vip', 'novo', 'inativo', 'bloqueado']
const CTAG_COLORS: Record<string, string> = {
  atacadista: '#3b82f6', vip: '#f59e0b', novo: '#A965ED', inativo: '#555', bloqueado: '#ef4444',
}

const AVATAR_COLORS = ['#A965ED', '#3b82f6', '#f59e0b', '#A965ED', '#ef4444', '#A965ED', '#ec4899', '#10b981']

const STATUS_COLOR: Record<string, string> = {
  pendente_pagamento: '#f59e0b', pago: '#3b82f6', pronto_retirada: '#A965ED', retirado: '#555', cancelado: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  pendente_pagamento: 'Aguardando PIX', pago: 'Pago', pronto_retirada: 'Pronto p/ Retirada', retirado: 'Retirado', cancelado: 'Cancelado',
}

const SEG_COLOR: Record<string, string> = {
  champion: '#A965ED', leal: '#3b82f6', potencial: '#A965ED', novo: '#f59e0b', em_risco: '#ec4899', perdido: '#888', sem_compra: '#666',
}
const SEG_LABEL: Record<string, string> = {
  champion: 'Campeão', leal: 'Leal', potencial: 'Potencial', novo: 'Novo', em_risco: 'Em risco', perdido: 'Perdido', sem_compra: 'Sem compra',
}
const SEG_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'champion', label: 'Campeão' },
  { key: 'leal', label: 'Leal' },
  { key: 'potencial', label: 'Potencial' },
  { key: 'novo', label: 'Novo' },
  { key: 'em_risco', label: 'Em risco' },
  { key: 'perdido', label: 'Perdido' },
  { key: 'sem_compra', label: 'Sem compra' },
  { key: 'bloqueado', label: 'Bloqueados' },
]

const TIMELINE_ICON: Record<string, string> = { pedido: '🛒', nota: '📝', audit: '⚙️', carrinho: '🛍️' }

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`
const fmtTel = (t: string) => t?.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3') || t
const fmtBytes = (b: number) => {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}
const fmtRelative = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  if (diff < 0) return new Date(iso).toLocaleDateString('pt-BR')
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const dy = Math.floor(h / 24)
  if (dy < 30) return `há ${dy} dia${dy > 1 ? 's' : ''}`
  const mo = Math.floor(dy / 30)
  if (mo < 12) return `há ${mo} ${mo > 1 ? 'meses' : 'mês'}`
  const yr = Math.floor(mo / 12)
  return `há ${yr} ano${yr > 1 ? 's' : ''}`
}

const inp = { width: '100%', padding: '10px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }
const lbl = { fontSize: 10, color: 'var(--a-text2)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 5 } as const

function getInitials(nome: string) {
  const parts = (nome || '').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function SegBadge({ rfm, outline }: { rfm: Rfm | null | undefined; outline?: boolean }) {
  const seg = rfm?.segmento || 'sem_compra'
  const color = SEG_COLOR[seg] || '#888'
  const label = SEG_LABEL[seg] || seg
  const tip = rfm ? `R: ${rfm.recencia_dias ?? '—'}d · F: ${rfm.frequencia} · M: ${fmt(rfm.monetario || 0)} · score ${rfm.score}` : 'Sem compras registradas'
  const isOutline = outline || seg === 'sem_compra'
  return (
    <span title={tip} style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700,
      color: isOutline ? color : color,
      background: isOutline ? 'transparent' : `${color}18`,
      padding: '3px 8px', borderRadius: 99,
      border: `1px solid ${color}${isOutline ? '55' : '40'}`,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

export default function Clientes() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [segFilter, setSegFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [editing, setEditing] = useState<Partial<Customer> | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'overview' | 'notes' | 'docs' | 'timeline' | 'attrs'>('overview')

  const [channels, setChannels] = useState<any[]>([])
  const [fieldDefs, setFieldDefs] = useState<any[]>([])

  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [newNotePin, setNewNotePin] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const [docs, setDocs] = useState<any[]>([])
  const [uploadName, setUploadName] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const [timeline, setTimeline] = useState<any[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/clientes-list?perPage=200').then(r => r.json()).catch(() => ({}))
    const rows = r?.rows || r?.data || []
    setCustomers(rows)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/admin/sales-channels').then(r => r.json()).then((d: any) => setChannels(Array.isArray(d) ? d : (d?.rows || []))).catch(() => setChannels([]))
    fetch('/api/admin/custom-fields?entity=customers').then(r => r.json()).then((d: any) => setFieldDefs(Array.isArray(d) ? d : (d?.rows || []))).catch(() => setFieldDefs([]))
  }, [])

  const patchCustomer = async (id: string, body: any) => {
    await fetch(`/api/admin/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const toggleTag = async (id: string, tag: string, current: string[]) => {
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    setCustomers((prev: any[]) => prev.map(c => c.id === id ? { ...c, tags: next } : c))
    setSelected((prev: any) => prev ? { ...prev, tags: next } : null)
    await patchCustomer(id, { tags: next })
  }

  const saveEdit = async () => {
    if (!selected || !editing) return
    setSaving(true)
    await patchCustomer(selected.id, editing)
    setCustomers((prev: any[]) => prev.map(c => c.id === selected.id ? { ...c, ...editing } : c))
    setSelected((prev: any) => prev ? { ...prev, ...editing } : null)
    setEditing(null)
    setSaving(false)
  }

  const toggleBloqueio = async (val: boolean) => {
    if (!selected) return
    const body: any = val
      ? { bloqueado: true, bloqueio_motivo: selected.bloqueio_motivo || '', bloqueado_em: new Date().toISOString(), bloqueado_por: 'admin' }
      : { bloqueado: false, bloqueio_motivo: null, bloqueado_em: null, bloqueado_por: null }
    await patchCustomer(selected.id, body)
    setCustomers((prev: any[]) => prev.map(c => c.id === selected.id ? { ...c, ...body } : c))
    setSelected((prev: any) => prev ? { ...prev, ...body } : null)
  }

  const saveBloqueioMotivo = async (motivo: string) => {
    if (!selected) return
    setSelected((prev: any) => prev ? { ...prev, bloqueio_motivo: motivo } : null)
    await patchCustomer(selected.id, { bloqueio_motivo: motivo })
    setCustomers((prev: any[]) => prev.map(c => c.id === selected.id ? { ...c, bloqueio_motivo: motivo } : c))
  }

  const saveChannel = async (channelId: string | null) => {
    if (!selected) return
    await patchCustomer(selected.id, { sales_channel_id: channelId })
    setCustomers((prev: any[]) => prev.map(c => c.id === selected.id ? { ...c, sales_channel_id: channelId } : c))
    setSelected((prev: any) => prev ? { ...prev, sales_channel_id: channelId } : null)
  }

  const saveScalar = async (key: string, value: any) => {
    if (!selected) return
    await patchCustomer(selected.id, { [key]: value })
    setCustomers((prev: any[]) => prev.map(c => c.id === selected.id ? { ...c, [key]: value } : c))
    setSelected((prev: any) => prev ? { ...prev, [key]: value } : null)
  }

  const saveCustomField = async (key: string, value: any) => {
    if (!selected) return
    const next = { ...(selected.custom_fields || {}), [key]: value }
    await patchCustomer(selected.id, { custom_fields: next })
    setCustomers((prev: any[]) => prev.map(c => c.id === selected.id ? { ...c, custom_fields: next } : c))
    setSelected((prev: any) => prev ? { ...prev, custom_fields: next } : null)
  }

  const loadNotes = async (id: string) => {
    const r = await fetch(`/api/admin/clientes/${id}/notas`).then(r => r.json()).catch(() => ({}))
    setNotes(r?.rows || r?.data || (Array.isArray(r) ? r : []))
  }
  const addNote = async () => {
    if (!selected || !newNote.trim()) return
    setSavingNote(true)
    await fetch(`/api/admin/clientes/${selected.id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: newNote, pinned: newNotePin }),
    })
    setNewNote(''); setNewNotePin(false)
    await loadNotes(selected.id)
    setSavingNote(false)
  }
  const togglePin = async (noteId: string, pinned: boolean) => {
    if (!selected) return
    await fetch(`/api/admin/clientes/${selected.id}/notas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, pinned }),
    })
    loadNotes(selected.id)
  }
  const deleteNote = async (noteId: string) => {
    if (!selected) return
    if (!confirm('Excluir esta nota?')) return
    await fetch(`/api/admin/clientes/${selected.id}/notas`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    loadNotes(selected.id)
  }

  const loadDocs = async (id: string) => {
    const r = await fetch(`/api/admin/clientes/${id}/documentos`).then(r => r.json()).catch(() => ({}))
    setDocs(r?.rows || r?.data || (Array.isArray(r) ? r : []))
  }
  const uploadDoc = async () => {
    if (!selected) return
    const f = fileRef.current?.files?.[0]
    if (!f) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', f)
    fd.append('nome', uploadName || f.name)
    await fetch(`/api/admin/clientes/${selected.id}/documentos`, { method: 'POST', body: fd })
    if (fileRef.current) fileRef.current.value = ''
    setUploadName('')
    await loadDocs(selected.id)
    setUploading(false)
  }
  const deleteDoc = async (docId: string) => {
    if (!selected) return
    if (!confirm('Excluir este documento?')) return
    await fetch(`/api/admin/clientes/${selected.id}/documentos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId }),
    })
    loadDocs(selected.id)
  }

  const loadTimeline = async (id: string) => {
    setLoadingTimeline(true)
    const r = await fetch(`/api/admin/clientes/${id}/timeline`).then(r => r.json()).catch(() => ({}))
    setTimeline(r?.events || [])
    setLoadingTimeline(false)
  }

  useEffect(() => {
    if (!selected) return
    if (tab === 'notes') loadNotes(selected.id)
    if (tab === 'docs') loadDocs(selected.id)
    if (tab === 'timeline') loadTimeline(selected.id)
  }, [tab, selected?.id])

  const closeModal = () => {
    setSelected(null); setEditing(null); setTab('overview')
    setNotes([]); setDocs([]); setTimeline([])
  }

  const previewImport = async () => {
    if (!importFile) return
    setImporting(true); setImportPreview(null); setImportResult(null)
    const fd = new FormData()
    fd.append('file', importFile)
    const r = await fetch('/api/admin/clientes/import?mode=preview', { method: 'POST', body: fd }).then(r => r.json()).catch(() => ({ error: 'falha' }))
    setImportPreview(r)
    setImporting(false)
  }
  const commitImport = async () => {
    if (!importFile) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', importFile)
    const r = await fetch('/api/admin/clientes/import?mode=commit', { method: 'POST', body: fd }).then(r => r.json()).catch(() => ({ error: 'falha' }))
    setImportResult(r)
    setImporting(false)
    if (r?.ok) load()
  }

  const filtered = customers.filter(c => {
    if (segFilter === 'bloqueado') {
      if (!c.bloqueado) return false
    } else if (segFilter !== 'all') {
      if ((c.rfm?.segmento || 'sem_compra') !== segFilter) return false
    }
    if (!search) return true
    const s = search.toLowerCase()
    return c.nome?.toLowerCase().includes(s) || c.cpf?.includes(s) || c.telefone?.includes(s) || c.email?.toLowerCase().includes(s) || c.cnpj?.includes(s) || c.razao_social?.toLowerCase().includes(s)
  })

  return (
    <div className="clientes-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .clientes-page { padding: 16px !important; }
          .clientes-table-wrap { display: none !important; }
          .clientes-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Clientes</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{customers.length} cadastrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, CPF, CNPJ, email..."
            style={{ padding: '9px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, width: 280, outline: 'none' }} />
          <a href="/api/admin/clientes/export" download
            style={{ padding: '9px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text2)', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ↓ Exportar CSV
          </a>
          <button onClick={() => { setImportOpen(true); setImportPreview(null); setImportResult(null); setImportFile(null) }}
            style={{ padding: '9px 14px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            ↑ Importar CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {SEG_FILTERS.map(f => {
          const active = segFilter === f.key
          const color = f.key === 'bloqueado' ? '#ef4444' : (f.key === 'all' ? '#888' : SEG_COLOR[f.key] || '#888')
          return (
            <button key={f.key} onClick={() => setSegFilter(f.key)}
              style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 99,
                border: `1px solid ${active ? color : 'var(--a-border)'}`,
                background: active ? `${color}18` : 'transparent',
                color: active ? color : 'var(--a-text3)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="clientes-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Cliente', 'Contato', 'Cidade', 'Segmento RFM', 'Pedidos', 'Total gasto', 'Cadastro'].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum cliente encontrado</td></tr>
            ) : filtered.map((c: any) => {
              const color = getAvatarColor(c.id)
              const totalGasto = (c.orders || []).filter((o: Order) => ['pago', 'pronto_retirada', 'retirado'].includes(o.status)).reduce((s: number, o: Order) => s + o.total_brl, 0)
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--a-border)', cursor: 'pointer', opacity: c.bloqueado ? 0.6 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-row-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setSelected(c); setEditing(null); setTab('overview') }}>
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}22`, border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color }}>{getInitials(c.nome)}</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {c.bloqueado && <span title={c.bloqueio_motivo || 'Bloqueado'} style={{ fontSize: 13 }}>🚫</span>}
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', margin: 0 }}>{c.nome}</p>
                          {(c.tags || []).map((tag: string) => (
                            <span key={tag} style={{ fontSize: 9, fontWeight: 700, color: CTAG_COLORS[tag] || '#888', background: `${CTAG_COLORS[tag] || '#888'}15`, padding: '2px 6px', borderRadius: 99, border: `1px solid ${CTAG_COLORS[tag] || '#888'}30` }}>{tag}</span>
                          ))}
                        </div>
                        {c.cpf && <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0, fontFamily: 'monospace' }}>{c.cpf}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <p style={{ fontSize: 12, color: 'var(--a-text2)', margin: 0 }}>{fmtTel(c.telefone) || '—'}</p>
                    <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0 }}>{c.email || '—'}</p>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text2)' }}>
                    {c.cidade && c.uf ? `${c.cidade}/${c.uf}` : '—'}
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <SegBadge rfm={c.rfm} />
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: (c.orders || []).length > 0 ? '#A965ED' : 'var(--a-text3)' }}>
                      {(c.orders || []).length}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: totalGasto > 0 ? 700 : 400, color: totalGasto > 0 ? 'var(--a-text)' : 'var(--a-text3)' }}>
                    {totalGasto > 0 ? fmt(totalGasto) : '—'}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)' }}>
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="clientes-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum cliente encontrado</div>
        ) : filtered.map((c: any) => {
          const color = getAvatarColor(c.id)
          const totalGasto = (c.orders || []).filter((o: Order) => ['pago', 'pronto_retirada', 'retirado'].includes(o.status)).reduce((s: number, o: Order) => s + o.total_brl, 0)
          return (
            <div key={c.id} onClick={() => { setSelected(c); setEditing(null); setTab('overview') }}
              style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)', cursor: 'pointer', opacity: c.bloqueado ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}22`, border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color }}>{getInitials(c.nome)}</span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {c.bloqueado && <span title={c.bloqueio_motivo || 'Bloqueado'} style={{ fontSize: 13 }}>🚫</span>}
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                  </div>
                  {c.cpf && <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0, fontFamily: 'monospace' }}>{c.cpf}</p>}
                </div>
                <SegBadge rfm={c.rfm} />
              </div>
              {(c.tags || []).length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {(c.tags || []).map((tag: string) => (
                    <span key={tag} style={{ fontSize: 9, fontWeight: 700, color: CTAG_COLORS[tag] || '#888', background: `${CTAG_COLORS[tag] || '#888'}15`, padding: '2px 6px', borderRadius: 99, border: `1px solid ${CTAG_COLORS[tag] || '#888'}30` }}>{tag}</span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--a-text2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtTel(c.telefone) || '—'}</p>
                <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || '—'}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>
                  {c.cidade && c.uf ? `${c.cidade}/${c.uf}` : '—'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: (c.orders || []).length > 0 ? '#A965ED' : 'var(--a-text3)' }}>
                  {(c.orders || []).length} pedido{(c.orders || []).length === 1 ? '' : 's'}
                </span>
                <span style={{ fontSize: 13, fontWeight: totalGasto > 0 ? 700 : 400, color: totalGasto > 0 ? 'var(--a-text)' : 'var(--a-text3)' }}>
                  {totalGasto > 0 ? fmt(totalGasto) : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (() => {
        const color = getAvatarColor(selected.id)
        const totalPedidos = (selected.orders || []).length
        const pedidosPagos = (selected.orders || []).filter((o: Order) => ['pago', 'pronto_retirada', 'retirado'].includes(o.status)).length
        const totalGasto = (selected.orders || []).filter((o: Order) => ['pago', 'pronto_retirada', 'retirado'].includes(o.status)).reduce((s: number, o: Order) => s + o.total_brl, 0)
        const rfm: Rfm | null = selected.rfm || null
        const segLabel = SEG_LABEL[rfm?.segmento || 'sem_compra'] || '—'

        const tabs: { key: typeof tab; label: string }[] = [
          { key: 'overview', label: 'Visão geral' },
          { key: 'notes', label: 'Notas' },
          { key: 'docs', label: 'Documentos' },
          { key: 'timeline', label: 'Timeline' },
          { key: 'attrs', label: 'Atributos' },
        ]

        return (
          <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color }}>{getInitials(selected.nome)}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {selected.bloqueado && <span style={{ fontSize: 16 }}>🚫</span>}
                      <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{selected.nome}</h2>
                      <SegBadge rfm={rfm} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--a-text3)', marginTop: 2, margin: 0 }}>Cliente desde {new Date(selected.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {editing ? (
                    <>
                      <button onClick={saveEdit} disabled={saving}
                        style={{ padding: '7px 16px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: saving ? 'wait' : 'pointer' }}>
                        {saving ? 'Salvando...' : '✓ Salvar'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        style={{ padding: '7px 14px', background: 'transparent', color: 'var(--a-text2)', border: '1px solid var(--a-border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditing({
                      nome: selected.nome, cpf: selected.cpf, telefone: selected.telefone, email: selected.email, cidade: selected.cidade, uf: selected.uf,
                      razao_social: selected.razao_social, cnpj: selected.cnpj, ie: selected.ie,
                    } as any)}
                      style={{ padding: '7px 16px', background: 'transparent', color: 'var(--a-text2)', border: '1px solid var(--a-border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                      Editar
                    </button>
                  )}
                  <button onClick={closeModal}
                    style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--a-border)', marginBottom: 20, overflowX: 'auto' }}>
                {tabs.map(t => {
                  const active = tab === t.key
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      style={{
                        padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                        borderBottom: `2px solid ${active ? '#A965ED' : 'transparent'}`,
                        color: active ? 'var(--a-text)' : 'var(--a-text3)',
                        fontWeight: active ? 800 : 600, fontSize: 12, whiteSpace: 'nowrap',
                      }}>
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {tab === 'overview' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                    {[
                      { label: 'Total Pedidos', value: totalPedidos, color: 'var(--a-text)', sub: '' },
                      { label: 'Pedidos Pagos', value: pedidosPagos, color: '#A965ED', sub: '' },
                      { label: 'Total Gasto', value: totalGasto > 0 ? fmt(totalGasto) : '—', color: totalGasto > 0 ? '#A965ED' : 'var(--a-text3)', sub: '' },
                      { label: 'Score RFM', value: rfm?.score ?? '—', color: SEG_COLOR[rfm?.segmento || 'sem_compra'] || 'var(--a-text)', sub: segLabel },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--a-border)' }}>
                        <p style={{ fontSize: 9, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{s.label.toUpperCase()}</p>
                        <p style={{ fontSize: 18, fontWeight: 900, color: s.color, margin: 0 }}>{s.value as any}</p>
                        {s.sub && <p style={{ fontSize: 10, color: 'var(--a-text3)', margin: 0, marginTop: 4 }}>{s.sub}</p>}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>TAGS</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {CUSTOMER_TAGS.map(tag => {
                        const active = (selected.tags || []).includes(tag)
                        const c = CTAG_COLORS[tag] || '#888'
                        return (
                          <button key={tag} onClick={() => toggleTag(selected.id, tag, selected.tags || [])}
                            style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${active ? c : 'var(--a-border)'}`, background: active ? `${c}18` : 'transparent', color: active ? c : 'var(--a-text3)', cursor: 'pointer', transition: 'all 0.15s' }}>
                            {active ? '✓ ' : ''}{tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, marginBottom: 16, border: `1px solid ${selected.bloqueado ? '#ef444455' : 'var(--a-border)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selected.bloqueado ? 12 : 0 }}>
                      <div>
                        <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, margin: 0 }}>BLOQUEIO</p>
                        <p style={{ fontSize: 13, color: selected.bloqueado ? '#ef4444' : 'var(--a-text3)', margin: 0, marginTop: 4 }}>
                          {selected.bloqueado ? 'Cliente bloqueado' : 'Cliente ativo'}
                        </p>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!selected.bloqueado} onChange={e => toggleBloqueio(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{
                          position: 'absolute', inset: 0, borderRadius: 99,
                          background: selected.bloqueado ? '#ef4444' : 'var(--a-border)', transition: '0.2s',
                        }}>
                          <span style={{
                            position: 'absolute', top: 3, left: selected.bloqueado ? 23 : 3,
                            width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '0.2s',
                          }} />
                        </span>
                      </label>
                    </div>
                    {selected.bloqueado && (
                      <>
                        <label style={lbl}>MOTIVO</label>
                        <input value={selected.bloqueio_motivo || ''} onChange={e => setSelected({ ...selected, bloqueio_motivo: e.target.value })} onBlur={e => saveBloqueioMotivo(e.target.value)} style={inp} placeholder="Motivo do bloqueio..." />
                        {(selected.bloqueado_em || selected.bloqueado_por) && (
                          <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 8, margin: 0 }}>
                            {selected.bloqueado_em && <>Em {new Date(selected.bloqueado_em).toLocaleString('pt-BR')}</>}
                            {selected.bloqueado_por && <> por {selected.bloqueado_por}</>}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--a-border)' }}>
                    <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>DADOS CADASTRAIS (PF)</p>
                    {editing ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {([['nome', 'Nome completo'], ['cpf', 'CPF'], ['telefone', 'WhatsApp'], ['email', 'E-mail'], ['cidade', 'Cidade'], ['uf', 'UF']] as [string, string][]).map(([k, label]) => (
                          <div key={k}>
                            <label style={lbl}>{label.toUpperCase()}</label>
                            <input value={(editing as any)[k] || ''} onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))} style={inp} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[['Nome', selected.nome], ['CPF', selected.cpf], ['WhatsApp', fmtTel(selected.telefone)], ['E-mail', selected.email], ['Cidade', selected.cidade], ['UF', selected.uf]].map(([k, v]) => (
                          <div key={k}>
                            <p style={{ fontSize: 9, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>{k}</p>
                            <p style={{ fontSize: 13, color: 'var(--a-text)', margin: 0 }}>{v || '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--a-border)' }}>
                    <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>DADOS PJ</p>
                    <p style={{ fontSize: 10, color: 'var(--a-text3)', margin: 0, marginBottom: 14 }}>(preencha se for PJ)</p>
                    {editing ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {([['razao_social', 'Razão social'], ['cnpj', 'CNPJ'], ['ie', 'IE']] as [string, string][]).map(([k, label]) => (
                          <div key={k}>
                            <label style={lbl}>{label.toUpperCase()}</label>
                            <input value={(editing as any)[k] || ''} onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))} style={inp} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[['Razão social', selected.razao_social], ['CNPJ', selected.cnpj], ['IE', selected.ie]].map(([k, v]) => (
                          <div key={k}>
                            <p style={{ fontSize: 9, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>{k}</p>
                            <p style={{ fontSize: 13, color: 'var(--a-text)', margin: 0 }}>{v || '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--a-border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>SALES CHANNEL</label>
                      <select value={selected.sales_channel_id || ''} onChange={e => saveChannel(e.target.value || null)} style={inp as any}>
                        <option value="">Padrão (todos)</option>
                        {channels.filter((c: any) => c.ativo !== false).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>ORIGEM</label>
                      <input value={selected.origem || ''} onChange={e => setSelected({ ...selected, origem: e.target.value })} onBlur={e => saveScalar('origem', e.target.value || null)} style={inp} placeholder="Indicação, Instagram..." />
                    </div>
                    <div>
                      <label style={lbl}>ANIVERSÁRIO</label>
                      <input type="date" value={selected.aniversario || ''} onChange={e => saveScalar('aniversario', e.target.value || null)} style={inp} />
                    </div>
                  </div>

                  {(selected.orders || []).length > 0 && (
                    <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, border: '1px solid var(--a-border)' }}>
                      <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 12 }}>PEDIDOS ({selected.orders.length})</p>
                      {selected.orders.map((o: Order) => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--a-border)' }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#A965ED', marginRight: 12 }}>{o.order_num}</span>
                            <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[o.status] || '#888', background: `${STATUS_COLOR[o.status] || '#888'}18`, padding: '3px 8px', borderRadius: 4, border: `1px solid ${STATUS_COLOR[o.status] || '#888'}30` }}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)' }}>{fmt(o.total_brl)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'notes' && (
                <>
                  <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, marginBottom: 14, border: '1px solid var(--a-border)' }}>
                    <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>NOVA NOTA</p>
                    <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Escreva uma nota interna..." rows={3}
                      style={{ ...inp, fontFamily: 'inherit', resize: 'vertical' as const }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a-text2)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={newNotePin} onChange={e => setNewNotePin(e.target.checked)} />
                        Fixar no topo
                      </label>
                      <button onClick={addNote} disabled={savingNote || !newNote.trim()}
                        style={{ padding: '7px 16px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: savingNote ? 'wait' : 'pointer', opacity: !newNote.trim() ? 0.5 : 1 }}>
                        {savingNote ? 'Salvando...' : 'Adicionar'}
                      </button>
                    </div>
                  </div>

                  {notes.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma nota ainda.</div>
                  ) : (
                    [...notes].sort((a: any, b: any) => (Number(b.pinned) - Number(a.pinned)) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())).map((n: any) => (
                      <div key={n.id} style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 14, marginBottom: 10, border: `1px solid ${n.pinned ? '#f59e0b55' : 'var(--a-border)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {n.pinned && <span title="Fixada" style={{ fontSize: 12 }}>📌</span>}
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-text)' }}>{n.autor || 'admin'}</span>
                            <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>· {fmtRelative(n.created_at)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => togglePin(n.id, !n.pinned)} title={n.pinned ? 'Desafixar' : 'Fixar'}
                              style={{ background: 'transparent', border: '1px solid var(--a-border)', color: 'var(--a-text2)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                              {n.pinned ? 'Desafixar' : 'Fixar'}
                            </button>
                            <button onClick={() => deleteNote(n.id)} title="Excluir"
                              style={{ background: 'transparent', border: '1px solid #ef444455', color: '#ef4444', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--a-text)', margin: 0, whiteSpace: 'pre-wrap' }}>{n.texto}</p>
                      </div>
                    ))
                  )}
                </>
              )}

              {tab === 'docs' && (
                <>
                  <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, marginBottom: 14, border: '1px solid var(--a-border)' }}>
                    <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>ENVIAR DOCUMENTO</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <input type="file" ref={fileRef} onChange={e => { const f = e.target.files?.[0]; if (f && !uploadName) setUploadName(f.name) }}
                        style={{ ...inp, padding: 8 }} />
                      <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Nome do documento" style={inp} />
                    </div>
                    <button onClick={uploadDoc} disabled={uploading}
                      style={{ padding: '7px 16px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: uploading ? 'wait' : 'pointer' }}>
                      {uploading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>

                  {docs.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum documento ainda.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {docs.map((d: any) => (
                        <div key={d.id} style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 14, border: '1px solid var(--a-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)', margin: 0, wordBreak: 'break-word' }}>{d.nome}</p>
                            <button onClick={() => deleteDoc(d.id)}
                              style={{ background: 'transparent', border: '1px solid #ef444455', color: '#ef4444', borderRadius: 6, padding: '2px 7px', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0 }}>{fmtBytes(d.tamanho)} · {fmtRelative(d.created_at)}</p>
                          {d.uploaded_by && <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0 }}>por {d.uploaded_by}</p>}
                          <a href={d.url} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: '#A965ED', textDecoration: 'none' }}>
                            Abrir →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'timeline' && (
                <>
                  {loadingTimeline ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Carregando...</div>
                  ) : timeline.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum evento na timeline.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {timeline.map((ev: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 12, background: 'var(--a-bg)', borderRadius: 10, padding: 12, border: '1px solid var(--a-border)' }}>
                          <div style={{ fontSize: 18, lineHeight: 1, paddingTop: 2 }}>{TIMELINE_ICON[ev.tipo] || '•'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)', margin: 0 }}>{ev.titulo}</p>
                              <span style={{ fontSize: 11, color: 'var(--a-text3)', whiteSpace: 'nowrap' }}>{fmtRelative(ev.data)}</span>
                            </div>
                            {ev.detalhe && <p style={{ fontSize: 12, color: 'var(--a-text2)', margin: 0 }}>{ev.detalhe}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'attrs' && (
                <>
                  {fieldDefs.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>
                      Nenhum atributo customizado definido para clientes.
                    </div>
                  ) : (
                    <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 16, border: '1px solid var(--a-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {[...fieldDefs].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((def: any) => {
                        const val = selected.custom_fields?.[def.field_key]
                        const t = def.field_type
                        const labelEl = (
                          <label style={lbl}>
                            {def.label}{def.required && <span style={{ color: '#ef4444' }}> *</span>}
                          </label>
                        )
                        if (t === 'boolean') {
                          return (
                            <div key={def.id}>
                              {labelEl}
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-text)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={!!val} onChange={e => saveCustomField(def.field_key, e.target.checked)} />
                                {val ? 'Sim' : 'Não'}
                              </label>
                            </div>
                          )
                        }
                        if (t === 'select') {
                          const opts: string[] = Array.isArray(def.options) ? def.options : (def.options?.values || [])
                          return (
                            <div key={def.id}>
                              {labelEl}
                              <select value={val || ''} onChange={e => saveCustomField(def.field_key, e.target.value || null)} style={inp as any}>
                                <option value="">—</option>
                                {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          )
                        }
                        if (t === 'number') {
                          return (
                            <div key={def.id}>
                              {labelEl}
                              <input type="number" defaultValue={val ?? ''} onBlur={e => saveCustomField(def.field_key, e.target.value === '' ? null : Number(e.target.value))} style={inp} />
                            </div>
                          )
                        }
                        if (t === 'date') {
                          return (
                            <div key={def.id}>
                              {labelEl}
                              <input type="date" value={val || ''} onChange={e => saveCustomField(def.field_key, e.target.value || null)} style={inp} />
                            </div>
                          )
                        }
                        return (
                          <div key={def.id}>
                            {labelEl}
                            <input defaultValue={val ?? ''} onBlur={e => saveCustomField(def.field_key, e.target.value || null)} style={inp} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}

      {importOpen && (
        <div onClick={() => setImportOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, width: '100%', maxWidth: 560, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Importar Clientes (CSV)</h2>
              <button onClick={() => setImportOpen(false)}
                style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>ARQUIVO CSV</label>
              <input type="file" accept=".csv,text/csv" onChange={e => { setImportFile(e.target.files?.[0] || null); setImportPreview(null); setImportResult(null) }}
                style={{ ...inp, padding: 8 }} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={previewImport} disabled={!importFile || importing}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--a-border)', color: 'var(--a-text)', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: importing ? 'wait' : 'pointer', opacity: !importFile ? 0.5 : 1 }}>
                Pré-visualizar
              </button>
              <button onClick={commitImport} disabled={!importPreview || !!importPreview?.error || importing || (importPreview?.errors?.length > 0 && importPreview?.valid === 0)}
                style={{ padding: '8px 16px', background: '#A965ED', border: 'none', color: '#000', borderRadius: 7, fontSize: 12, fontWeight: 800, cursor: importing ? 'wait' : 'pointer', opacity: !importPreview ? 0.5 : 1 }}>
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>

            {importPreview && (
              <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 14, border: '1px solid var(--a-border)', marginBottom: 12 }}>
                <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>PRÉ-VISUALIZAÇÃO</p>
                {importPreview.error ? (
                  <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>Erro: {String(importPreview.error)}</p>
                ) : (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--a-text2)', margin: 0 }}>
                      Total: <b style={{ color: 'var(--a-text)' }}>{importPreview.total}</b> ·
                      Válidos: <b style={{ color: '#A965ED' }}>{importPreview.valid}</b> ·
                      Erros: <b style={{ color: importPreview.errors?.length ? '#ef4444' : 'var(--a-text3)' }}>{importPreview.errors?.length || 0}</b>
                    </p>
                    {importPreview.errors?.length > 0 && (
                      <div style={{ marginTop: 10, maxHeight: 120, overflow: 'auto' }}>
                        {importPreview.errors.slice(0, 20).map((er: any, i: number) => (
                          <p key={i} style={{ fontSize: 11, color: '#ef4444', margin: '2px 0' }}>
                            Linha {er.line || er.row || '?'}: {er.message || er.error || JSON.stringify(er)}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {importResult && (
              <div style={{ background: 'var(--a-bg)', borderRadius: 10, padding: 14, border: `1px solid ${importResult.ok ? '#A965ED55' : '#ef444455'}` }}>
                <p style={{ fontSize: 10, color: 'var(--a-text3)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>RESULTADO</p>
                {importResult.ok ? (
                  <p style={{ fontSize: 13, color: '#A965ED', margin: 0 }}>
                    {importResult.inserted} cliente(s) importado(s) com sucesso.
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>Falha na importação.</p>
                )}
                {importResult.errors?.length > 0 && (
                  <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto' }}>
                    {importResult.errors.slice(0, 20).map((er: any, i: number) => (
                      <p key={i} style={{ fontSize: 11, color: '#ef4444', margin: '2px 0' }}>
                        Linha {er.line || er.row || '?'}: {er.message || er.error || JSON.stringify(er)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
