'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation'
import { useCarrinho } from '@/components/CarrinhoContext'

type Tier = { qty_min: number; qty_max: number | null; usd_price: number }
type CFD = { field_key: string; label: string; field_type: string; options: any; ordem: number }
type RelacionadoMin = { id: string; name: string; img_url: string | null; usd_price: number }
type Product = {
  id: string; name: string; brand: string | null; usd_price: number
  img_url: string | null; imagens?: string[] | null; estoque: number | null; categoria_id: string | null; descricao: string | null
  descricao_curta?: string | null
  badges?: string[] | null
  multiplicador?: number | null
  venda_minima?: number | null
  unidade_venda?: string | null
  custom_fields?: Record<string, any> | null
  sku?: string | null
  tiers?: Tier[]
  relacionados?: Record<string, RelacionadoMin[]>
  custom_field_defs?: CFD[]
}

const BADGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'novo': { bg: 'rgba(0,180,210,0.08)', color: '#0891b2', border: 'rgba(0,180,210,0.35)' },
  'mais vendido': { bg: 'rgba(245,158,11,0.10)', color: '#b45309', border: 'rgba(245,158,11,0.4)' },
  'promoção': { bg: 'rgba(66, 14, 118,0.08)', color: '#420E76', border: 'rgba(66, 14, 118,0.35)' },
  'promocao': { bg: 'rgba(66, 14, 118,0.08)', color: '#420E76', border: 'rgba(66, 14, 118,0.35)' },
  'lançamento': { bg: 'rgba(190,40,180,0.08)', color: '#a21caf', border: 'rgba(190,40,180,0.35)' },
  'lancamento': { bg: 'rgba(190,40,180,0.08)', color: '#a21caf', border: 'rgba(190,40,180,0.35)' },
}
const DEFAULT_BADGE = { bg: '#fafafa', color: '#737373', border: '#d4d4d4' }
const badgeStyle = (txt: string) => BADGE_COLORS[txt.trim().toLowerCase()] ?? DEFAULT_BADGE

function priceFor(qty: number, base: number, tiers: Tier[]): number {
  if (!tiers || tiers.length === 0) return base
  const sorted = [...tiers].sort((a, b) => b.qty_min - a.qty_min)
  const t = sorted.find(x => qty >= x.qty_min && (x.qty_max == null || qty <= x.qty_max))
  return t ? Number(t.usd_price) : base
}

const PLACEHOLDER = '/produto-placeholder.svg'

const dec = (s: string | null) => {
  if (!s) return null
  try {
    const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch { return s }
}

const fmt = (n: number, rate: number, code: string) => {
  if (code === 'PYG') return n > 0 ? (n * rate).toLocaleString('es-PY', { maximumFractionDigits: 0 }) : '0'
  return (n * rate).toFixed(2).replace('.', ',')
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : p
  )
}

function renderBlock(linhas: string[]) {
  return linhas.map((l, i) => {
    if (l.startsWith('- ') || l.startsWith('* ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
          <span style={{ flexShrink: 0, marginTop: 8, width: 4, height: 4, borderRadius: '50%', background: '#420E76', opacity: 0.85 }} />
          <span style={{ flex: 1 }}>{renderInline(l.slice(2))}</span>
        </div>
      )
    }
    if (l.trim() === '') return <div key={i} style={{ height: 8 }} />
    return <p key={i} style={{ margin: '6px 0' }}>{renderInline(l)}</p>
  })
}

function Descricao({ texto }: { texto: string }) {
  const linhas = texto.split('\n').filter(Boolean)
  return (
    <div style={{ fontSize: 14, color: '#404040', lineHeight: 1.7 }}>
      {linhas.map((l, i) => {
        if (l.startsWith('## ')) return <p key={i} style={{ fontWeight: 800, color: '#0a0a0a', margin: '18px 0 8px', fontSize: 11, letterSpacing: '0.12em' }}>{l.slice(3).toUpperCase()}</p>
        if (l.startsWith('- ') || l.startsWith('* ')) return (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 8, width: 4, height: 4, borderRadius: '50%', background: '#420E76', opacity: 0.85 }} />
            <span style={{ flex: 1 }}>{renderInline(l.slice(2))}</span>
          </div>
        )
        return <p key={i} style={{ margin: '6px 0' }}>{renderInline(l)}</p>
      })}
    </div>
  )
}

