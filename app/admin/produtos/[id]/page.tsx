'use client'
import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Product = {
  id: string; name: string; titulo: string; descricao: string; brand: string; categoria_id: string
  usd_price: number; usd_price_promo: number | null; usd_price_qty: number | null; qty_min: number | null; custo: number | null
  img_url: string; imagens: string[]; video_url: string
  ativo: boolean; sort_order: number; estoque: number | null; sku: string
  peso: number | null; largura: number | null; altura: number | null; comprimento: number | null
  slug: string; meta_titulo: string; meta_descricao: string
  unidade_venda: string | null; multiplicador: number | null; venda_minima: number | null
  descricao_curta: string | null; badges: string[] | null; published_at: string | null
  sales_channel_ids: string[] | null; custom_fields: Record<string, unknown> | null
}
type Marca = { id: string; nome: string }
type Categoria = { id: string; nome: string; parent_id: string | null }
type Variant = { id: string; atributos: { nome: string; valor: string }[]; preco_adicional: number; estoque: number | null; sku: string }
type Log = { id: string; admin_email: string; campos_alterados: Record<string, { antes: unknown; depois: unknown }>; created_at: string }
type SalesChannel = { id: string; slug: string; nome: string; ativo: boolean }
type CustomFieldDef = { id: string; field_key: string; label: string; field_type: 'text' | 'number' | 'boolean' | 'date' | 'select'; options: string[] | null; required: boolean; ordem: number; categoria_id: string | null }
type Tier = { qty_min: string; qty_max: string; usd_price: string }
type RelTipo = 'compre_junto' | 'similares' | 'acessorios' | 'upsell'
type Relacionado = {
  related_product_id: string; tipo: RelTipo; ordem: number
  products?: { id: string; name: string; titulo: string | null; img_url: string | null; usd_price: number | null; ativo: boolean }
}
type ProdutoLista = { id: string; name: string; titulo: string | null; img_url: string | null; usd_price: number | null; ativo: boolean }

const TABS = [
  { key: 'basico', label: 'Básico' },
  { key: 'precos', label: 'Preços' },
  { key: 'midia', label: 'Mídia' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'variacoes', label: 'Variações' },
  { key: 'atributos', label: 'Atributos' },
  { key: 'relacionados', label: 'Relacionados' },
  { key: 'canais', label: 'Canais' },
  { key: 'seo', label: 'SEO' },
  { key: 'historico', label: 'Histórico' },
] as const
type Tab = typeof TABS[number]['key']

const REL_TIPOS: { key: RelTipo; label: string }[] = [
  { key: 'compre_junto', label: 'Compre Junto' },
  { key: 'similares', label: 'Similares' },
  { key: 'acessorios', label: 'Acessórios' },
  { key: 'upsell', label: 'Upsell' },
]

const BADGE_SUGGESTIONS = ['Novo', 'Mais Vendido', 'Promoção', 'Lançamento', 'Esgotando']