function DescricaoTabs({ texto }: { texto: string }) {
  const tabs = useMemo(() => {
    const linhas = texto.split('\n')
    const result: { key: string; label: string; body: string[] }[] = []
    let current: { key: string; label: string; body: string[] } | null = null
    for (const l of linhas) {
      if (l.startsWith('## ')) {
        if (current) result.push(current)
        const label = l.slice(3).trim()
        current = { key: label.toLowerCase().replace(/\s+/g, '-'), label, body: [] }
      } else if (current) {
        current.body.push(l)
      }
    }
    if (current) result.push(current)
    return result.map(t => ({ ...t, body: t.body.filter((l, idx, arr) => !(idx === 0 && l.trim() === '') && !(idx === arr.length - 1 && l.trim() === '')) }))
  }, [texto])

  const [active, setActive] = useState<string>(() => tabs[0]?.key || '')

  if (tabs.length === 0) {
    return <Descricao texto={texto} />
  }

  const activeTab = tabs.find(t => t.key === active) || tabs[0]

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #ececec', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
        {tabs.map(t => (
          <button key={t.key} role="tab" aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: '12px 18px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: active === t.key ? '#420E76' : '#737373',
              background: 'transparent',
              border: 'none',
              borderBottom: active === t.key ? '2px solid #A965ED' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
            }}>
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 14, color: '#404040', lineHeight: 1.7 }}>
        {renderBlock(activeTab.body.filter(l => l !== undefined))}
      </div>
    </div>
  )
}

function shortDesc(texto: string): string {
  const bullets = texto.split('\n').filter(l => (l.startsWith('- ') || l.startsWith('* '))).slice(0, 2)
  return bullets.map(l => l.slice(2)).join(' · ')
}

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [err, setErr] = useState(false)
  const imgSrc = (!src || err) ? PLACEHOLDER : src
  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      style={{ objectFit: 'contain' }}
     
      onError={() => setErr(true)}
    />
  )
}