const IS: React.CSSProperties = { width: '100%', padding: '10px 13px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 10, color: 'var(--a-text2)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }
const card: React.CSSProperties = { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 22 }
const sec = (color = 'var(--a-text2)'): React.CSSProperties => ({ fontSize: 10, fontWeight: 800, color, letterSpacing: '0.1em', margin: '0 0 16px' })

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome interno', titulo: 'Título', descricao: 'Descrição', brand: 'Marca', categoria_id: 'Categoria',
  usd_price: 'Preço', usd_price_promo: 'Preço Promo', usd_price_qty: 'Preço por Qtd',
  qty_min: 'Qtd Mínima', custo: 'Custo', estoque: 'Estoque', sku: 'SKU',
  peso: 'Peso', largura: 'Largura', altura: 'Altura', comprimento: 'Comprimento',
  slug: 'Slug', meta_titulo: 'Meta Título', meta_descricao: 'Meta Descrição',
  ativo: 'Status', imagens: 'Imagens', video_url: 'Vídeo',
  unidade_venda: 'Unidade de venda', multiplicador: 'Multiplicador', venda_minima: 'Venda mínima',
  descricao_curta: 'Descrição curta', badges: 'Badges', published_at: 'Publicação',
  sales_channel_ids: 'Canais de venda', custom_fields: 'Atributos',
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function fmtLogVal(campo: string, v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (campo === 'ativo') return v ? 'Ativo' : 'Inativo'
  if (campo.startsWith('usd_') || campo === 'custo') return `USD ${Number(v).toFixed(2)}`
  if (Array.isArray(v)) return `${v.length} item(ns)`
  if (campo === 'custom_fields' && typeof v === 'object') return `${Object.keys(v as object).length} campo(s)`
  return String(v)
}

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function MdToolbar({ onInsert }: { onInsert: (before: string, after?: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
      {[
        { label: 'B', title: 'Negrito', b: '**', a: '**' },
        { label: 'I', title: 'Itálico', b: '*', a: '*' },
        { label: '• Lista', title: 'Lista', b: '\n- ', a: '' },
        { label: '1. Lista', title: 'Lista numerada', b: '\n1. ', a: '' },
        { label: 'H2', title: 'Subtítulo', b: '\n## ', a: '' },
      ].map(({ label, title, b, a }) => (
        <button key={label} type="button" title={title} onClick={() => onInsert(b, a)}
          style={{ padding: '4px 10px', fontSize: 11, fontWeight: label === 'B' ? 900 : label === 'I' ? 400 : 700, fontStyle: label === 'I' ? 'italic' : 'normal', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 5, color: 'var(--a-text2)', cursor: 'pointer' }}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const descRef = useRef<HTMLTextAreaElement>(null)

  const [tab, setTab] = useState<Tab>('basico')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [nomeProduto, setNomeProduto] = useState('')
  const [pasteUrl, setPasteUrl] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [variantes, setVariantes] = useState<Variant[]>([])
  const [novaVariante, setNovaVariante] = useState<{ atributos: { nome: string; valor: string }[]; preco_adicional: string; estoque: string; sku: string } | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [badgeInput, setBadgeInput] = useState('')
  const [brlRate, setBrlRate] = useState(0)

  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([])
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [relacionados, setRelacionados] = useState<Relacionado[]>([])
  const [relTipoAtivo, setRelTipoAtivo] = useState<RelTipo>('compre_junto')
  const [relSearchOpen, setRelSearchOpen] = useState(false)
  const [relSearchQuery, setRelSearchQuery] = useState('')
  const [todosProdutos, setTodosProdutos] = useState<ProdutoLista[]>([])
  const [relDragIdx, setRelDragIdx] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '', titulo: '', descricao: '', brand: '', categoria_id: '', ativo: true,
    usd_price: '', usd_price_promo: '', usd_price_qty: '', qty_min: '', custo: '',
    estoque: '', sku: '', sort_order: '',
    peso: '', largura: '', altura: '', comprimento: '',
    slug: '', meta_titulo: '', meta_descricao: '',
    imagens: [] as string[], video_url: '',
    descricao_curta: '', badges: [] as string[], published_at: '',
    unidade_venda: '', multiplicador: '1', venda_minima: '1',
    sales_channel_ids: [] as string[],
    custom_fields: {} as Record<string, unknown>,
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/marcas').then(r => r.json()),
      fetch('/api/admin/categorias').then(r => r.json()),
      fetch('/api/admin/sales-channels').then(r => r.json()),
      fetch('/api/admin/custom-fields?entity=products').then(r => r.json()),
      fetch('/api/admin/produtos-list?perPage=5000').then(r => r.json()),
    ]).then(([m, c, sc, cf, pl]) => {
      setMarcas(Array.isArray(m) ? m : [])
      setCategorias(Array.isArray(c) ? c : [])
      setSalesChannels(Array.isArray(sc) ? sc : [])
      setCustomFieldDefs(Array.isArray(cf) ? cf : [])
      setTodosProdutos(Array.isArray(pl?.rows) ? pl.rows : [])
    })
    fetch(`/api/admin/produtos/${id}/variantes`).then(r => r.json()).then(d => setVariantes(Array.isArray(d) ? d : []))
    fetch(`/api/admin/produtos/${id}/tiers`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setTiers(d.map((t: { qty_min: number; qty_max: number | null; usd_price: number }) => ({
          qty_min: String(t.qty_min ?? ''),
          qty_max: t.qty_max != null ? String(t.qty_max) : '',
          usd_price: String(t.usd_price ?? ''),
        })))
      }
    })
    fetch(`/api/admin/produtos/${id}/relacionados`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setRelacionados(d as Relacionado[])
    })
    fetch('/api/config/loja').then(r => r.json()).then(d => setBrlRate(d.brl_rate || 0)).catch(() => {})
  }, [id])

  useEffect(() => {
    fetch(`/api/admin/produtos/${id}`).then(r => r.ok ? r.json() : null).then((data: Product | null) => {
      if (!data) { setLoading(false); return }
      setNomeProduto(data.name)
      if (data.slug) setSlugManual(true)
      setForm({
        name: data.name || '', titulo: data.titulo || '', descricao: data.descricao || '',
        brand: data.brand || '', categoria_id: data.categoria_id || '', ativo: data.ativo ?? true,
        usd_price: data.usd_price?.toString() || '', usd_price_promo: data.usd_price_promo?.toString() || '',
        usd_price_qty: data.usd_price_qty?.toString() || '', qty_min: data.qty_min?.toString() || '',
        custo: data.custo?.toString() || '',
        estoque: data.estoque?.toString() || '', sku: data.sku || '', sort_order: data.sort_order?.toString() || '0',
        peso: data.peso?.toString() || '', largura: data.largura?.toString() || '',
        altura: data.altura?.toString() || '', comprimento: data.comprimento?.toString() || '',
        slug: data.slug || '', meta_titulo: data.meta_titulo || '', meta_descricao: data.meta_descricao || '',
        imagens: data.imagens?.length ? data.imagens : (data.img_url ? [data.img_url] : []),
        video_url: data.video_url || '',
        descricao_curta: data.descricao_curta || '',
        badges: Array.isArray(data.badges) ? data.badges : [],
        published_at: toLocalDatetimeInput(data.published_at),
        unidade_venda: data.unidade_venda || '',
        multiplicador: data.multiplicador != null ? String(data.multiplicador) : '1',
        venda_minima: data.venda_minima != null ? String(data.venda_minima) : '1',
        sales_channel_ids: Array.isArray(data.sales_channel_ids) ? data.sales_channel_ids : [],
        custom_fields: data.custom_fields && typeof data.custom_fields === 'object' ? data.custom_fields : {},
      })
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (tab === 'historico') {
      setLoadingLogs(true)
      fetch(`/api/admin/produtos/${id}/logs`).then(r => r.json()).then(d => {
        setLogs(Array.isArray(d) ? d : [])
        setLoadingLogs(false)
      }).catch(() => setLoadingLogs(false))
    }
  }, [tab, id])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const setTitulo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setForm(f => ({ ...f, titulo: v, slug: slugManual ? f.slug : slugify(v) }))
  }

  const insertMd = (before: string, after = '') => {
    const el = descRef.current
    if (!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const text = form.descricao
    const sel = text.slice(start, end)
    const newText = text.slice(0, start) + before + sel + after + text.slice(end)
    setForm(f => ({ ...f, descricao: newText }))
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + sel.length) }, 0)
  }

  const addBadge = (v: string) => {
    const t = v.trim()
    if (!t) return
    setForm(f => f.badges.includes(t) ? f : { ...f, badges: [...f.badges, t] })
    setBadgeInput('')
  }
  const removeBadge = (i: number) => setForm(f => ({ ...f, badges: f.badges.filter((_, j) => j !== i) }))

  const toggleCanal = (cid: string) => {
    setForm(f => ({
      ...f,
      sales_channel_ids: f.sales_channel_ids.includes(cid)
        ? f.sales_channel_ids.filter(x => x !== cid)
        : [...f.sales_channel_ids, cid],
    }))
  }

  const setCustomField = (key: string, val: unknown) => {
    setForm(f => ({ ...f, custom_fields: { ...f.custom_fields, [key]: val } }))
  }

  const addTier = () => setTiers(ts => [...ts, { qty_min: '', qty_max: '', usd_price: '' }])
  const removeTier = (i: number) => setTiers(ts => ts.filter((_, j) => j !== i))
  const updateTier = (i: number, k: keyof Tier, v: string) =>
    setTiers(ts => ts.map((t, j) => j === i ? { ...t, [k]: v } : t))

  const tiersValidacao = (() => {
    const limpos = tiers.filter(t => t.qty_min !== '' && t.usd_price !== '')
    if (limpos.length === 0) return null
    let prev = 0
    for (const t of limpos) {
      const min = parseInt(t.qty_min) || 0
      const max = t.qty_max ? parseInt(t.qty_max) : Infinity
      if (min <= prev) return 'Qtd mínima deve ser crescente e sem sobreposição entre bandas'
      if (max < min) return 'Qtd máxima não pode ser menor que a mínima'
      prev = max === Infinity ? Infinity : max
    }
    return null
  })()

  const addRelacionado = (prodId: string) => {
    if (prodId === id) return
    if (relacionados.some(r => r.related_product_id === prodId && r.tipo === relTipoAtivo)) return
    const prod = todosProdutos.find(p => p.id === prodId)
    const ordem = relacionados.filter(r => r.tipo === relTipoAtivo).length
    setRelacionados(rs => [...rs, {
      related_product_id: prodId, tipo: relTipoAtivo, ordem,
      products: prod ? { id: prod.id, name: prod.name, titulo: prod.titulo, img_url: prod.img_url, usd_price: prod.usd_price, ativo: prod.ativo } : undefined,
    }])
    setRelSearchOpen(false)
    setRelSearchQuery('')
  }
  const removeRelacionado = (i: number) => setRelacionados(rs => rs.filter((_, j) => j !== i))
  const reorderRel = (from: number, to: number) => {
    setRelacionados(rs => {
      const dotipo = rs.filter(r => r.tipo === relTipoAtivo)
      const fora = rs.filter(r => r.tipo !== relTipoAtivo)
      const item = dotipo.splice(from, 1)[0]
      dotipo.splice(to, 0, item)
      return [...fora, ...dotipo.map((r, i) => ({ ...r, ordem: i }))]
    })
  }

  const save = async () => {
    if (tiersValidacao) { setError(tiersValidacao); return }
    setSaving(true); setError('')
    const publishedISO = form.published_at ? new Date(form.published_at).toISOString() : null
    const body = {
      name: form.name, titulo: form.titulo || null, descricao: form.descricao || null,
      brand: form.brand || null, categoria_id: form.categoria_id || null, ativo: form.ativo,
      usd_price: parseFloat(form.usd_price) || 0,
      usd_price_promo: form.usd_price_promo ? parseFloat(form.usd_price_promo) : null,
      usd_price_qty: form.usd_price_qty ? parseFloat(form.usd_price_qty) : null,
      qty_min: form.qty_min ? parseInt(form.qty_min) : null,
      custo: form.custo ? parseFloat(form.custo) : null,
      estoque: form.estoque === '' ? null : parseInt(form.estoque),
      sku: form.sku || null, sort_order: parseInt(form.sort_order) || 0,
      peso: form.peso ? parseFloat(form.peso) : null,
      largura: form.largura ? parseFloat(form.largura) : null,
      altura: form.altura ? parseFloat(form.altura) : null,
      comprimento: form.comprimento ? parseFloat(form.comprimento) : null,
      slug: form.slug || null, meta_titulo: form.meta_titulo || null, meta_descricao: form.meta_descricao || null,
      imagens: form.imagens, img_url: form.imagens[0] || null, video_url: form.video_url || null,
      descricao_curta: form.descricao_curta || null,
      badges: form.badges.length ? form.badges : null,
      published_at: publishedISO,
      unidade_venda: form.unidade_venda || null,
      multiplicador: form.multiplicador ? parseInt(form.multiplicador) : 1,
      venda_minima: form.venda_minima ? parseInt(form.venda_minima) : 1,
      sales_channel_ids: form.sales_channel_ids.length ? form.sales_channel_ids : null,
      custom_fields: Object.keys(form.custom_fields).length ? form.custom_fields : null,
    }
    const tiersPayload = tiers
      .filter(t => t.qty_min !== '' && t.usd_price !== '')
      .map(t => ({
        qty_min: parseInt(t.qty_min) || 0,
        qty_max: t.qty_max ? parseInt(t.qty_max) : null,
        usd_price: parseFloat(t.usd_price) || 0,
      }))
    const relPayload = relacionados.map((r, i) => ({
      related_product_id: r.related_product_id,
      tipo: r.tipo,
      ordem: typeof r.ordem === 'number' ? r.ordem : i,
    }))

    const [resProd, resTiers, resRel] = await Promise.all([
      fetch(`/api/admin/produtos/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }),
      fetch(`/api/admin/produtos/${id}/tiers`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiers: tiersPayload }),
      }),
      fetch(`/api/admin/produtos/${id}/relacionados`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relacionados: relPayload }),
      }),
    ])
    setSaving(false)
    const errs: string[] = []
    if (!resProd.ok) { const d = await resProd.json().catch(() => ({})); errs.push(`Produto: ${d.error || resProd.statusText}`) }
    if (!resTiers.ok) { const d = await resTiers.json().catch(() => ({})); errs.push(`Tiers: ${d.error || resTiers.statusText}`) }
    if (!resRel.ok) { const d = await resRel.json().catch(() => ({})); errs.push(`Relacionados: ${d.error || resRel.statusText}`) }
    if (errs.length) { setError(errs.join(' · ')); return }
    setSaved(true); setNomeProduto(form.titulo || form.name)
    setTimeout(() => setSaved(false), 3000)
  }

  const uploadImagem = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('slug', form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'produto')
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const { url, error: err } = await res.json()
    if (err) { setUploading(false); setError('Erro no upload: ' + err); return }
    setForm(f => ({ ...f, imagens: [...f.imagens, url] }))
    setUploading(false)
  }

  const addImageUrl = (url: string) => {
    const u = url.trim(); if (!u) return
    setForm(f => ({ ...f, imagens: [...f.imagens, u] })); setPasteUrl('')
  }

  const removeImagem = (i: number) => setForm(f => ({ ...f, imagens: f.imagens.filter((_, j) => j !== i) }))

  const reorder = (from: number, to: number) => {
    setForm(f => { const a = [...f.imagens]; const m = a.splice(from, 1)[0]; a.splice(to, 0, m); return { ...f, imagens: a } })
  }

  const excluir = async () => {
    if (!confirm(`Excluir "${nomeProduto}" permanentemente?`)) return
    const res = await fetch(`/api/admin/produtos/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/produtos'); else setError('Erro ao excluir')
  }

  const adicionarVariante = async () => {
    if (!novaVariante) return
    const body = {
      atributos: novaVariante.atributos.filter(a => a.nome && a.valor),
      preco_adicional: parseFloat(novaVariante.preco_adicional) || 0,
      estoque: novaVariante.estoque ? parseInt(novaVariante.estoque) : null,
      sku: novaVariante.sku || null,
    }
    const res = await fetch(`/api/admin/produtos/${id}/variantes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) { setVariantes(v => [...v, data]); setNovaVariante(null) }
  }

  const excluirVariante = async (vid: string) => {
    await fetch(`/api/admin/produtos/${id}/variantes/${vid}`, { method: 'DELETE' })
    setVariantes(v => v.filter(x => x.id !== vid))
  }

  // Calcular margem
  const custo = parseFloat(form.custo) || 0
  const preco = parseFloat(form.usd_price_promo || form.usd_price) || 0
  const margem = preco > 0 && custo > 0 ? ((preco - custo) / preco * 100) : null

  // Categorias em árvore (pais + filhos)
  const catPais = categorias.filter(c => !c.parent_id)
  const catFilhos = (parentId: string) => categorias.filter(c => c.parent_id === parentId)

  // Custom fields filtrados pela categoria
  const atributosVisiveis = customFieldDefs.filter(d =>
    d.categoria_id === null || d.categoria_id === form.categoria_id
  )

  // Status de publicação agendada
  const publishedDate = form.published_at ? new Date(form.published_at) : null
  const isAgendado = publishedDate && publishedDate.getTime() > Date.now()
  const fmtAgendado = publishedDate
    ? `${String(publishedDate.getDate()).padStart(2, '0')}/${String(publishedDate.getMonth() + 1).padStart(2, '0')} ${String(publishedDate.getHours()).padStart(2, '0')}:${String(publishedDate.getMinutes()).padStart(2, '0')}`
    : ''

  // Relacionados visíveis no tipo ativo
  const relacionadosDoTipo = relacionados.filter(r => r.tipo === relTipoAtivo).sort((a, b) => a.ordem - b.ordem)
  const produtosDisponiveis = todosProdutos.filter(p =>
    p.id !== id &&
    !relacionados.some(r => r.related_product_id === p.id && r.tipo === relTipoAtivo) &&
    (!relSearchQuery || (p.titulo || p.name || '').toLowerCase().includes(relSearchQuery.toLowerCase()))
  ).slice(0, 30)

  if (loading) return <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }} />

  return (
    <div className="pd-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .pd-page { padding: 16px !important; }
          .pd-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push('/admin/produtos')}
          style={{ fontSize: 13, color: 'var(--a-text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ← Produtos
        </button>
        <span style={{ color: 'var(--a-border)' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
          {nomeProduto}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, padding: 4, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 18px', borderRadius: 7, fontSize: 13, fontWeight: tab === key ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: tab === key ? 'var(--a-bg)' : 'transparent', color: tab === key ? 'var(--a-text)' : 'var(--a-text3)', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 860 }}>

        {/* ── BÁSICO ── */}
        {tab === 'basico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec('#A965ED')}>INFORMAÇÕES BÁSICAS</p>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>TÍTULO DO PRODUTO <span style={{ color: 'var(--a-text3)', fontWeight: 400 }}>(exibido na loja)</span></label>
                <input value={form.titulo} onChange={setTitulo} placeholder="Nome claro e atrativo do produto" style={IS} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>NOME INTERNO <span style={{ color: 'var(--a-text3)', fontWeight: 400 }}>(referência)</span></label>
                <input value={form.name} onChange={set('name')} style={IS} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>DESCRIÇÃO DETALHADA</label>
                <MdToolbar onInsert={insertMd} />
                <textarea ref={descRef} value={form.descricao} onChange={set('descricao')} rows={8}
                  placeholder="Descreva benefícios, especificações técnicas, usos... (Markdown suportado)"
                  style={{ ...IS, resize: 'vertical', lineHeight: 1.7, fontFamily: 'monospace', fontSize: 12 }} />
                <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 4 }}>Suporta **negrito**, *itálico*, ## títulos, - listas</p>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>DESCRIÇÃO CURTA <span style={{ color: 'var(--a-text3)', fontWeight: 400 }}>({form.descricao_curta.length}/160 caracteres)</span></label>
                <input value={form.descricao_curta} onChange={set('descricao_curta')} maxLength={160}
                  placeholder="Teaser de 1 linha — usado em listings e meta description automática"
                  style={IS} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>BADGES</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {form.badges.map((b, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(169, 101, 237,0.1)', border: '1px solid rgba(169, 101, 237,0.3)', borderRadius: 14, fontSize: 11, fontWeight: 700, color: '#A965ED' }}>
                      {b}
                      <button type="button" onClick={() => removeBadge(i)}
                        style={{ background: 'none', border: 'none', color: '#A965ED', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={badgeInput} onChange={e => setBadgeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBadge(badgeInput) } }}
                    placeholder="Digite e Enter para adicionar"
                    style={{ ...IS, flex: 1, width: 'auto' }} />
                  <button type="button" onClick={() => addBadge(badgeInput)}
                    style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: '1px solid var(--a-border)', background: 'var(--a-bg)', color: 'var(--a-text2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Adicionar
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {BADGE_SUGGESTIONS.filter(s => !form.badges.includes(s)).map(s => (
                    <button key={s} type="button" onClick={() => addBadge(s)}
                      style={{ padding: '4px 10px', borderRadius: 12, border: '1px dashed var(--a-border)', background: 'transparent', color: 'var(--a-text3)', fontSize: 11, cursor: 'pointer' }}>
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>PUBLICAÇÃO</label>
                <input type="datetime-local" value={form.published_at} onChange={set('published_at')} style={IS} />
                <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 4 }}>
                  Deixe vazio para publicar imediatamente. Para agendar, escolha data/hora futura.
                </p>
              </div>
            </div>

            <div className="pd-grid" style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ ...sec(), marginBottom: 12 }}>MARCA</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={form.brand} onChange={set('brand')}
                    style={{ ...IS, flex: 1, cursor: 'pointer' }}>
                    <option value="">Sem marca</option>
                    {marcas.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                  </select>
                  <a href="/admin/marcas" target="_blank"
                    style={{ padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text2)', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    + Nova
                  </a>
                </div>
              </div>
              <div>
                <p style={{ ...sec(), marginBottom: 12 }}>CATEGORIA</p>
                <select value={form.categoria_id} onChange={set('categoria_id')}
                  style={{ ...IS, cursor: 'pointer' }}>
                  <option value="">Sem categoria</option>
                  {catPais.map(cat => (
                    <optgroup key={cat.id} label={cat.nome}>
                      <option value={cat.id}>{cat.nome}</option>
                      {catFilhos(cat.id).map(sub => (
                        <option key={sub.id} value={sub.id}>  ↳ {sub.nome}</option>
                      ))}
                    </optgroup>
                  ))}
                  {categorias.filter(c => !c.parent_id && catFilhos(c.id).length === 0).length === 0 && categorias.filter(c => c.parent_id).map(() => null)}
                </select>
              </div>
            </div>

            <div style={card}>
              <p style={sec()}>STATUS</p>
              {isAgendado && (
                <div style={{ display: 'inline-block', padding: '5px 12px', background: 'rgba(169, 101, 237,0.1)', border: '1px solid rgba(169, 101, 237,0.3)', borderRadius: 6, color: '#A965ED', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                  Agendado para {fmtAgendado}
                </div>
              )}
              <button type="button" onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: form.ativo ? '#A965ED' : 'var(--a-border)', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 3, left: form.ativo ? 22 : 3, width: 18, height: 18, borderRadius: 9, background: form.ativo ? '#000' : 'var(--a-text3)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s', display: 'block' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.ativo ? '#A965ED' : 'var(--a-text3)' }}>
                  {form.ativo ? 'Produto ativo — visível na loja' : 'Produto inativo — oculto da loja'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── PREÇOS ── */}
        {tab === 'precos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec('#f59e0b')}>PRECIFICAÇÃO</p>
              <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>PREÇO DE VENDA (USD)</label>
                  <input type="number" step="0.01" value={form.usd_price} onChange={set('usd_price')} placeholder="0.00" style={IS} />
                  {brlRate > 0 && parseFloat(form.usd_price) > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 4 }}>≈ R$ {(parseFloat(form.usd_price) * brlRate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
                </div>
                <div>
                  <label style={lbl}>PREÇO &quot;DE&quot; PROMOCIONAL (USD)</label>
                  <input type="number" step="0.01" value={form.usd_price_promo} onChange={set('usd_price_promo')} placeholder="Vazio = sem promoção" style={IS} />
                  {brlRate > 0 && parseFloat(form.usd_price_promo) > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 4 }}>≈ R$ {(parseFloat(form.usd_price_promo) * brlRate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
                </div>
                <div>
                  <label style={lbl}>CUSTO DO PRODUTO (USD)</label>
                  <input type="number" step="0.01" value={form.custo} onChange={set('custo')} placeholder="Valor interno" style={IS} />
                </div>
              </div>

              {margem !== null && (
                <div style={{ marginTop: 14, padding: '10px 16px', borderRadius: 8, background: margem >= 20 ? 'rgba(169, 101, 237,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${margem >= 20 ? 'rgba(169, 101, 237,0.25)' : 'rgba(239,68,68,0.25)'}`, display: 'flex', gap: 20, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: margem >= 20 ? '#A965ED' : '#ef4444' }}>
                    Margem: {margem.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--a-text3)' }}>
                    Lucro: USD {(preco - custo).toFixed(2)} por venda
                  </span>
                  {margem < 20 && <span style={{ fontSize: 12, color: '#ef4444' }}>⚠ Margem abaixo de 20%</span>}
                </div>
              )}
            </div>

            <div style={{ ...card, background: 'rgba(245,158,11,0.04)' }}>
              <p style={sec('#f59e0b')}>PREÇO POR QUANTIDADE</p>
              <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>PREÇO ESPECIAL (USD)</label>
                  <input type="number" step="0.01" value={form.usd_price_qty} onChange={set('usd_price_qty')} placeholder="Vazio = não usar" style={IS} />
                </div>
                <div>
                  <label style={lbl}>QUANTIDADE MÍNIMA</label>
                  <input type="number" min="1" value={form.qty_min} onChange={set('qty_min')} placeholder="Ex: 3" style={IS} />
                  <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 6 }}>Comprando {form.qty_min || 'N'} ou mais unidades</p>
                </div>
              </div>
            </div>

            <div style={{ ...card, background: 'rgba(245,158,11,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ ...sec('#f59e0b'), margin: 0 }}>TABELA DE BANDAS ESCALONADAS</p>
                <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>Preços decrescentes por volume</span>
              </div>

              {tiers.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--a-text3)', marginBottom: 14 }}>
                  Nenhuma banda configurada. Adicione faixas como 1–10, 11–50, 51+ com preços diferentes.
                </p>
              )}

              {tiers.map((t, i) => (
                <div key={i} className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div>
                    {i === 0 && <label style={lbl}>QTD MÍN</label>}
                    <input type="number" min="1" value={t.qty_min} onChange={e => updateTier(i, 'qty_min', e.target.value)} placeholder="1" style={IS} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>QTD MÁX</label>}
                    <input type="number" min="1" value={t.qty_max} onChange={e => updateTier(i, 'qty_max', e.target.value)} placeholder={i === tiers.length - 1 ? '+ acima (vazio)' : 'ex: 10'} style={IS} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>PREÇO USD</label>}
                    <input type="number" step="0.01" value={t.usd_price} onChange={e => updateTier(i, 'usd_price', e.target.value)} placeholder="0.00" style={IS} />
                  </div>
                  <button type="button" onClick={() => removeTier(i)}
                    style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', height: 'fit-content' }}>
                    ×
                  </button>
                </div>
              ))}

              {tiersValidacao && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, fontWeight: 600 }}>⚠ {tiersValidacao}</p>
              )}

              <button type="button" onClick={addTier}
                style={{ marginTop: 8, padding: '9px 18px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                + Adicionar tier
              </button>
            </div>

            {form.usd_price_promo && parseFloat(form.usd_price_promo) > 0 && parseFloat(form.usd_price) > 0 && (
              <div style={{ padding: '12px 16px', background: 'rgba(169, 101, 237,0.06)', border: '1px solid rgba(169, 101, 237,0.2)', borderRadius: 9, fontSize: 13, color: '#A965ED', fontWeight: 600 }}>
                Desconto de {((parseFloat(form.usd_price) - parseFloat(form.usd_price_promo)) / parseFloat(form.usd_price) * 100).toFixed(1)}% — de USD {parseFloat(form.usd_price).toFixed(2)} por USD {parseFloat(form.usd_price_promo).toFixed(2)}
                {brlRate > 0 && ` (R$ ${(parseFloat(form.usd_price) * brlRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por R$ ${(parseFloat(form.usd_price_promo) * brlRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
              </div>
            )}
          </div>
        )}

        {/* ── MÍDIA ── */}
        {tab === 'midia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={sec('#A965ED')}>GALERIA DE IMAGENS</p>
                {form.imagens.length > 1 && <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>Arraste para reordenar · 1ª = principal</span>}
              </div>

              {form.imagens.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  {form.imagens.map((url, i) => (
                    <div key={i} draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={e => { e.preventDefault(); setDragOverIdx(i) }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) reorder(dragIdx, i); setDragIdx(null); setDragOverIdx(null) }}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                      style={{ position: 'relative', width: 100, height: 100, borderRadius: 10, overflow: 'hidden', cursor: 'grab', flexShrink: 0, border: i === 0 ? '2.5px solid #A965ED' : dragOverIdx === i ? '2px dashed #A965ED' : '1.5px solid var(--a-border)', opacity: dragIdx === i ? 0.4 : 1 }}>
                      <Image src={url} alt="" fill style={{ objectFit: 'cover', pointerEvents: 'none' }} unoptimized />
                      {i === 0 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(169, 101, 237,0.85)', color: '#000', fontSize: 9, fontWeight: 800, textAlign: 'center', padding: '3px 0', letterSpacing: '0.06em' }}>PRINCIPAL</div>
                      )}
                      <button type="button" onClick={() => removeImagem(i)}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {form.imagens.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--a-text3)', textAlign: 'center', padding: '20px 0' }}>Nenhuma imagem</p>
              )}

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 700, padding: '11px', borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer', background: 'rgba(169, 101, 237,0.08)', color: '#A965ED', border: '1px solid rgba(169, 101, 237,0.3)', opacity: uploading ? 0.6 : 1, marginBottom: 10 }}>
                {uploading ? 'Enviando...' : '↑ Fazer upload de imagem'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImagem(f); e.target.value = '' }} />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <input value={pasteUrl} onChange={e => setPasteUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(pasteUrl) } }}
                  placeholder="Ou cole a URL da imagem..."
                  style={{ ...IS, flex: 1, width: 'auto' }} />
                <button type="button" onClick={() => addImageUrl(pasteUrl)}
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: '1px solid var(--a-border)', background: 'var(--a-bg)', color: 'var(--a-text2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Adicionar
                </button>
              </div>
            </div>

            <div style={card}>
              <p style={sec('#3b82f6')}>LINK DE VÍDEO</p>
              <label style={lbl}>URL DO VÍDEO (YouTube, Vimeo, etc.)</label>
              <input value={form.video_url} onChange={set('video_url')} placeholder="https://youtube.com/watch?v=..." style={IS} />
              {form.video_url && (
                <p style={{ fontSize: 11, color: '#3b82f6', marginTop: 8, fontWeight: 600 }}>✓ Vídeo configurado</p>
              )}
            </div>
          </div>
        )}

        {/* ── ESTOQUE ── */}
        {tab === 'estoque' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec()}>IDENTIFICAÇÃO</p>
              <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>SKU (código do produto)</label>
                  <input value={form.sku} onChange={set('sku')} placeholder="Ex: PROD-001" style={{ ...IS, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={lbl}>ORDEM DE EXIBIÇÃO</label>
                  <input type="number" value={form.sort_order} onChange={set('sort_order')} placeholder="0" style={IS} />
                </div>
              </div>
            </div>

            <div style={card}>
              <p style={sec()}>ESTOQUE</p>
              <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>QUANTIDADE DISPONÍVEL (vazio = ilimitado)</label>
                  <input type="number" min="0" value={form.estoque} onChange={set('estoque')} placeholder="∞" style={IS} />
                  {form.estoque !== '' && (
                    <p style={{ fontSize: 11, marginTop: 6, color: parseInt(form.estoque) === 0 ? '#ef4444' : parseInt(form.estoque) <= 5 ? '#f59e0b' : 'var(--a-text3)' }}>
                      {parseInt(form.estoque) === 0 ? 'Sem estoque' : parseInt(form.estoque) <= 5 ? `⚠ Estoque baixo (${form.estoque} un.)` : `${form.estoque} unidades disponíveis`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div style={card}>
              <p style={sec()}>UNIDADE DE VENDA</p>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>UNIDADE DE VENDA</label>
                <input value={form.unidade_venda} onChange={set('unidade_venda')}
                  placeholder='Ex: "caixa com 12 frascos", "fardo de 24"' style={IS} />
              </div>
              <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>MULTIPLICADOR</label>
                  <input type="number" min="1" value={form.multiplicador} onChange={set('multiplicador')} placeholder="1" style={IS} />
                  <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 4 }}>Vendas em múltiplos de N unidades</p>
                </div>
                <div>
                  <label style={lbl}>VENDA MÍNIMA</label>
                  <input type="number" min="1" value={form.venda_minima} onChange={set('venda_minima')} placeholder="1" style={IS} />
                  <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 4 }}>Mínimo por pedido</p>
                </div>
              </div>
              {(parseInt(form.multiplicador) > 1 || parseInt(form.venda_minima) > 1) && (
                <p style={{ fontSize: 12, color: 'var(--a-text2)', marginTop: 10, padding: '8px 12px', background: 'var(--a-bg)', borderRadius: 6, border: '1px solid var(--a-border)' }}>
                  Vende em caixas de {form.multiplicador || 1}, mínimo {form.venda_minima || 1} unidades por pedido.
                </p>
              )}
            </div>

            <div style={card}>
              <p style={sec()}>DIMENSÕES E PESO <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--a-text3)' }}>(para cálculo de frete)</span></p>
              <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                {[
                  { k: 'peso', label: 'PESO (kg)', ph: '0.5' },
                  { k: 'comprimento', label: 'COMPRIMENTO (cm)', ph: '30' },
                  { k: 'largura', label: 'LARGURA (cm)', ph: '20' },
                  { k: 'altura', label: 'ALTURA (cm)', ph: '10' },
                ].map(({ k, label, ph }) => (
                  <div key={k}>
                    <label style={lbl}>{label}</label>
                    <input type="number" step="0.1" value={(form as unknown as Record<string, string>)[k]} onChange={set(k as keyof typeof form)} placeholder={ph} style={IS} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VARIAÇÕES ── */}
        {tab === 'variacoes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec('#A965ED')}>GRADE DE VARIAÇÕES</p>

              {variantes.length === 0 && !novaVariante && (
                <p style={{ fontSize: 13, color: 'var(--a-text3)', marginBottom: 16 }}>Nenhuma variação cadastrada. Use para Cor, Tamanho, Voltagem, etc.</p>
              )}

              {/* Lista de variantes */}
              {variantes.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--a-bg)', borderRadius: 8, border: '1px solid var(--a-border)', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      {v.atributos.map((a, i) => (
                        <span key={i} style={{ fontSize: 11, background: 'rgba(169, 101, 237,0.1)', color: '#A965ED', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(169, 101, 237,0.2)', fontWeight: 700 }}>
                          {a.nome}: {a.valor}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--a-text3)' }}>
                      {v.sku && <span>SKU: <span style={{ fontFamily: 'monospace', color: 'var(--a-text2)' }}>{v.sku}</span></span>}
                      {v.preco_adicional !== 0 && <span>+ USD {v.preco_adicional.toFixed(2)}</span>}
                      <span>{v.estoque === null ? 'Estoque: ∞' : `Estoque: ${v.estoque}`}</span>
                    </div>
                  </div>
                  <button onClick={() => excluirVariante(v.id)}
                    style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                    Remover
                  </button>
                </div>
              ))}

              {/* Formulário nova variante */}
              {novaVariante ? (
                <div style={{ padding: 16, background: 'rgba(169, 101, 237,0.05)', border: '1px solid rgba(169, 101, 237,0.2)', borderRadius: 10, marginTop: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#A965ED', letterSpacing: '0.06em', marginBottom: 14 }}>NOVA VARIAÇÃO</p>

                  {/* Atributos */}
                  {novaVariante.atributos.map((a, i) => (
                    <div key={i} className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                      <input value={a.nome} onChange={e => setNovaVariante(v => { if (!v) return v; const arr = [...v.atributos]; arr[i] = { ...arr[i], nome: e.target.value }; return { ...v, atributos: arr } })}
                        placeholder="Atributo (ex: Cor)" style={IS} />
                      <input value={a.valor} onChange={e => setNovaVariante(v => { if (!v) return v; const arr = [...v.atributos]; arr[i] = { ...arr[i], valor: e.target.value }; return { ...v, atributos: arr } })}
                        placeholder="Valor (ex: Preto)" style={IS} />
                      <button onClick={() => setNovaVariante(v => v ? { ...v, atributos: v.atributos.filter((_, j) => j !== i) } : v)}
                        style={{ padding: '0 10px', background: 'var(--a-border)', border: 'none', borderRadius: 7, color: 'var(--a-text2)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setNovaVariante(v => v ? { ...v, atributos: [...v.atributos, { nome: '', valor: '' }] } : v)}
                    style={{ fontSize: 12, color: '#A965ED', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 14, fontWeight: 700 }}>
                    + Adicionar atributo
                  </button>

                  <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div><label style={lbl}>PREÇO ADICIONAL (USD)</label>
                      <input type="number" step="0.01" value={novaVariante.preco_adicional}
                        onChange={e => setNovaVariante(v => v ? { ...v, preco_adicional: e.target.value } : v)}
                        placeholder="0.00" style={IS} /></div>
                    <div><label style={lbl}>ESTOQUE</label>
                      <input type="number" value={novaVariante.estoque}
                        onChange={e => setNovaVariante(v => v ? { ...v, estoque: e.target.value } : v)}
                        placeholder="∞" style={IS} /></div>
                    <div><label style={lbl}>SKU</label>
                      <input value={novaVariante.sku}
                        onChange={e => setNovaVariante(v => v ? { ...v, sku: e.target.value } : v)}
                        placeholder="Opcional" style={{ ...IS, fontFamily: 'monospace' }} /></div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={adicionarVariante}
                      style={{ padding: '9px 20px', background: '#A965ED', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      Confirmar
                    </button>
                    <button onClick={() => setNovaVariante(null)}
                      style={{ padding: '9px 16px', background: 'transparent', color: 'var(--a-text2)', border: '1px solid var(--a-border)', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setNovaVariante({ atributos: [{ nome: '', valor: '' }], preco_adicional: '', estoque: '', sku: '' })}
                  style={{ marginTop: 8, padding: '10px 20px', background: 'rgba(169, 101, 237,0.1)', color: '#A965ED', border: '1px solid rgba(169, 101, 237,0.3)', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  + Adicionar variação
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── ATRIBUTOS ── */}
        {tab === 'atributos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec('#A660EC')}>ATRIBUTOS CUSTOMIZADOS</p>

              {atributosVisiveis.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--a-text3)' }}>
                  Nenhum atributo configurado para esta categoria. Crie em <a href="/admin/custom-fields" target="_blank" style={{ color: '#A660EC' }}>/admin/custom-fields</a>.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {atributosVisiveis.map(def => {
                    const value = form.custom_fields[def.field_key]
                    if (def.field_type === 'boolean') {
                      const checked = value === true || value === 'true'
                      return (
                        <div key={def.id}>
                          <button type="button" onClick={() => setCustomField(def.field_key, !checked)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <div style={{ position: 'relative', width: 38, height: 22, borderRadius: 11, background: checked ? '#A660EC' : 'var(--a-border)', transition: 'background 0.2s' }}>
                              <span style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: 8, background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)' }}>
                              {def.label}{def.required ? ' *' : ''}
                            </span>
                          </button>
                        </div>
                      )
                    }
                    return (
                      <div key={def.id}>
                        <label style={lbl}>{def.label.toUpperCase()}{def.required ? ' *' : ''}</label>
                        {def.field_type === 'select' && Array.isArray(def.options) ? (
                          <select value={String(value ?? '')} onChange={e => setCustomField(def.field_key, e.target.value)}
                            style={{ ...IS, cursor: 'pointer' }}>
                            <option value="">— Selecione —</option>
                            {def.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : def.field_type === 'number' ? (
                          <input type="number" step="0.01" value={String(value ?? '')}
                            onChange={e => setCustomField(def.field_key, e.target.value === '' ? null : parseFloat(e.target.value))}
                            style={IS} />
                        ) : def.field_type === 'date' ? (
                          <input type="date" value={String(value ?? '')}
                            onChange={e => setCustomField(def.field_key, e.target.value)}
                            style={IS} />
                        ) : (
                          <input value={String(value ?? '')}
                            onChange={e => setCustomField(def.field_key, e.target.value)}
                            style={IS} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RELACIONADOS ── */}
        {tab === 'relacionados' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec('#06b6d4')}>PRODUTOS RELACIONADOS</p>

              {/* Sub-tabs por tipo */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
                {REL_TIPOS.map(({ key, label }) => {
                  const count = relacionados.filter(r => r.tipo === key).length
                  return (
                    <button key={key} type="button" onClick={() => setRelTipoAtivo(key)}
                      style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: relTipoAtivo === key ? 700 : 500, border: '1px solid', borderColor: relTipoAtivo === key ? '#06b6d4' : 'var(--a-border)', background: relTipoAtivo === key ? 'rgba(6,182,212,0.1)' : 'transparent', color: relTipoAtivo === key ? '#06b6d4' : 'var(--a-text3)', cursor: 'pointer' }}>
                      {label}{count > 0 ? ` (${count})` : ''}
                    </button>
                  )
                })}
              </div>

              {/* Lista de relacionados do tipo ativo */}
              {relacionadosDoTipo.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--a-text3)', marginBottom: 14 }}>
                  Nenhum produto na categoria &quot;{REL_TIPOS.find(t => t.key === relTipoAtivo)?.label}&quot;.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {relacionadosDoTipo.map((r, i) => {
                    const idxGlobal = relacionados.findIndex(x => x === r)
                    return (
                      <div key={r.related_product_id + r.tipo} draggable
                        onDragStart={() => setRelDragIdx(i)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); if (relDragIdx !== null && relDragIdx !== i) reorderRel(relDragIdx, i); setRelDragIdx(null) }}
                        onDragEnd={() => setRelDragIdx(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, cursor: 'grab', opacity: relDragIdx === i ? 0.5 : 1 }}>
                        <span style={{ fontSize: 14, color: 'var(--a-text3)', cursor: 'grab' }}>⋮⋮</span>
                        <div style={{ width: 60, height: 60, borderRadius: 6, overflow: 'hidden', background: 'var(--a-surface)', flexShrink: 0, position: 'relative' }}>
                          {r.products?.img_url && (
                            <Image src={r.products.img_url} alt="" fill style={{ objectFit: 'cover' }} unoptimized />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.products?.titulo || r.products?.name || r.related_product_id}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '2px 0 0' }}>
                            {r.products?.usd_price != null ? `USD ${r.products.usd_price.toFixed(2)}` : '—'}
                            {r.products && !r.products.ativo && <span style={{ color: '#ef4444', marginLeft: 8 }}>· inativo</span>}
                          </p>
                        </div>
                        <button type="button" onClick={() => removeRelacionado(idxGlobal)}
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}>
                          Remover
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Botão + dropdown busca */}
              {!relSearchOpen ? (
                <button type="button" onClick={() => setRelSearchOpen(true)}
                  style={{ padding: '10px 18px', background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  + Adicionar produto
                </button>
              ) : (
                <div style={{ padding: 14, background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input autoFocus value={relSearchQuery} onChange={e => setRelSearchQuery(e.target.value)}
                      placeholder="Buscar produto por nome..."
                      style={{ ...IS, flex: 1, width: 'auto' }} />
                    <button type="button" onClick={() => { setRelSearchOpen(false); setRelSearchQuery('') }}
                      style={{ padding: '10px 14px', background: 'transparent', color: 'var(--a-text2)', border: '1px solid var(--a-border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                      Fechar
                    </button>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {produtosDisponiveis.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--a-text3)', padding: '10px 0', textAlign: 'center' }}>Nenhum produto encontrado</p>
                    ) : produtosDisponiveis.map(p => (
                      <button key={p.id} type="button" onClick={() => addRelacionado(p.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', background: 'var(--a-surface)', flexShrink: 0, position: 'relative' }}>
                          {p.img_url && <Image src={p.img_url} alt="" fill style={{ objectFit: 'cover' }} unoptimized />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.titulo || p.name}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--a-text3)', margin: '1px 0 0' }}>
                            {p.usd_price != null ? `USD ${p.usd_price.toFixed(2)}` : '—'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CANAIS ── */}
        {tab === 'canais' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec('#ec4899')}>CANAIS DE VENDA</p>

              <div style={{ padding: '10px 14px', background: form.sales_channel_ids.length === 0 ? 'rgba(236,72,153,0.08)' : 'var(--a-bg)', border: `1px solid ${form.sales_channel_ids.length === 0 ? 'rgba(236,72,153,0.25)' : 'var(--a-border)'}`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: 'var(--a-text2)' }}>
                {form.sales_channel_ids.length === 0
                  ? 'Sem canais selecionados — o produto aparece em TODOS os canais por padrão.'
                  : `Produto restrito a ${form.sales_channel_ids.length} canal(is) selecionado(s).`}
              </div>

              {salesChannels.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--a-text3)' }}>
                  Nenhum canal cadastrado. Configure em <a href="/admin/sales-channels" target="_blank" style={{ color: '#ec4899' }}>/admin/sales-channels</a>.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {salesChannels.map(ch => {
                    const checked = form.sales_channel_ids.includes(ch.id)
                    return (
                      <button key={ch.id} type="button" onClick={() => toggleCanal(ch.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: checked ? 'rgba(236,72,153,0.08)' : 'var(--a-bg)', border: `1px solid ${checked ? '#ec4899' : 'var(--a-border)'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: checked ? '#ec4899' : 'transparent', border: `1.5px solid ${checked ? '#ec4899' : 'var(--a-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {checked && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', margin: 0 }}>
                            Disponível em {ch.nome}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--a-text3)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                            {ch.slug}{!ch.ativo && ' · inativo'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SEO ── */}
        {tab === 'seo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <p style={sec('#A965ED')}>URL AMIGÁVEL</p>
              <label style={lbl}>SLUG <span style={{ color: 'var(--a-text3)', fontWeight: 400 }}>(gerado automaticamente do título)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, overflow: 'hidden' }}>
                <span style={{ padding: '10px 12px', fontSize: 12, color: 'var(--a-text3)', background: 'var(--a-surface)', borderRight: '1px solid var(--a-border)', whiteSpace: 'nowrap' }}>
                  atacadonafronteira.com/produto/
                </span>
                <input value={form.slug} onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })) }}
                  placeholder="nome-do-produto"
                  style={{ ...IS, border: 'none', borderRadius: 0, flex: 1, fontFamily: 'monospace' }} />
              </div>
              {form.slug && (
                <p style={{ fontSize: 11, color: '#A965ED', marginTop: 6 }}>
                  atacadonafronteira.com/produto/{form.slug}
                </p>
              )}
            </div>

            <div style={card}>
              <p style={sec('#A965ED')}>META DADOS (GOOGLE)</p>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>META TÍTULO <span style={{ color: 'var(--a-text3)', fontWeight: 400 }}>({form.meta_titulo.length}/60 caracteres)</span></label>
                <input value={form.meta_titulo} onChange={set('meta_titulo')} maxLength={60}
                  placeholder={form.titulo || form.name || 'Título para o Google...'}
                  style={{ ...IS, borderColor: form.meta_titulo.length > 55 ? '#f59e0b' : undefined }} />
                <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 4 }}>Aparece como título nos resultados de busca</p>
              </div>
              <div>
                <label style={lbl}>META DESCRIÇÃO <span style={{ color: 'var(--a-text3)', fontWeight: 400 }}>({form.meta_descricao.length}/160 caracteres)</span></label>
                <textarea value={form.meta_descricao} onChange={set('meta_descricao')} rows={3} maxLength={160}
                  placeholder="Descrição curta que aparece no Google..."
                  style={{ ...IS, resize: 'none', borderColor: form.meta_descricao.length > 150 ? '#f59e0b' : undefined }} />
              </div>
            </div>

            {/* Preview Google */}
            {(form.meta_titulo || form.titulo || form.meta_descricao) && (
              <div style={{ ...card, background: '#fff', color: '#000' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 12 }}>PREVIEW NO GOOGLE</p>
                <p style={{ fontSize: 18, color: '#1a0dab', margin: '0 0 4px', fontFamily: 'Arial, sans-serif', cursor: 'pointer', textDecoration: 'underline' }}>
                  {form.meta_titulo || form.titulo || form.name}
                </p>
                <p style={{ fontSize: 13, color: '#006621', margin: '0 0 4px', fontFamily: 'Arial, sans-serif' }}>
                  atacadonafronteira.com/produto/{form.slug || 'produto'}
                </p>
                <p style={{ fontSize: 13, color: '#545454', margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.5 }}>
                  {form.meta_descricao || form.descricao_curta || form.descricao?.slice(0, 155) + '...' || 'Sem descrição'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {tab === 'historico' && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--a-border)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Histórico de alterações</p>
            </div>
            {loadingLogs ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'var(--a-text3)', fontSize: 13 }}>Carregando...</p>
            ) : logs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'var(--a-text3)', fontSize: 13 }}>Nenhuma alteração registrada ainda</p>
            ) : logs.map(log => (
              <div key={log.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--a-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#A965ED' }}>{log.admin_email}</span>
                  <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>
                    {new Date(log.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {Object.entries(log.campos_alterados).map(([campo, { antes, depois }]) => (
                  <div key={campo} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--a-text2)', minWidth: 130, flexShrink: 0 }}>{FIELD_LABELS[campo] ?? campo}</span>
                    <span style={{ color: 'var(--a-text3)', textDecoration: 'line-through' }}>{fmtLogVal(campo, antes)}</span>
                    <span style={{ color: 'var(--a-text3)' }}>→</span>
                    <span style={{ fontWeight: 700, color: 'var(--a-text)' }}>{fmtLogVal(campo, depois)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Barra de ações */}
        {tab !== 'historico' && (
          <div style={{ display: 'flex', gap: 12, paddingTop: 20, alignItems: 'center' }}>
            <button onClick={save} disabled={saving}
              style={{ padding: '12px 32px', background: saving ? 'var(--a-border)' : '#A965ED', color: saving ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 9, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
              {saving ? 'Salvando...' : 'Salvar produto'}
            </button>
            <button onClick={() => router.push('/admin/produtos')}
              style={{ padding: '12px 20px', background: 'transparent', color: 'var(--a-text2)', border: '1px solid var(--a-border)', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            {saved && <span style={{ fontSize: 13, color: '#A965ED', fontWeight: 700 }}>✓ Salvo</span>}
            {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
            <div style={{ flex: 1 }} />
            <button onClick={excluir}
              style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Excluir produto
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