export default function ProdutoPage() {
  const router = useRouter()
  const params = useParams()
  const { adicionar, abrirSidebar, quantidade, currency, brlRate, setCurrency } = useCarrinho()

  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [imgAtiva, setImgAtiva] = useState(0)
  const [added, setAdded] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [whatsapp, setWhatsapp] = useState<string | null>(null)
  const [reviews, setReviews] = useState<{ id: string; nome: string; rating: number; comentario: string | null; created_at: string }[]>([])
  const [reviewForm, setReviewForm] = useState({ nome: '', rating: 5, comentario: '' })
  const [reviewSent, setReviewSent] = useState(false)
  const [reviewSending, setReviewSending] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)

  const loadProduct = useCallback(async () => {
    setLoading(true)
    setProduct(null)
    setRelated([])
    setQty(1)

    const [res, cfgRes] = await Promise.all([
      fetch(`/api/produtos/${params.id}`),
      fetch('/api/config'),
    ])
    if (!res.ok) { router.replace('/'); return }

    const raw: Product = await res.json()
    const cfg = await cfgRes.json()

    setWhatsapp(cfg.whatsapp || null)
    const decRelacionados: Record<string, RelacionadoMin[]> = {}
    if (raw.relacionados) {
      for (const k of Object.keys(raw.relacionados)) {
        decRelacionados[k] = (raw.relacionados[k] || []).map(r => ({ ...r, name: dec(r.name) ?? r.name }))
      }
    }
    const data: Product = {
      ...raw,
      name: dec(raw.name) ?? raw.name,
      brand: dec(raw.brand),
      relacionados: decRelacionados,
    }
    setProduct(data)
    setQty(Math.max(1, data.venda_minima || 1))
    setLoading(false)
    import('@vercel/analytics').then(({ track }) => {
      track('product_viewed', { product_id: data.id, product_name: data.name, brand: data.brand || '', usd: Number(data.usd_price) || 0 })
    }).catch(() => {})

    // Antes isto baixava o catálogo inteiro (386 KB com 639 produtos) para
    // escolher 4 relacionados. Agora pede só o recorte, à categoria e à marca.
    const buscar = async (qs: string) => {
      try {
        const r = await fetch(`/api/produtos?${qs}&limit=6`)
        const j = await r.json()
        return ((j.items ?? []) as Product[])
          .map(p => ({ ...p, name: dec(p.name) ?? p.name, brand: dec(p.brand) }))
          .filter(p => p.id !== data.id)
      } catch { return [] as Product[] }
    }
    const byCategory = data.categoria_id ? await buscar(`cat=${data.categoria_id}`) : []
    const rel = byCategory.length >= 2
      ? byCategory
      : (data.brand ? await buscar(`marca=${encodeURIComponent(data.brand)}`) : [])
    setRelated(rel.slice(0, 4))
  }, [params.id, router])

  useEffect(() => { loadProduct() }, [loadProduct])

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/reviews/${params.id}`).then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : [])).catch(() => {})
  }, [params.id])

  useEffect(() => {
    const onScroll = () => {
      setShowStickyBar(window.scrollY > 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const submitReview = async () => {
    if (!reviewForm.nome.trim() || !product) return
    setReviewSending(true)
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, nome: reviewForm.nome, rating: reviewForm.rating, comentario: reviewForm.comentario }),
    })
    setReviewSent(true)
    setReviewSending(false)
  }

  const tiers = product?.tiers || []
  const unitPrice = product ? priceFor(qty, product.usd_price, tiers) : 0
  const multiplicador = Math.max(1, product?.multiplicador || 1)
  const vendaMinima = Math.max(1, product?.venda_minima || 1)

  const adjustQty = (next: number) => {
    if (!product) return
    let v = Math.max(vendaMinima, next)
    if (multiplicador > 1) v = Math.ceil(v / multiplicador) * multiplicador
    if (product.estoque !== null && product.estoque !== undefined && product.estoque > 0) v = Math.min(v, product.estoque)
    setQty(v)
  }

  // img_url é a capa e costuma repetir a primeira do array; dedupe para não
  // renderizar a mesma miniatura duas vezes.
  const galeria = Array.from(new Set([product?.img_url, ...(product?.imagens ?? [])].filter(Boolean) as string[]))

  const handleAdd = () => {
    if (!product) return
    const u = priceFor(qty, product.usd_price, tiers)
    for (let i = 0; i < qty; i++) {
      adicionar({ id: product.id, name: product.name, usd: u, img: product.img_url ?? PLACEHOLDER, brand: product.brand ?? undefined })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 3000)
  }

  const handleBuyNow = () => {
    if (!product) return
    const u = priceFor(qty, product.usd_price, tiers)
    adicionar({ id: product.id, name: product.name, usd: u, img: product.img_url ?? PLACEHOLDER, brand: product.brand ?? undefined })
    router.push('/checkout')
  }

  const waLink = (productName: string) =>
    whatsapp
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${productName}`)}`
      : null

  const stockStatus = (p: Product) => {
    if (p.estoque === null) return { label: 'Em estoque', color: '#420E76', bg: 'rgba(66, 14, 118,0.06)', border: 'rgba(66, 14, 118,0.3)' }
    if (p.estoque === 0) return { label: 'Sem estoque', color: '#dc2626', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.3)' }
    if (p.estoque <= 5) return { label: `Últimas ${p.estoque} unidades`, color: '#b45309', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)' }
    return { label: `${p.estoque} em estoque`, color: '#420E76', bg: 'rgba(66, 14, 118,0.06)', border: 'rgba(66, 14, 118,0.3)' }
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', color: '#0a0a0a' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .qty-btn:hover { background: rgba(66, 14, 118,0.08) !important; color: #420E76 !important; }
        .rel-card:hover { border-color: #d4d4d4 !important; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06) !important; }
        .rel-card:hover .rel-img { filter: brightness(1.02); }
        .rel-card { transition: all 0.2s ease; }
        .rel-img { transition: filter 0.25s ease; }
        .wa-btn:hover { background: #25d366 !important; color: #fff !important; border-color: #25d366 !important; }
        .wa-btn { transition: all 0.2s; }
        .add-btn:hover { background: #0fdc00 !important; }
        .add-btn { transition: background 0.15s ease; }
        @media (max-width: 768px) {
          .product-grid { flex-direction: column !important; gap: 32px !important; }
          .product-image-col { width: 100% !important; max-width: 100% !important; }
          .product-info-col { width: 100% !important; }
          .product-name { font-size: 24px !important; }
          .price-usd { font-size: 36px !important; }
          .related-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .info-grid { grid-template-columns: 1fr !important; }
          /* Botão de comprar ficava a 1231px do topo — 1,5 tela de rolagem —
             porque estoque/descrição/SKU vinham antes do preço. Preço +
             quantidade + CTA sobem pra logo depois do título; o resto desce.
             Desktop nem entra aqui (flex-direction:row, order não se aplica
             visualmente do mesmo jeito) — zero mudança lá. */
          .product-info-col { display: flex; flex-direction: column; }
          .pdp-title { order: 1; }
          .pdp-buybox { order: 2; }
          .pdp-secondary { order: 3; }
          .pdp-infogrid { order: 4; }
        }
        @media (max-width: 640px) {
          .prod-nav-onde { display: none !important; }
          .prod-nav-btns { gap: 8px !important; }
          .product-name { font-size: 22px !important; }
          .sticky-cta-bar { display: flex !important; }
        }
      `}</style>


      {loading ? (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px', display: 'flex', gap: 56 }}>
          <div style={{ width: 480, height: 480, background: '#fafafa', border: '1px solid #ececec', borderRadius: 16, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[60, 32, 24, 80, 56, 100].map((h, i) => (
              <div key={i} style={{ height: h, background: '#fafafa', border: '1px solid #ececec', borderRadius: 8, width: i === 0 ? '40%' : i === 5 ? '100%' : '70%' }} />
            ))}
          </div>
        </div>
      ) : product ? (
        <>
          {/* PRODUCT HERO */}
          <section style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 24px 72px', animation: 'fadeUp 0.45s ease' }}>

            {/* Breadcrumb */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 36, fontSize: 11, color: '#737373', fontWeight: 600, letterSpacing: '0.04em' }}>
              <span style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#420E76' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#737373' }}
                onClick={() => router.push('/')}>INÍCIO</span>
              <span>›</span>
              <span style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#420E76' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#737373' }}
                onClick={() => router.push('/#catalogo')}>CATÁLOGO</span>
              {product.brand && (
                <>
                  <span>›</span>
                  <span style={{ color: '#525252' }}>{product.brand}</span>
                </>
              )}
              <span>›</span>
              <span style={{ color: '#404040', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
            </nav>

            <div className="product-grid" style={{ display: 'flex', gap: 64, alignItems: 'flex-start' }}>

              {/* IMAGE COL */}
              <div className="product-image-col" style={{ width: 460, flexShrink: 0 }}>
                <div style={{ position: 'sticky', top: 84 }}>
                  <div style={{
                    position: 'relative',
                    background: '#fafafa',
                    borderRadius: 16,
                    border: '1px solid #ececec',
                    overflow: 'hidden',
                    aspectRatio: '1 / 1',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36 }}>
                      <div style={{ position: 'relative', width: '100%', height: '100%', transition: 'filter 0.3s ease' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.02)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1)' }}>
                        <ProductImage src={galeria[imgAtiva] ?? product.img_url} alt={product.name} />
                      </div>
                    </div>
                  </div>

                  {galeria.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {galeria.map((src, i) => (
                        <button key={src} onClick={() => setImgAtiva(i)}
                          aria-label={`Ver imagem ${i + 1} de ${galeria.length}`}
                          aria-current={i === imgAtiva}
                          style={{ width: 64, height: 64, borderRadius: 8, padding: 4, cursor: 'pointer', background: '#fff', border: `1.5px solid ${i === imgAtiva ? '#420E76' : '#ececec'}`, position: 'relative', overflow: 'hidden' }}>
                          <Image src={src} alt="" fill sizes="64px" style={{ objectFit: 'contain', padding: 4 }} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* trust badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
                    {[
                      { icon: '■', label: 'Original' },
                      { icon: '▶', label: 'Pronta entrega' },
                      { icon: '◆', label: 'Autenticado' },
                    ].map(b => (
                      <div key={b.label} style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 10, padding: '12px 8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 14, marginBottom: 4, color: '#420E76', opacity: 0.8 }}>{b.icon}</div>
                        <div style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: '0.05em' }}>{b.label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* INFO COL */}
              <div className="product-info-col" style={{ flex: 1, minWidth: 0 }}>

                {/* No mobile o comprador tinha que rolar 1,5 tela pra chegar no
                    botão: a coluna inteira da imagem some por baixo, e ainda
                    tinha estoque/descrição/SKU antes do preço. pdp-title/
                    pdp-buybox/pdp-secondary/pdp-infogrid reordenam só no
                    mobile (globals.css) — no desktop viram flex column na
                    mesma ordem de sempre, zero mudança visual. */}
                <div className="pdp-title">
                {/* brand label */}
                {product.brand && (
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#420E76', marginBottom: 10, textTransform: 'uppercase' }}>
                    {product.brand}
                  </div>
                )}

                {/* name */}
                <h1 className="product-name" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.01em', margin: '0 0 14px', color: '#0a0a0a' }}>
                  {product.name}
                </h1>
                </div>

                <div className="pdp-secondary">
                {/* badges manuais + stock */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18, alignItems: 'center' }}>
                  {(() => {
                    const s = stockStatus(product)
                    return (
                      <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 4, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                        {s.label.toUpperCase()}
                      </span>
                    )
                  })()}
                  {product.badges && product.badges.map((b, i) => {
                    const st = badgeStyle(b)
                    return (
                      <span key={i} style={{
                        background: st.bg, color: st.color,
                        border: `1px solid ${st.border}`,
                        fontSize: 10, fontWeight: 700,
                        padding: '4px 10px', borderRadius: 4,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>{b}</span>
                    )
                  })}
                </div>

                {/* short description */}
                {(product.descricao_curta || product.descricao) && (
                  <p style={{ fontSize: 14, color: '#404040', lineHeight: 1.7, margin: '0 0 24px', display: product.descricao_curta ? 'block' : '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                    {product.descricao_curta || shortDesc(product.descricao!)}
                  </p>
                )}

                {/* SKU + Marca */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 28, fontSize: 11, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ color: '#737373', fontWeight: 700, letterSpacing: '0.1em' }}>SKU</span>
                    <span style={{ color: '#404040', fontFamily: 'monospace', background: '#fafafa', padding: '2px 8px', borderRadius: 4, border: '1px solid #ececec', letterSpacing: '0.05em' }}>
                      {product.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  {product.brand && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: '#737373', fontWeight: 700, letterSpacing: '0.1em' }}>MARCA</span>
                      <span style={{ color: '#404040' }}>{product.brand}</span>
                    </div>
                  )}
                </div>
                </div>

                <div className="pdp-buybox">
                {/* divider */}
                <div style={{ height: 1, background: '#ececec', marginBottom: 28 }} />

                {/* PRICE */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: '0.14em', marginBottom: 10 }}>PREÇO ATACADO</div>
                  <div className="price-usd" style={{ fontSize: 40, fontWeight: 900, color: '#420E76', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {currency.code} {fmt(unitPrice, currency.rate, currency.code)}
                  </div>
                  {unitPrice < product.usd_price && (
                    <div style={{ fontSize: 12, color: '#525252', marginTop: 8, fontWeight: 600 }}>
                      <span style={{ textDecoration: 'line-through', color: '#a3a3a3', marginRight: 8 }}>{currency.code} {fmt(product.usd_price, currency.rate, currency.code)}</span>
                      <span style={{ color: '#420E76', fontWeight: 700 }}>
                        −{Math.round((1 - unitPrice / product.usd_price) * 100)}% por volume
                      </span>
                    </div>
                  )}
                  {currency.code !== 'USD' && (
                    <div style={{ fontSize: 11, color: '#737373', marginTop: 6, fontWeight: 500 }}>
                      USD {unitPrice.toFixed(2)} · por unidade
                    </div>
                  )}
                  {currency.code === 'USD' && (
                    <div style={{ fontSize: 11, color: '#737373', marginTop: 6, fontWeight: 500 }}>
                      ≈ R$ {fmt(unitPrice, brlRate, 'BRL')} · por unidade
                    </div>
                  )}
                </div>

                {/* TIER TABLE */}
                {tiers.length > 0 && (
                  <div style={{ marginBottom: 28, background: '#fafafa', border: '1px solid #ececec', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#525252', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Preço por volume</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', color: '#525252', fontWeight: 700, padding: '6px 8px', letterSpacing: '0.1em', fontSize: 10, textTransform: 'uppercase' }}>Quantidade</th>
                          <th style={{ textAlign: 'right', color: '#525252', fontWeight: 700, padding: '6px 8px', letterSpacing: '0.1em', fontSize: 10, textTransform: 'uppercase' }}>Preço por un.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tiers.map((t, i) => {
                          const active = qty >= t.qty_min && (t.qty_max == null || qty <= t.qty_max)
                          const label = t.qty_max == null
                            ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 10, background: 'rgba(66, 14, 118,0.08)', color: '#420E76', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>{t.qty_min}+</span>
                                <span style={{ opacity: 0.7 }}>un.</span>
                              </span>)
                            : (<>{t.qty_min}–{t.qty_max} un.</>)
                          return (
                            <tr key={i} style={{ background: active ? 'rgba(66, 14, 118,0.06)' : 'transparent', borderTop: '1px solid #ececec' }}>
                              <td style={{ padding: '10px 8px', color: active ? '#420E76' : '#404040', fontWeight: active ? 800 : 600 }}>{label}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', color: active ? '#420E76' : '#0a0a0a', fontWeight: active ? 900 : 700, fontVariantNumeric: 'tabular-nums' }}>
                                {currency.code} {fmt(Number(t.usd_price), currency.rate, currency.code)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* QUANTITY */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: '0.14em', marginBottom: 12 }}>QUANTIDADE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'fit-content', border: '1px solid #d4d4d4', borderRadius: 10, overflow: 'hidden', background: '#ffffff' }}>
                    <button className="qty-btn" onClick={() => adjustQty(qty - multiplicador)}
                      style={{ width: 50, height: 50, background: '#ffffff', border: 'none', color: '#404040', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      −
                    </button>
                    <div style={{ width: 64, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#0a0a0a', background: '#fafafa', borderLeft: '1px solid #ececec', borderRight: '1px solid #ececec' }}>
                      {qty}
                    </div>
                    <button className="qty-btn" onClick={() => adjustQty(qty + multiplicador)}
                      style={{ width: 50, height: 50, background: '#ffffff', border: 'none', color: '#404040', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                      disabled={product.estoque !== null && product.estoque !== undefined && qty >= product.estoque}>
                      +
                    </button>
                  </div>
                  {(multiplicador > 1 || vendaMinima > 1 || product.unidade_venda) && (
                    <div style={{ fontSize: 11, color: '#737373', marginTop: 10, lineHeight: 1.5 }}>
                      {product.unidade_venda && <span>Unidade: <span style={{ color: '#404040' }}>{product.unidade_venda}</span> · </span>}
                      {multiplicador > 1 && <span>Venda em caixas de <span style={{ color: '#420E76', fontWeight: 700 }}>{multiplicador}</span> un.</span>}
                      {multiplicador > 1 && vendaMinima > 1 && <span> · </span>}
                      {vendaMinima > 1 && <span>Mínimo <span style={{ color: '#420E76', fontWeight: 700 }}>{vendaMinima}</span> un./pedido</span>}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#404040', marginTop: 10 }}>
                    Total: <span style={{ color: '#420E76', fontWeight: 800 }}>{currency.code} {fmt(unitPrice * qty, currency.rate, currency.code)}</span>
                  </div>
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {product.estoque === 0 ? (
                    <div style={{ padding: '18px 0', textAlign: 'center', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#dc2626', fontSize: 14, fontWeight: 700 }}>
                      Produto sem estoque no momento
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={handleAdd} className="add-btn"
                        style={{
                          flex: 1, padding: '18px 0', borderRadius: 12, border: 'none',
                          background: added ? 'rgba(66, 14, 118,0.12)' : '#420E76',
                          color: added ? '#420E76' : '#ffffff',
                          fontSize: 14, fontWeight: 800, letterSpacing: '0.1em',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                          boxShadow: added ? 'none' : '0 4px 12px rgba(66, 14, 118,0.18)',
                        }}>
                        {added ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ADICIONADO
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                            ADICIONAR AO CARRINHO
                          </>
                        )}
                      </button>
                      <button onClick={handleBuyNow}
                        style={{ flex: '0 0 auto', padding: '18px 22px', borderRadius: 12, border: '1px solid rgba(66, 14, 118,0.4)', background: '#ffffff', color: '#420E76', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66, 14, 118,0.06)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff' }}>
                        COMPRAR AGORA
                      </button>
                    </div>
                  )}

                  {added && (
                    <button onClick={abrirSidebar}
                      style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: '1px solid rgba(66, 14, 118,0.4)', background: '#ffffff', color: '#420E76', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66, 14, 118,0.06)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff' }}>
                      VER CARRINHO →
                    </button>
                  )}

                  {/* WhatsApp */}
                  {whatsapp && (
                    <a href={waLink(product.name)!} target="_blank" rel="noopener noreferrer"
                      className="wa-btn"
                      style={{
                        width: '100%', padding: '13px 0', borderRadius: 12,
                        border: '1px solid rgba(37,211,102,0.4)',
                        background: '#ffffff',
                        color: '#25d366', fontSize: 12, fontWeight: 700,
                        letterSpacing: '0.08em', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        textDecoration: 'none',
                        boxSizing: 'border-box' as const,
                      }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      FALAR NO WHATSAPP
                    </a>
                  )}
                </div>
                </div>

                <div className="pdp-infogrid">
                {/* divider */}
                <div style={{ height: 1, background: '#ececec', margin: '32px 0' }} />

                {/* info grid */}
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'PAGAMENTO', value: 'PIX à vista' },
                    { label: 'RETIRADA', value: 'Em loja' },
                    { label: 'PROCEDÊNCIA', value: 'Atacado B2B' },
                    { label: 'DISPONIBILIDADE', value: product.estoque === null ? 'Imediata' : product.estoque > 0 ? 'Imediata' : 'Indisponível' },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#fafafa', border: '1px solid #ececec', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 9, color: '#737373', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </div>
          </section>

          {/* DESCRIPTION CARD */}
          {(product.descricao || (product.custom_field_defs && product.custom_field_defs.length > 0 && product.custom_fields && Object.keys(product.custom_fields).length > 0)) && (
            <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: '40px 44px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {product.descricao && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <h2 style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#525252' }}>DESCRIÇÃO TÉCNICA</h2>
                    </div>
                    <DescricaoTabs texto={product.descricao} />
                  </>
                )}

                {/* CUSTOM FIELDS */}
                {(() => {
                  const cf = product.custom_fields || {}
                  const defs = (product.custom_field_defs || []).filter(d => {
                    const v = cf[d.field_key]
                    return v !== undefined && v !== null && v !== ''
                  })
                  if (defs.length === 0) return null
                  return (
                    <div style={{ marginTop: product.descricao ? 40 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#525252' }}>ESPECIFICAÇÕES</h2>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>
                          {defs.map((d, i) => {
                            const raw = (product.custom_fields || {})[d.field_key]
                            let v: string
                            if (d.field_type === 'boolean') v = raw ? 'Sim' : 'Não'
                            else if (Array.isArray(raw)) v = raw.join(', ')
                            else v = String(raw)
                            return (
                              <tr key={d.field_key} style={{ borderBottom: i < defs.length - 1 ? '1px solid #ececec' : 'none' }}>
                                <td style={{ padding: '14px 0', color: '#737373', fontWeight: 600, letterSpacing: '0.04em', width: '40%' }}>{d.label}</td>
                                <td style={{ padding: '14px 0', color: '#0a0a0a', textAlign: 'right' }}>{v}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </section>
          )}

          {/* RELATED PRODUCTS */}
          {related.length > 0 && (
            <section style={{ borderTop: '1px solid #ececec', padding: '56px 24px 64px', background: '#fafafa' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: '#525252' }}>
                    PRODUTOS RELACIONADOS
                  </h2>
                </div>
                <div className="related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                  {related.map(p => (
                    <div key={p.id} className="rel-card"
                      onClick={() => { router.push(`/produtos/${p.id}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)', overflow: 'hidden' }}>
                        <RelImg src={p.img_url} alt={p.name} />
                      </div>
                      <div style={{ padding: '14px' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', margin: '0 0 10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                          {p.name}
                        </p>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#420E76' }}>
                          {currency.code} {fmt(p.usd_price, currency.rate, currency.code)}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); adicionar({ id: p.id, name: p.name, usd: p.usd_price, img: p.img_url ?? PLACEHOLDER, brand: p.brand ?? undefined }) }}
                          style={{ marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 6, background: '#ffffff', border: '1px solid rgba(66, 14, 118,0.4)', color: '#420E76', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#A965ED'; (e.currentTarget as HTMLButtonElement).style.color = '#000' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.color = '#420E76' }}>
                          + ADICIONAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* COMPRE JUNTO (cross-sell) */}
          {product.relacionados?.compre_junto && product.relacionados.compre_junto.length > 0 && (
            <section style={{ borderTop: '1px solid #ececec', padding: '48px 24px 56px', background: '#ffffff' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: '#525252' }}>
                    COMPRE JUNTO
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' as const }}>
                  {product.relacionados.compre_junto.map(cj => (
                    <div key={cj.id} className="rel-card"
                      onClick={() => { router.push(`/produtos/${cj.id}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', flex: '0 0 140px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ position: 'relative', height: 120, background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)', overflow: 'hidden' }}>
                        <RelImg src={cj.img_url} alt={cj.name} />
                      </div>
                      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <p style={{ fontSize: 10.5, fontWeight: 600, color: '#0a0a0a', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', minHeight: 28 }}>
                          {cj.name}
                        </p>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#420E76' }}>
                          {currency.code} {fmt(cj.usd_price, currency.rate, currency.code)}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); adicionar({ id: cj.id, name: cj.name, usd: cj.usd_price, img: cj.img_url ?? PLACEHOLDER }) }}
                          style={{ marginTop: 'auto', width: '100%', padding: '6px 0', borderRadius: 6, background: '#ffffff', border: '1px solid rgba(66, 14, 118,0.4)', color: '#420E76', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#A965ED'; (e.currentTarget as HTMLButtonElement).style.color = '#000' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.color = '#420E76' }}>
                          + ADICIONAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Avaliações */}
          {product && (
            <section style={{ maxWidth: 900, margin: '56px auto 0', padding: '0 24px 80px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 28 }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: '#525252', letterSpacing: '0.14em', margin: 0 }}>AVALIAÇÕES</h2>
                {reviews.length > 0 && (
                  <span style={{ fontSize: 11, color: '#737373', fontWeight: 600 }}>{reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}</span>
                )}
              </div>
              {reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 40 }}>
                  {reviews.map((r, idx) => (
                    <div key={r.id} style={{ padding: '20px 0', borderBottom: idx < reviews.length - 1 ? '1px solid #ececec' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{r.nome}</span>
                        <span style={{ color: '#F7C528', letterSpacing: 2, fontSize: 13 }}>{Array.from({ length: 5 }, (_, i) => i < r.rating ? '★' : '☆').join('')}</span>
                        <span style={{ fontSize: 11, color: '#a3a3a3' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {r.comentario && <p style={{ fontSize: 13, color: '#404040', margin: 0, lineHeight: 1.7 }}>{r.comentario}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#a3a3a3', marginBottom: 32 }}>Sem avaliações ainda. Seja o primeiro!</p>
              )}

              {/* Formulário */}
              <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#525252', marginBottom: 20, letterSpacing: '0.14em' }}>DEIXE SUA AVALIAÇÃO</p>
                {reviewSent ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#420E76' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Obrigado!</p>
                    <p style={{ fontSize: 12, color: '#737373', marginTop: 6 }}>Sua avaliação será publicada após aprovação.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>SEU NOME</p>
                      <input value={reviewForm.nome} onChange={e => setReviewForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome"
                        style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, color: '#0a0a0a', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>NOTA</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                            style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: n <= reviewForm.rating ? '#F7C528' : '#d4d4d4', transition: 'color 0.1s' }}>
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>COMENTÁRIO (opcional)</p>
                      <textarea value={reviewForm.comentario} onChange={e => setReviewForm(f => ({ ...f, comentario: e.target.value }))}
                        placeholder="Conte sua experiência com o produto..."
                        rows={3}
                        style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, color: '#0a0a0a', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }} />
                    </div>
                    <button onClick={submitReview} disabled={reviewSending || !reviewForm.nome.trim()}
                      style={{ padding: '13px', background: !reviewForm.nome.trim() ? '#fafafa' : '#A965ED', color: !reviewForm.nome.trim() ? '#a3a3a3' : '#000', border: !reviewForm.nome.trim() ? '1px solid #ececec' : 'none', borderRadius: 10, fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', cursor: reviewSending ? 'wait' : 'pointer', boxShadow: !reviewForm.nome.trim() ? 'none' : '0 4px 12px rgba(66, 14, 118,0.18)' }}>
                      {reviewSending ? 'ENVIANDO...' : 'ENVIAR AVALIAÇÃO'}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* STICKY CTA BAR MOBILE */}
          {product.estoque !== 0 && showStickyBar && (
            <div className="sticky-cta-bar" style={{
              display: 'none',
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid #ececec',
              padding: '10px 16px',
              zIndex: 200,
              alignItems: 'center', gap: 12,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#737373', letterSpacing: '0.12em' }}>PREÇO ATACADO</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#420E76', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                  {currency.code} {fmt(unitPrice, currency.rate, currency.code)}
                </div>
              </div>
              <button onClick={handleAdd}
                style={{
                  padding: '14px 22px', borderRadius: 10, border: 'none',
                  background: added ? 'rgba(66, 14, 118,0.12)' : '#A965ED',
                  color: added ? '#420E76' : '#000',
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: added ? 'none' : '0 4px 12px rgba(66, 14, 118,0.18)',
                }}>
                {added ? 'ADICIONADO' : 'ADICIONAR'}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function RelImg({ src, alt }: { src: string | null; alt: string }) {
  const [err, setErr] = useState(false)
  const imgSrc = (!src || err) ? PLACEHOLDER : src
  return <Image src={imgSrc} alt={alt} fill className="rel-img" style={{ objectFit: 'contain', padding: 12 }} onError={() => setErr(true)} />
}
