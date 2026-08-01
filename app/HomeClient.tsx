'use client'

import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCarrinho, currencies } from '@/components/CarrinhoContext'
import { WHATSAPP_ENABLED } from '@/lib/site'

const CONTATO_HREF = 'https://wa.me/595994222774'

type Product = {
  id: string; name: string; brand: string | null; usd_price: number
  img_url: string | null; estoque: number | null
  descricao_curta?: string | null
  badges?: string[] | null
  categoria_id?: string | null
  usd_price_promo?: number | null
  venda_minima?: number
  multiplicador?: number
  rating?: number | null
  rating_total?: number
}

type Categoria = { id: string; nome: string; parent_id: string | null; produtos: number }

type SortBy = 'destaque' | 'price_asc' | 'price_desc' | 'newest' | 'promo' | 'name'

const SORT_LABELS: Record<SortBy, string> = {
  destaque: 'Mais relevantes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  newest: 'Mais novos',
  promo: 'Em promoção',
  name: 'Nome A-Z',
}

const BADGE_COLORS_CARD: Record<string, { bg: string; color: string; border: string }> = {
  'novo': { bg: 'rgba(0,180,210,0.10)', color: '#0891b2', border: 'rgba(0,180,210,0.4)' },
  'mais vendido': { bg: 'rgba(245,158,11,0.12)', color: '#b45309', border: 'rgba(245,158,11,0.45)' },
  'promoção': { bg: 'rgba(109,40,217,0.10)', color: '#6d28d9', border: 'rgba(109,40,217,0.4)' },
  'promocao': { bg: 'rgba(109,40,217,0.10)', color: '#6d28d9', border: 'rgba(109,40,217,0.4)' },
  'lançamento': { bg: 'rgba(190,40,180,0.10)', color: '#a21caf', border: 'rgba(190,40,180,0.4)' },
  'lancamento': { bg: 'rgba(190,40,180,0.10)', color: '#a21caf', border: 'rgba(190,40,180,0.4)' },
}
const cardBadge = (txt: string) => BADGE_COLORS_CARD[txt.trim().toLowerCase()] ?? { bg: '#f5f5f5', color: '#737373', border: '#d4d4d4' }

const PLACEHOLDER = '/produto-placeholder.svg'

const CAT_COLORS = ['#6d28d9', '#0891b2', '#a21caf', '#b45309', '#7c3aed', '#0e7490', '#be185d', '#047857']
const catColor = (id: string) => CAT_COLORS[Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CAT_COLORS.length]

function CardImg({ src, alt }: { src: string | null; alt: string }) {
  const [err, setErr] = useState(false)
  const imgSrc = (!src || err) ? PLACEHOLDER : src
  return (
    <Image src={imgSrc} alt={alt} fill className="card-img"
      style={{ objectFit: 'contain', transition: 'transform 0.4s ease, filter 0.3s ease', padding: 0 }}
      onError={() => setErr(true)} />
  )
}

const DEFAULT_BANNERS = [
  {
    tag: 'MAIS VENDIDO',
    title: ['BIOGENESIS', 'EMAGRECIMENTO'],
    sub: 'A marca mais procurada do catálogo. Tirzepatida com procedência garantida e estoque permanente.',
    cta: 'VER OFERTA',
    href: '/produtos/3ff19b39-7178-497e-abfe-47d4c8d47eef',
    color: '#c084fc',
    bg: 'radial-gradient(ellipse 75% 75% at 25% 40%, rgba(168,85,247,0.38) 0%, transparent 58%), radial-gradient(ellipse 55% 55% at 85% 85%, rgba(250,204,21,0.28) 0%, transparent 60%), linear-gradient(135deg, #1a0a2e 0%, #0a0a0a 50%, #1a1005 100%)',
    productImg: 'https://xjmapfpfgwoivlsalltb.supabase.co/storage/v1/object/public/produtos/catalogo/3ff19b39-7178-497e-abfe-47d4c8d47eef/img_6355.webp',
    brandFilter: 'BIOGENESIS',
  },
  {
    tag: 'IMPORTADO ORIGINAL',
    title: ['PERFUMES', 'ÁRABES'],
    sub: 'Fragrâncias importadas de alta fixação. Edições limitadas com procedência garantida.',
    cta: 'VER PERFUMES',
    href: '/produtos/39123d03-5f42-481e-a49b-44ea317aa57b',
    color: '#facc15',
    bg: 'radial-gradient(ellipse 75% 75% at 75% 35%, rgba(250,204,21,0.40) 0%, transparent 58%), radial-gradient(ellipse 55% 55% at 15% 85%, rgba(168,85,247,0.30) 0%, transparent 60%), linear-gradient(135deg, #1a1005 0%, #0a0a0a 50%, #1a0a2e 100%)',
    productImg: 'https://xjmapfpfgwoivlsalltb.supabase.co/storage/v1/object/public/produtos/catalogo/39123d03-5f42-481e-a49b-44ea317aa57b/atacado-al-haramain-amber-oud-gold-edition-extreme-refil-paraguai-scaled-1.webp',
    brandFilter: 'AL HARAMAIN',
  },
  {
    tag: 'LINHA PREMIUM',
    title: ['ZPHC', 'PEPTÍDEOS'],
    sub: 'A marca de performance mais respeitada da Europa. Estoque permanente e rastreabilidade completa.',
    cta: 'EXPLORAR ZPHC',
    href: '/produtos/e02c1c13-0809-4f0d-a297-60e4f0a25526',
    color: '#a78bfa',
    bg: 'radial-gradient(ellipse 70% 70% at 50% 28%, rgba(168,85,247,0.36) 0%, transparent 55%), radial-gradient(ellipse 70% 70% at 50% 92%, rgba(250,204,21,0.30) 0%, transparent 55%), linear-gradient(135deg, #150a28 0%, #0a0a0a 45%, #1a1206 100%)',
    productImg: 'https://xjmapfpfgwoivlsalltb.supabase.co/storage/v1/object/public/produtos/catalogo/e02c1c13-0809-4f0d-a297-60e4f0a25526/atacado-zphc-zptrop-320-iu-10-vial.webp',
    brandFilter: 'ZPHC',
  },
]

const BG_BY_COLOR: Record<string, string> = {
  '#c084fc': 'radial-gradient(ellipse 75% 75% at 25% 40%, rgba(168,85,247,0.38) 0%, transparent 58%), radial-gradient(ellipse 55% 55% at 85% 85%, rgba(250,204,21,0.28) 0%, transparent 60%), linear-gradient(135deg, #1a0a2e 0%, #0a0a0a 50%, #1a1005 100%)',
  '#facc15': 'radial-gradient(ellipse 75% 75% at 75% 35%, rgba(250,204,21,0.40) 0%, transparent 58%), radial-gradient(ellipse 55% 55% at 15% 85%, rgba(168,85,247,0.30) 0%, transparent 60%), linear-gradient(135deg, #1a1005 0%, #0a0a0a 50%, #1a0a2e 100%)',
  '#a78bfa': 'radial-gradient(ellipse 70% 70% at 50% 28%, rgba(168,85,247,0.36) 0%, transparent 55%), radial-gradient(ellipse 70% 70% at 50% 92%, rgba(250,204,21,0.30) 0%, transparent 55%), linear-gradient(135deg, #150a28 0%, #0a0a0a 45%, #1a1206 100%)',
}

const dec = (s: string | null) => {
  if (!s) return null
  try {
    const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch { return s }
}

const fmt = (n: number, rate: number, code: string) => {
  const v = n * rate
  if (code === 'PYG') return v.toLocaleString('es-PY', { maximumFractionDigits: 0 })
  return v.toFixed(2).replace('.', ',')
}

const PAGE_SIZE = 12
const INITIAL_PAGE = 20
const PROMO_BANNER_AFTER = 10

const TRUST_ITEMS = [
  { icon: '📦', text: '+200 PRODUTOS EM ESTOQUE' },
  { icon: '⚡', text: 'PIX CONFIRMADO EM < 30 MIN' },
  { icon: '🇧🇷', text: 'ATENDIMENTO 100% EM PORTUGUÊS' },
  ...(WHATSAPP_ENABLED ? [{ icon: '💬', text: 'RESPOSTA WHATSAPP EM 12 MIN' }] : []),
  { icon: '🔒', text: 'COMPRA 100% SEGURA' },
  { icon: '✈️', text: 'IMPORTADO DIRETO DO PARAGUAI' },
]

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [slide, setSlide] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [activeBrand, setActiveBrand] = useState('Todos')
  const [activeCategoria, setActiveCategoria] = useState(() => searchParams.get('cat') ?? '')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('destaque')
  const [sortOpen, setSortOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [refetching, setRefetching] = useState(false)
  const [banners, setBanners] = useState(DEFAULT_BANNERS)
  const [destaques, setDestaques] = useState<string[]>([])
  const [aviso, setAviso] = useState('')
  const { currency, setCurrency, adicionar, abrirSidebar, quantidade } = useCarrinho()
  const [filterOpen, setFilterOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE)
  const [fabVisible, setFabVisible] = useState(false)
  const firstLoad = useRef(true)
  const revealedCards = useRef(new Set<string>())

  // Sync category filter with URL ?cat= param
  useEffect(() => {
    const cat = searchParams.get('cat') ?? ''
    setActiveCategoria(cat)
    if (cat) {
      setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [searchParams])

  useEffect(() => {
    Promise.all([
      fetch('/api/produtos').then(r => r.json()),
      fetch('/api/home-config').then(r => r.json()).catch(() => null),
      fetch('/api/categorias').then(r => r.json()).catch(() => []),
    ]).then(([data, cfg, cats]) => {
      const prods: Product[] = data.map((p: Product) => ({ ...p, name: dec(p.name) ?? p.name, brand: dec(p.brand) }))
      setProducts(prods)
      setCategorias(cats || [])
      setLoadingProducts(false)
      setBanners(prev => prev.map(bn => {
        const m = bn.href.match(/\/produtos\/([a-z0-9-]+)/)
        if (!m) return bn
        const prod = prods.find(p => p.id === m[1])
        return prod?.img_url && !prod.img_url.includes('atacadoparaguai.com') ? { ...bn, productImg: prod.img_url } : bn
      }))
      if (cfg) {
        if (cfg.banners) {
          setBanners(cfg.banners.map((b: any, i: number) => {
            const base = DEFAULT_BANNERS[i] ?? DEFAULT_BANNERS[0]
            return {
              ...base,
              tag: b.tag || base.tag,
              title: [b.title1 || base.title[0], b.title2 || base.title[1]],
              sub: b.sub || base.sub,
              cta: b.cta || base.cta,
              href: b.href || base.href,
              color: b.color || base.color,
              bg: BG_BY_COLOR[b.color] || base.bg,
              productImg: b.productImg || base.productImg,
              brandFilter: b.brandFilter || base.brandFilter,
            }
          }))
        }
        if (cfg.destaques?.length) setDestaques(cfg.destaques)
        if (cfg.aviso) setAviso(cfg.aviso)
      }
    })
  }, [])

  useEffect(() => {
    if (hovering) return
    const t = setInterval(() => setSlide(p => (p + 1) % banners.length), 5500)
    return () => clearInterval(t)
  }, [banners.length, hovering])

  useEffect(() => {
    setVisibleCount(INITIAL_PAGE)
  }, [debouncedSearch, activeBrand, activeCategoria, sortBy])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return }
    const params = new URLSearchParams()
    if (sortBy !== 'destaque') params.set('sort', sortBy)
    if (debouncedSearch.length >= 2) params.set('q', debouncedSearch)
    const qs = params.toString()
    setRefetching(true)
    fetch(`/api/produtos${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then((data: Product[]) => {
        setProducts(data.map((p: Product) => ({ ...p, name: dec(p.name) ?? p.name, brand: dec(p.brand) })))
      })
      .finally(() => setRefetching(false))
  }, [sortBy, debouncedSearch])

  useEffect(() => {
    const onScroll = () => setFabVisible(window.scrollY > 800)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  const childrenOf = (id: string) => categorias.filter(c => c.parent_id === id).map(c => c.id)
  const catFilterIds = activeCategoria
    ? new Set([activeCategoria, ...childrenOf(activeCategoria)])
    : null

  const topCats = categorias.filter(c => !c.parent_id && (
    c.produtos > 0 || categorias.some(ch => ch.parent_id === c.id && ch.produtos > 0)
  ))
  const catTotals = (c: Categoria) => c.produtos + categorias.filter(ch => ch.parent_id === c.id).reduce((s, ch) => s + ch.produtos, 0)
  topCats.sort((a, b) => catTotals(b) - catTotals(a))

  const brands = ['Todos', ...Array.from(new Set(products.map(p => p.brand).filter((x): x is string => Boolean(x))))]

  const sortedProducts = useMemo(() => {
    if (sortBy !== 'destaque') return products
    return destaques.length
      ? [...products.filter(p => destaques.includes(p.id)), ...products.filter(p => !destaques.includes(p.id))]
      : products
  }, [products, destaques, sortBy])

  const searchTerm = debouncedSearch.toLowerCase()
  const clientSearchActive = debouncedSearch.length > 0 && debouncedSearch.length < 2

  const filtered = sortedProducts.filter(p =>
    (!catFilterIds || (p.categoria_id ? catFilterIds.has(p.categoria_id) : false)) &&
    (activeBrand === 'Todos' || p.brand === activeBrand) &&
    (!clientSearchActive || p.name.toLowerCase().includes(searchTerm) || (p.brand ?? '').toLowerCase().includes(searchTerm))
  )
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (loadingProducts) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement
          const id = el.dataset.cardId ?? ''
          if (!revealedCards.current.has(id)) {
            revealedCards.current.add(id)
            el.classList.remove('card-pre-reveal')
            obs.unobserve(el)
          }
        }
      })
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' })
    document.querySelectorAll('.product-card[data-card-id]').forEach(el => {
      const id = (el as HTMLElement).dataset.cardId ?? ''
      if (!revealedCards.current.has(id)) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [visible, loadingProducts])

  const destaquesProdutos = useMemo(
    () => destaques.length ? products.filter(p => destaques.includes(p.id)) : [],
    [products, destaques]
  )

  const bannerBrandProds = useMemo(
    () => banners.map(bn => {
      const filter = (bn as any).brandFilter ?? ''
      if (!filter || loadingProducts) return [] as Product[]
      return products
        .filter(p => p.brand?.toUpperCase() === filter.toUpperCase() && p.img_url && p.img_url !== PLACEHOLDER && !p.img_url.includes('placeholder') && !p.img_url.includes('atacadoparaguai.com'))
        .slice(0, 3)
    }),
    [banners, products, loadingProducts]
  )

  const brandCounts = useMemo(
    () => products.reduce((acc, p) => {
      if (p.brand) acc[p.brand] = (acc[p.brand] ?? 0) + 1
      return acc
    }, {} as Record<string, number>),
    [products]
  )

  const topBrands = useMemo(
    () => Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
    [brandCounts]
  )

  const isPromo = (p: Product) => p.usd_price_promo != null && p.usd_price_promo < p.usd_price
  const effectiveBadges = (p: Product) => {
    const base = (p.badges ?? []).slice()
    if (isPromo(p) && !base.some(b => b.toLowerCase().includes('promo'))) base.unshift('promoção')
    return base
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: '#ffffff', color: '#0a0a0a' }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dnaRotate {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 currentColor; }
          50% { transform: scale(1.15); opacity: 0.85; box-shadow: 0 0 0 4px transparent; }
        }
        @keyframes glassFadeIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes moleculeSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes laserRay {
          0%, 100% { opacity: 0.1; }
          40% { opacity: 0.8; }
          60% { opacity: 0.5; }
        }
        @keyframes heroScanline {
          0% { top: -3px; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes cardRevealAnim {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes priceSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes verifiedPop {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          70% { transform: scale(1.1) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes glassBorderGlow {
          0%, 100% { box-shadow-opacity: 0.6; filter: brightness(1); }
          50% { filter: brightness(1.08); }
        }
        .card-pre-reveal { opacity: 0 !important; transform: translateY(28px) scale(0.96) !important; }
        .product-card { transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1), border-color 0.22s, box-shadow 0.22s !important; }
        .product-card:not(.card-pre-reveal) .price-display { animation: priceSlideUp 0.5s 0.28s cubic-bezier(0.16,1,0.3,1) both; }
        .hero-glass-card { perspective: 1000px; }
        .hero-particle { position: absolute; border-radius: 50%; pointer-events: none; }
        .hero-stat-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); backdrop-filter: blur(8px); color: #d4d4d4; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
        .hero-stat-chip svg { color: currentColor; opacity: 0.85; }
        .hero-cta-secondary:hover { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.25) !important; }
        .hero-cta-primary:hover { transform: translateY(-1px); }
        .hero-arrow-btn:hover { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.3) !important; }
        .nav-link { position: relative; }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 50%; right: 50%;
          height: 1px; background: #8b5cf6;
          box-shadow: 0 0 6px rgba(109,40,217,0.4);
          transition: left 0.25s, right 0.25s;
        }
        .nav-link:hover::after { left: 0; right: 0; }
        .product-card:hover { border-color: #d4d4d4 !important; box-shadow: 0 12px 28px rgba(0,0,0,0.08) !important; transform: translateY(-3px); }
        .product-card:hover .card-img { transform: scale(1.04); filter: brightness(1.02); }
        .product-card:hover .card-overlay { opacity: 1 !important; }
        .card-add-btn:hover:not(:disabled) { background: #8b5cf6 !important; color: #000 !important; border-color: #8b5cf6 !important; box-shadow: 0 4px 12px rgba(109,40,217,0.18) !important; }
        .skeleton { background: linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%); background-size: 400px 100%; animation: shimmer 1.4s ease-in-out infinite; }
        .nav-mobile-btn { display: none; }
        .nav-mobile-drawer { display: none; position: absolute; top: 60px; left: 0; right: 0; background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); border-bottom: 1px solid #ececec; padding: 12px 16px; flex-direction: column; gap: 4px; z-index: 200; box-shadow: 0 8px 16px rgba(0,0,0,0.06); }
        .nav-desktop { display: flex; align-items: center; gap: 2px; flex: 1; justify-content: center; min-width: 0; }
        .nav-cat-btn { padding: 0 12px; height: 60px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #737373; background: none; border: none; cursor: pointer; transition: color 0.15s; white-space: nowrap; }
        .nav-cat-btn:hover { color: #0a0a0a; }
        .nav-cat-btn.active { color: #6d28d9; }
        .nav-cat-btn.active::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 0; height: 2px; background: #8b5cf6; box-shadow: 0 0 6px rgba(109,40,217,0.4); }
        .nav-cat-btn { position: relative; }
        .nav-cat-skel { width: 78px; height: 12px; border-radius: 4px; flex-shrink: 0; }
        .header-account:hover { color: #0a0a0a !important; border-color: #d4d4d4 !important; }
        .header-cart:hover { box-shadow: 0 4px 12px rgba(109,40,217,0.18) !important; border-color: rgba(109,40,217,0.5) !important; }
        .trust-ticker { overflow: hidden; white-space: nowrap; }
        .trust-track { display: inline-flex; gap: 0; animation: ticker 28s linear infinite; }
        .cat-chips-wrapper { position: relative; }
        .cat-chips-wrapper::after {
          content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 40px;
          background: linear-gradient(to right, transparent, #ffffff);
          pointer-events: none;
        }
        .cat-chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
        .cat-chips::-webkit-scrollbar { display: none; }
        .cat-chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 6px 13px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; border: 1px solid; transition: all 0.15s; white-space: nowrap; background: none; }
        .cat-chip-active { background: rgba(109,40,217,0.08) !important; border-color: rgba(109,40,217,0.4) !important; color: #6d28d9 !important; }
        .cat-chip-inactive { border-color: #ececec; color: #737373; background: #ffffff; }
        .cat-chip-inactive:hover { border-color: #d4d4d4; color: #0a0a0a; }
        .destaques-scroll { display: flex; gap: 16px; overflow-x: auto; scrollbar-width: none; padding-bottom: 8px; }
        .destaques-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .como-step { animation: stepIn 0.5s ease both; }
        .como-step:nth-child(1) { animation-delay: 0.05s; }
        .como-step:nth-child(2) { animation-delay: 0.15s; }
        .como-step:nth-child(3) { animation-delay: 0.25s; }
        .brand-card { transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s; cursor: pointer; }
        .brand-card:hover { border-color: rgba(109,40,217,0.4) !important; box-shadow: 0 8px 24px rgba(109,40,217,0.08) !important; transform: translateY(-2px); }
        .footer-brand-link { transition: color 0.15s; }
        .footer-brand-link:hover { color: #6d28d9 !important; }
        @media (max-width: 640px) {
          /* nav */
          .promo-banners-row { grid-template-columns: 1fr !important; }
          .nav-rate { display: none !important; }
          .nav-cart-txt { display: none !important; }
          .nav-acct-txt { display: none !important; }
          .nav-mobile-btn { display: flex !important; align-items: center; justify-content: center; width: 36px; height: 36px; background: #fafafa; border: 1px solid #ececec; border-radius: 8px; color: #404040; cursor: pointer; font-size: 18px; }
          .nav-mobile-drawer.open { display: flex !important; }
          /* hero — compacto no mobile */
          .hero-section { height: auto !important; min-height: 320px !important; }
          .hero-inner { flex-direction: row !important; padding: 28px 20px 32px !important; gap: 16px !important; align-items: center !important; }
          .hero-text { width: 100% !important; flex: 1 !important; }
          .hero-product { display: none !important; }
          .hero-sub { display: none !important; }
          .hero-stats-row { display: none !important; }
          .hero-cta-secondary { display: none !important; }
          .hero-cta-primary { padding: 11px 20px !important; font-size: 12px !important; }
          .hero-dna { display: none !important; }
          /* catálogo */
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .card-img-wrap { padding: 10px !important; }
          .ver-mais-btn { padding: 12px 24px !important; font-size: 11px !important; }
          /* como funciona — scroll horizontal */
          .como-grid { display: flex !important; overflow-x: auto !important; gap: 12px !important; scrollbar-width: none !important; padding-bottom: 4px !important; }
          .como-grid::-webkit-scrollbar { display: none !important; }
          .como-step { min-width: 230px !important; flex-shrink: 0 !important; }
          /* marcas — scroll horizontal */
          .brand-grid { display: flex !important; overflow-x: auto !important; gap: 8px !important; scrollbar-width: none !important; padding-bottom: 4px !important; flex-wrap: nowrap !important; }
          .brand-grid::-webkit-scrollbar { display: none !important; }
          .brand-card { min-width: 100px !important; flex-shrink: 0 !important; }
          /* seções intermediárias — padding reduzido */
          .como-section { padding: 28px 16px !important; }
          .marcas-section { padding: 24px 16px !important; }
          .catalogo-section { padding: 28px 16px 40px !important; }
          /* footer */
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>


      {aviso && (
        <div style={{ background: 'rgba(109,40,217,0.06)', borderBottom: '1px solid rgba(109,40,217,0.2)', padding: '8px 24px', textAlign: 'center', fontSize: 12, color: '#6d28d9', fontWeight: 600, letterSpacing: '0.04em' }}>
          {aviso}
        </div>
      )}

      {/* HERO */}
      <section className="hero-section" role="region" aria-label="Banners principais"
        onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        style={{ position: 'relative', height: 600, overflow: 'hidden', background: banners[slide].bg, transition: 'background 0.8s ease' }}>

        <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none' }}>
          <defs>
            <pattern id="hexPattern" x="0" y="0" width="56" height="48.5" patternUnits="userSpaceOnUse">
              <path d="M28 0 L56 16 L56 48.5 L28 64.5 L0 48.5 L0 16 Z" fill="none" stroke={banners[slide].color} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexPattern)" />
        </svg>

        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)', pointerEvents: 'none' }} />

        {/* Scanline */}
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${banners[slide].color}40 30%, ${banners[slide].color}80 50%, ${banners[slide].color}40 70%, transparent 100%)`, animation: 'heroScanline 9s linear infinite', pointerEvents: 'none', zIndex: 3, filter: 'blur(1px)' }} />

        {/* Laser beams SVG — 5 rays */}
        <svg aria-hidden="true" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          <defs>
            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {[
            { x2: 1200, y2: 0,   delay: '0s',   dur: '5s' },
            { x2: 1200, y2: 600, delay: '1.2s', dur: '6s' },
            { x2: 0,    y2: 100, delay: '0.6s', dur: '5.5s' },
            { x2: 0,    y2: 500, delay: '2s',   dur: '7s' },
            { x2: 600,  y2: 0,   delay: '1.8s', dur: '6.5s' },
          ].map((l, i) => (
            <line key={i} x1="900" y1="300" x2={l.x2} y2={l.y2}
              stroke={banners[slide].color} strokeWidth="1"
              filter="url(#laserGlow)"
              style={{ animation: `laserRay ${l.dur} ease-in-out infinite`, animationDelay: l.delay }} />
          ))}
        </svg>

        <div aria-hidden="true" className="hero-dna" style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', width: 120, height: 360, opacity: 0.20, pointerEvents: 'none', animation: 'dnaRotate 40s linear infinite', transformStyle: 'preserve-3d' }}>
          <svg viewBox="0 0 120 360" width="120" height="360" fill="none">
            <path d="M30 0 Q90 45 30 90 Q-30 135 30 180 Q90 225 30 270 Q-30 315 30 360" stroke={banners[slide].color} strokeWidth="2" />
            <path d="M90 0 Q30 45 90 90 Q150 135 90 180 Q30 225 90 270 Q150 315 90 360" stroke={banners[slide].color} strokeWidth="2" />
            {Array.from({ length: 13 }).map((_, i) => {
              const y = i * 30
              const x1 = 30 + Math.sin((i / 12) * Math.PI * 2) * 30
              const x2 = 90 - Math.sin((i / 12) * Math.PI * 2) * 30
              return <line key={i} x1={x1} y1={y} x2={x2} y2={y} stroke={banners[slide].color} strokeWidth="1.5" opacity={0.6} />
            })}
          </svg>
        </div>

        {[
          { top: '14%', left: '8%', size: 5, delay: '0s', dur: '7s', op: 0.8 },
          { top: '72%', left: '12%', size: 4, delay: '1.2s', dur: '8s', op: 0.6 },
          { top: '22%', left: '46%', size: 6, delay: '2s', dur: '9s', op: 0.7 },
          { top: '64%', left: '40%', size: 4, delay: '0.6s', dur: '6s', op: 0.5 },
          { top: '18%', left: '92%', size: 5, delay: '1.8s', dur: '10s', op: 0.7 },
          { top: '82%', left: '88%', size: 4, delay: '0.4s', dur: '7.5s', op: 0.6 },
          { top: '48%', left: '4%', size: 4, delay: '2.4s', dur: '8.5s', op: 0.6 },
          { top: '36%', left: '58%', size: 5, delay: '1.4s', dur: '9.5s', op: 0.5 },
          { top: '86%', left: '54%', size: 4, delay: '0.8s', dur: '6.5s', op: 0.7 },
          { top: '8%', left: '74%', size: 4, delay: '2.8s', dur: '8s', op: 0.6 },
          { top: '30%', left: '24%', size: 3, delay: '1.6s', dur: '7.2s', op: 0.5 },
          { top: '58%', left: '70%', size: 5, delay: '0.2s', dur: '8.8s', op: 0.7 },
        ].map((d, i) => (
          <span key={i} aria-hidden="true" className="hero-particle" style={{ top: d.top, left: d.left, width: d.size, height: d.size, background: banners[slide].color, opacity: d.op, animation: `floatDot ${d.dur} ease-in-out infinite`, animationDelay: d.delay, boxShadow: `0 0 8px ${banners[slide].color}` }} />
        ))}

        {banners.map((bn, idx) => (
          <div key={idx} style={{ position: 'absolute', inset: 0, opacity: idx === slide ? 1 : 0, pointerEvents: idx === slide ? 'auto' : 'none', transition: 'opacity 0.8s ease' }}>
            <div className="hero-inner" style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', padding: '0 64px', gap: 48, maxWidth: 1280, margin: '0 auto' }}>

              <div className="hero-text" style={{ flex: '0 0 54%', display: 'flex', flexDirection: 'column', justifyContent: 'center', animation: idx === slide ? 'slideIn 0.6s ease' : 'none', position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: `1px solid ${bn.color}40`, borderRadius: 99, padding: '6px 14px', width: 'fit-content', color: bn.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: bn.color, animation: 'pulseDot 3s ease-in-out infinite', boxShadow: `0 0 8px ${bn.color}` }} />
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: bn.color }}>{bn.tag}</span>
                </div>

                <h1 style={{ margin: 0, marginBottom: 18, lineHeight: 1.04 }}>
                  <div style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#ffffff', textShadow: '0 0 18px rgba(255,255,255,0.15)' }}>{bn.title[0]}</div>
                  <div style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: bn.color, textShadow: `0 0 24px ${bn.color}80, 0 0 48px ${bn.color}40` }}>{bn.title[1]}</div>
                </h1>

                <p className="hero-sub" style={{ color: '#a3a3a3', fontSize: 15, fontWeight: 400, marginBottom: 28, lineHeight: 1.6, maxWidth: 480 }}>{bn.sub}</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                  <a href={bn.href} className="hero-cta-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: bn.color, color: '#000', fontWeight: 900, fontSize: 13, letterSpacing: '0.06em', padding: '14px 30px', borderRadius: 8, textDecoration: 'none', boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px ${bn.color}40, 0 0 40px ${bn.color}30`, transition: 'transform 0.18s, box-shadow 0.18s' }}>
                    {bn.cta}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                  {WHATSAPP_ENABLED && (
                    <a href={CONTATO_HREF} target="_blank" rel="noopener" className="hero-cta-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', color: '#ffffff', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', padding: '14px 24px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', transition: 'background 0.18s, border-color 0.18s' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
                      Falar com vendas
                    </a>
                  )}
                </div>

                <div className="hero-stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span className="hero-stat-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    200+ produtos
                  </span>
                  <span className="hero-stat-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    50+ marcas
                  </span>
                  <span className="hero-stat-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    PIX seguro
                  </span>
                  <span className="hero-stat-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Estoque imediato
                  </span>
                </div>
              </div>

              <div className="hero-product" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', animation: idx === slide ? 'glassFadeIn 0.8s ease' : 'none' }}>
                {(() => {
                  const prods = bannerBrandProds[idx] ?? []
                  const i0 = prods[0]?.img_url ?? (bn as any).productImg ?? null
                  const i1 = prods[1]?.img_url ?? null
                  const i2 = prods[2]?.img_url ?? null

                  const imgBox = (src: string, sz: number, rotate: string) => (
                    <div style={{ width: sz, height: sz, position: 'relative', background: '#090c09', borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${bn.color}40`, boxShadow: `0 16px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 28px ${bn.color}18`, flexShrink: 0 }}>
                      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 58% 58% at 50% 50%, ${bn.color}14 0%, transparent 68%)`, zIndex: 0 }} />
                      <Image src={src} alt="" width={sz} height={sz}
                        style={{ objectFit: 'contain', maxWidth: '76%', maxHeight: '76%', position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%,-50%)`, zIndex: 1, filter: `drop-shadow(0 0 12px ${bn.color}40) drop-shadow(0 3px 8px rgba(0,0,0,0.5))` }} />
                      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 50% 50% at 50% 50%, transparent 26%, rgba(9,12,9,0.48) 56%, rgba(9,12,9,0.88) 78%, #090c09 100%)`, zIndex: 2 }} />
                    </div>
                  )

                  return (
                    <div style={{ position: 'relative', width: 390, height: 350 }}>
                      {/* Ambient glow */}
                      <div aria-hidden="true" style={{ position: 'absolute', inset: -50, background: `radial-gradient(ellipse 52% 52% at 50% 50%, ${bn.color}26 0%, transparent 70%)`, filter: 'blur(44px)', zIndex: 0, pointerEvents: 'none', animation: 'glowPulse 4s ease infinite' }} />

                      {/* Brand watermark */}
                      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 76, fontWeight: 900, color: bn.color, opacity: 0.055, letterSpacing: '-0.04em', userSelect: 'none', zIndex: 0, lineHeight: 1, pointerEvents: 'none' }}>
                        {bn.title[0]}
                      </div>

                      {/* Main product — center */}
                      {i0 && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-2deg)', zIndex: 3 }}>
                          {imgBox(i0, 200, '-2deg')}
                        </div>
                      )}

                      {/* Second product — top right */}
                      {i1 && (
                        <div style={{ position: 'absolute', top: 4, right: 2, transform: 'rotate(6deg)', zIndex: 2 }}>
                          {imgBox(i1, 148, '6deg')}
                        </div>
                      )}

                      {/* Third product — bottom left */}
                      {i2 && (
                        <div style={{ position: 'absolute', bottom: 2, left: 2, transform: 'rotate(-5deg)', zIndex: 2 }}>
                          {imgBox(i2, 130, '-5deg')}
                        </div>
                      )}

                      {/* EM ESTOQUE badge */}
                      <div style={{ position: 'absolute', top: -4, left: 14, zIndex: 5, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#eab308', animation: 'pulseDot 3s ease-in-out infinite', boxShadow: '0 0 6px #eab308' }} />
                        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', color: '#ca8a04' }}>EM ESTOQUE</span>
                      </div>

                      {/* Verified badge */}
                      <div style={{ position: 'absolute', bottom: -6, right: 14, zIndex: 5, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `linear-gradient(135deg, ${bn.color}22, ${bn.color}0a)`, backdropFilter: 'blur(10px)', border: `1px solid ${bn.color}50`, boxShadow: `0 4px 18px rgba(0,0,0,0.4), 0 0 14px ${bn.color}18`, animation: idx === slide ? 'verifiedPop 0.5s 0.65s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={bn.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: bn.color }}>MARCA VERIFICADA</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        ))}

        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
          {banners.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} aria-label={`Ir para slide ${i + 1}`}
              style={{ height: 4, borderRadius: 99, border: 'none', cursor: 'pointer', transition: 'all 0.3s', background: i === slide ? banners[slide].color : '#404040', width: i === slide ? 36 : 8, boxShadow: i === slide ? `0 0 10px ${banners[slide].color}` : 'none' }} />
          ))}
        </div>

        <button onClick={() => setSlide(p => (p - 1 + banners.length) % banners.length)} aria-label="Slide anterior" className="hero-arrow-btn"
          style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transition: 'background 0.18s, border-color 0.18s' }}>‹</button>
        <button onClick={() => setSlide(p => (p + 1) % banners.length)} aria-label="Próximo slide" className="hero-arrow-btn"
          style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transition: 'background 0.18s, border-color 0.18s' }}>›</button>
      </section>

      {/* TRUST TICKER */}
      <div style={{ borderTop: '1px solid rgba(139,92,246,0.15)', borderBottom: '1px solid rgba(139,92,246,0.15)', background: '#050a05', padding: '10px 0', overflow: 'hidden' }}>
        <div className="trust-ticker">
          <div className="trust-track">
            {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 36px', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: '#8b5cf6', borderRight: '1px solid rgba(139,92,246,0.15)', textShadow: '0 0 8px rgba(139,92,246,0.5)' }}>
                <span style={{ fontSize: 13 }}>{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <section className="como-section" style={{ background: '#fafafa', borderBottom: '1px solid #ececec', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 99, background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.2)', marginBottom: 14 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#6d28d9' }}>COMO FUNCIONA</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 'clamp(20px,3vw,30px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#0a0a0a' }}>Simples, rápido e seguro</h2>
            <p style={{ margin: '8px auto 0', maxWidth: 480, color: '#737373', fontSize: 14, lineHeight: 1.6 }}>Do pedido à retirada em menos de 30 minutos após a confirmação do PIX.</p>
          </div>
          <div className="como-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                num: '01', title: 'Escolha os produtos',
                desc: 'Navegue pelo catálogo, adicione ao carrinho e finalize o pedido com seus dados.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
              },
              {
                num: '02', title: 'Pague via PIX',
                desc: 'QR code gerado na hora. Confirmação automática em menos de 5 minutos.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/></svg>,
              },
              {
                num: '03', title: 'Retire na loja',
                desc: 'Seu pedido fica separado. Retire pessoalmente na loja em Ciudad del Este, Paraguai.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              },
            ].map((s, i) => (
              <div key={i} className="como-step" style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 900, color: 'rgba(109,40,217,0.12)', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.num}</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#737373', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          {WHATSAPP_ENABLED && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href={CONTATO_HREF} target="_blank" rel="noopener"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 8, background: '#ffffff', border: '1px solid rgba(109,40,217,0.35)', color: '#6d28d9', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textDecoration: 'none', transition: 'all 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'rgba(109,40,217,0.06)'; a.style.boxShadow = '0 4px 12px rgba(109,40,217,0.18)' }}
                onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = '#ffffff'; a.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                DÚVIDAS? FALE COM A GENTE
              </a>
            </div>
          )}
        </div>
      </section>

      {/* MARCAS */}
      {!loadingProducts && topBrands.length > 0 && (
        <section className="marcas-section" style={{ background: '#ffffff', borderBottom: '1px solid #ececec', padding: '48px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#0a0a0a' }}>Marcas disponíveis</h2>
                <p style={{ margin: '4px 0 0', color: '#737373', fontSize: 13 }}>{topBrands.length} marcas · clique para filtrar</p>
              </div>
              {activeBrand !== 'Todos' && (
                <button onClick={() => setActiveBrand('Todos')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.3)', color: '#6d28d9', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
                  × LIMPAR FILTRO
                </button>
              )}
            </div>
            <div className="brand-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {topBrands.map(([name, count]) => (
                <button key={name} className="brand-card"
                  onClick={() => { setActiveCategoria(''); setActiveBrand(name); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }}
                  style={{ background: activeBrand === name ? 'rgba(109,40,217,0.06)' : '#fafafa', border: `1px solid ${activeBrand === name ? 'rgba(109,40,217,0.4)' : '#ececec'}`, borderRadius: 12, padding: '18px 14px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: activeBrand === name ? '#6d28d9' : '#0a0a0a', letterSpacing: '0.04em' }}>{name}</span>
                  <span style={{ fontSize: 11, color: '#a3a3a3', fontWeight: 600 }}>{count} produto{count !== 1 ? 's' : ''}</span>
                  {activeBrand === name && <span style={{ width: 24, height: 2, borderRadius: 99, background: '#8b5cf6', marginTop: 2 }} />}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRODUTOS */}
      <section id="catalogo" className="catalogo-section" style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px 96px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10, flexWrap: 'wrap' as const }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#0a0a0a' }}>
              {activeCategoria ? (categorias.find(c => c.id === activeCategoria)?.nome ?? 'Catálogo') : 'Catálogo'}
            </h2>
            <span style={{ fontSize: 11, color: '#737373', fontWeight: 600, letterSpacing: '0.04em' }}>
              {loadingProducts ? 'carregando…' : `${products.length} produtos disponíveis`}
            </span>
          </div>
          <p style={{ color: '#737373', fontSize: 13, margin: 0, lineHeight: 1.5 }}>Importação oficial · Estoque imediato · Pagamento em PIX, USD ou BRL</p>
        </div>

        {/* CHIPS DE CATEGORIA */}
        {!loadingProducts && topCats.length > 0 && (
          <div className="cat-chips-wrapper" style={{ marginBottom: 20 }}>
            <div className="cat-chips">
              <button
                className={`cat-chip ${!activeCategoria ? 'cat-chip-active' : 'cat-chip-inactive'}`}
                onClick={() => { setActiveCategoria(''); setActiveBrand('Todos'); router.replace('/', { scroll: false }) }}>
                TODAS
                <span style={{ opacity: 0.7, fontSize: 10 }}>{products.length}</span>
              </button>
              {topCats.map(c => {
                const total = catTotals(c)
                const isActive = activeCategoria === c.id
                const color = catColor(c.id)
                return (
                  <button key={c.id}
                    className={`cat-chip ${isActive ? 'cat-chip-active' : 'cat-chip-inactive'}`}
                    onClick={() => { router.replace(`/?cat=${c.id}`, { scroll: false }); setActiveBrand('Todos') }}
                    style={isActive ? { background: `${color}15`, borderColor: `${color}66`, color } : undefined}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: isActive ? `0 0 4px ${color}80` : 'none', display: 'inline-block' }} />
                    {c.nome.toUpperCase()}
                    <span style={{ opacity: 0.7, fontSize: 10 }}>{total}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 760, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
              <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto ou marca..."
                style={{ width: '100%', padding: '10px 38px 10px 36px', background: '#ffffff', border: '1px solid #ececec', borderRadius: 8, color: '#0a0a0a', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(109,40,217,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#ececec')} />
              {refetching && (
                <div style={{ position: 'absolute', right: search ? 32 : 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid #ececec', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              )}
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
              )}
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setFilterOpen(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', height: 40, background: activeBrand !== 'Todos' ? 'rgba(109,40,217,0.06)' : '#ffffff', border: `1px solid ${activeBrand !== 'Todos' ? 'rgba(109,40,217,0.4)' : '#ececec'}`, borderRadius: 8, color: activeBrand !== 'Todos' ? '#6d28d9' : '#404040', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                {activeBrand !== 'Todos' ? activeBrand : 'MARCA'}
                {activeBrand !== 'Todos' && (
                  <span onClick={e => { e.stopPropagation(); setActiveBrand('Todos'); setFilterOpen(false) }} style={{ fontSize: 15, lineHeight: 1, opacity: 0.7, marginLeft: 1 }}>×</span>
                )}
                <svg style={{ width: 10, height: 10, transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              {filterOpen && (
                <>
                  <div onClick={() => setFilterOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, background: '#ffffff', border: '1px solid #ececec', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', minWidth: 180, maxHeight: 280, overflowY: 'auto', padding: '6px' }}>
                    {brands.map(br => (
                      <button key={br} onClick={() => { if (br !== 'Todos') setActiveCategoria(''); setActiveBrand(br); setFilterOpen(false) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 6, border: 'none', background: activeBrand === br ? 'rgba(109,40,217,0.06)' : 'transparent', color: activeBrand === br ? '#6d28d9' : '#404040', fontSize: 13, fontWeight: activeBrand === br ? 700 : 500, cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (activeBrand !== br) e.currentTarget.style.background = '#fafafa' }}
                        onMouseLeave={e => { if (activeBrand !== br) e.currentTarget.style.background = 'transparent' }}>
                        {br === 'Todos' ? 'Todas as marcas' : br}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setSortOpen(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', height: 40, background: sortBy !== 'destaque' ? 'rgba(109,40,217,0.06)' : '#ffffff', border: `1px solid ${sortBy !== 'destaque' ? 'rgba(109,40,217,0.4)' : '#ececec'}`, borderRadius: 8, color: sortBy !== 'destaque' ? '#6d28d9' : '#404040', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M6 12h12M10 18h4"/>
                </svg>
                {SORT_LABELS[sortBy].toUpperCase()}
                <svg style={{ width: 10, height: 10, transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              {sortOpen && (
                <>
                  <div onClick={() => setSortOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, background: '#ffffff', border: '1px solid #ececec', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', minWidth: 200, padding: '6px' }}>
                    {(Object.keys(SORT_LABELS) as SortBy[]).map(opt => (
                      <button key={opt} onClick={() => { setSortBy(opt); setSortOpen(false) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 6, border: 'none', background: sortBy === opt ? 'rgba(109,40,217,0.06)' : 'transparent', color: sortBy === opt ? '#6d28d9' : '#404040', fontSize: 13, fontWeight: sortBy === opt ? 700 : 500, cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (sortBy !== opt) e.currentTarget.style.background = '#fafafa' }}
                        onMouseLeave={e => { if (sortBy !== opt) e.currentTarget.style.background = 'transparent' }}>
                        {SORT_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {(search || activeBrand !== 'Todos' || activeCategoria) && (
            <div style={{ fontSize: 12, color: '#737373' }}>
              {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              {search && <span style={{ color: '#6d28d9' }}> para &ldquo;{search}&rdquo;</span>}
              {' '}
              <button onClick={() => { setSearch(''); setActiveBrand('Todos'); setActiveCategoria('') }}
                style={{ background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}>
                limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* SEÇÃO DESTAQUES */}
        {!loadingProducts && destaquesProdutos.length > 0 && !search && !activeCategoria && activeBrand === 'Todos' && sortBy === 'destaque' && (
          <section style={{ marginBottom: 48 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, fontWeight: 900, letterSpacing: '-0.01em', margin: '0 0 16px', color: '#0a0a0a' }}>
              <span style={{ width: 3, height: 22, background: '#8b5cf6', borderRadius: 99, boxShadow: '0 0 6px rgba(109,40,217,0.4)' }} />
              MAIS VENDIDOS
              <span style={{ background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.3)', color: '#6d28d9', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.1em' }}>
                {destaquesProdutos.length}
              </span>
            </h3>
            <div className="destaques-scroll">
              {destaquesProdutos.map(p => {
                const promo = isPromo(p)
                const priceShown = promo ? p.usd_price_promo! : p.usd_price
                return (
                  <div key={p.id} className="product-card"
                    onClick={() => router.push(`/produtos/${p.id}`)}
                    style={{ flexShrink: 0, width: 200, background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', opacity: p.estoque === 0 ? 0.55 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="card-img-wrap-mini" style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', flexShrink: 0, background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)', overflow: 'hidden', padding: 10, boxSizing: 'border-box' as const }}>
                      <CardImg src={p.img_url} alt={p.name} />
                      {promo && (
                        <span style={{ position: 'absolute', top: 8, left: 8, background: '#8b5cf6', color: '#000', fontSize: 8, fontWeight: 900, padding: '3px 7px', borderRadius: 4, letterSpacing: '0.08em' }}>PROMO</span>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {p.brand && (
                        <span style={{ fontSize: 8, fontWeight: 800, color: '#6d28d9', letterSpacing: '0.1em' }}>{p.brand.toUpperCase()}</span>
                      )}
                      <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.name}</h4>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#6d28d9', lineHeight: 1 }}>
                        {currency.code} {fmt(priceShown, currency.rate, currency.code)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div style={{ position: 'relative' }}>
          {refetching && !loadingProducts && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)', zIndex: 5, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40, pointerEvents: 'none' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #ececec', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          )}
          <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
            {loadingProducts ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ borderRadius: 14, height: 320 }} />
              ))
            ) : visible.map((p, pIdx) => {
              const promo = isPromo(p)
              const badges = effectiveBadges(p)
              const discount = promo ? Math.round((1 - p.usd_price_promo! / p.usd_price) * 100) : 0
              return (
                <Fragment key={p.id}>
                {pIdx === PROMO_BANNER_AFTER && !debouncedSearch && activeBrand === 'Todos' && !activeCategoria && (
                  <div className="promo-banners-row" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '8px 0' }}>
                    {/* ZPHC Banner */}
                    <div onClick={() => { setActiveBrand('ZPHC'); setActiveCategoria('') }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(72,144,255,0.5)'; el.style.boxShadow = '0 12px 40px rgba(8,30,100,0.7), 0 0 40px rgba(72,144,255,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(72,144,255,0.2)'; el.style.boxShadow = '0 8px 32px rgba(8,30,100,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
                      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '28px 32px', background: 'linear-gradient(135deg, #050d1f 0%, #081835 40%, #0d2252 70%, #102b6a 100%)', border: '1px solid rgba(72,144,255,0.2)', boxShadow: '0 8px 32px rgba(8,30,100,0.5), inset 0 1px 0 rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: 160 }}>
                      <div aria-hidden="true" style={{ position: 'absolute', right: -30, top: -30, width: 220, height: 220, background: 'radial-gradient(circle, rgba(72,144,255,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, right: 0, height: 60, background: 'linear-gradient(to top, rgba(72,144,255,0.05), transparent)', pointerEvents: 'none' }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'rgba(72,144,255,0.1)', border: '1px solid rgba(72,144,255,0.28)', marginBottom: 12 }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4890ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', color: '#4890ff' }}>DISTRIBUIDOR OFICIAL</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 8 }}>
                          LINHA<br/><span style={{ color: '#4890ff', textShadow: '0 0 20px rgba(72,144,255,0.55)' }}>ZPHC</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 18 }}>Farmacêuticos certificados.<br/>Alta pureza. Estoque imediato.</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: '#4890ff', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', boxShadow: '0 4px 16px rgba(72,144,255,0.4)' }}>
                          VER LINHA ZPHC
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                      <div aria-hidden="true" style={{ position: 'relative', flexShrink: 0, width: 88, height: 88, opacity: 0.9 }}>
                        {[{t:'10%',l:'15%',s:3,d:'0s'},{t:'65%',l:'75%',s:2,d:'0.8s'},{t:'75%',l:'5%',s:2,d:'1.4s'},{t:'20%',l:'82%',s:3,d:'0.4s'}].map((d,i)=>(
                          <div key={i} style={{ position:'absolute', top:d.t, left:d.l, width:d.s, height:d.s, borderRadius:'50%', background:'#4890ff', boxShadow:'0 0 5px #4890ff', animation:`floatDot ${3+i*0.6}s ease-in-out infinite`, animationDelay:d.d }}/>
                        ))}
                        <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
                          <path d="M44 8 L74 20 L74 46 C74 60 62 72 44 80 C26 72 14 60 14 46 L14 20 Z" stroke="#4890ff" strokeWidth="1.8" fill="rgba(72,144,255,0.06)" opacity="0.75"/>
                          <polyline points="30 44 41 55 58 34" stroke="#4890ff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                        </svg>
                      </div>
                    </div>

                    {/* Biogenises Banner */}
                    <div onClick={() => { setActiveBrand('BIOGENESIS'); setActiveCategoria('') }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(139,92,246,0.38)'; el.style.boxShadow = '0 12px 40px rgba(0,30,0,0.8), 0 0 40px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(139,92,246,0.14)'; el.style.boxShadow = '0 8px 32px rgba(0,30,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)' }}
                      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '28px 32px', background: 'linear-gradient(135deg, #030a03 0%, #051405 40%, #071d07 70%, #0a2408 100%)', border: '1px solid rgba(139,92,246,0.14)', boxShadow: '0 8px 32px rgba(0,30,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: 160 }}>
                      <div aria-hidden="true" style={{ position: 'absolute', right: -20, top: -20, width: 200, height: 200, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, right: 0, height: 60, background: 'linear-gradient(to top, rgba(139,92,246,0.04), transparent)', pointerEvents: 'none' }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.22)', marginBottom: 12 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 5px #8b5cf6', animation: 'pulseDot 3s ease-in-out infinite' }} />
                          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', color: '#8b5cf6' }}>BIOTECNOLOGIA</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 8 }}>
                          LINHA<br/><span style={{ color: '#8b5cf6', textShadow: '0 0 20px rgba(139,92,246,0.55)' }}>BIOGENISES</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 18 }}>Peptídeos de alta pureza.<br/>Qualidade laboratório certificado.</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.35)', color: '#8b5cf6', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', boxShadow: '0 4px 16px rgba(139,92,246,0.18)' }}>
                          VER LINHA BIOGENISES
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                      <div aria-hidden="true" style={{ position: 'relative', flexShrink: 0, width: 88, height: 88, opacity: 0.9 }}>
                        {[{t:'12%',l:'48%',s:3,d:'0s'},{t:'58%',l:'8%',s:2,d:'0.7s'},{t:'78%',l:'68%',s:3,d:'1.3s'},{t:'30%',l:'82%',s:2,d:'0.3s'}].map((d,i)=>(
                          <div key={i} style={{ position:'absolute', top:d.t, left:d.l, width:d.s, height:d.s, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 5px #8b5cf6', animation:`floatDot ${3+i*0.5}s ease-in-out infinite`, animationDelay:d.d }}/>
                        ))}
                        <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
                          <circle cx="44" cy="18" r="10" stroke="#8b5cf6" strokeWidth="1.8" fill="rgba(139,92,246,0.07)" opacity="0.85"/>
                          <circle cx="18" cy="64" r="8" stroke="#8b5cf6" strokeWidth="1.5" fill="rgba(139,92,246,0.05)" opacity="0.7"/>
                          <circle cx="70" cy="64" r="8" stroke="#8b5cf6" strokeWidth="1.5" fill="rgba(139,92,246,0.05)" opacity="0.7"/>
                          <line x1="44" y1="28" x2="18" y2="56" stroke="#8b5cf6" strokeWidth="1.4" opacity="0.5"/>
                          <line x1="44" y1="28" x2="70" y2="56" stroke="#8b5cf6" strokeWidth="1.4" opacity="0.5"/>
                          <line x1="26" y1="64" x2="62" y2="64" stroke="#8b5cf6" strokeWidth="1.4" opacity="0.5"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                <div data-card-id={p.id} className="product-card card-pre-reveal"
                  style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', opacity: p.estoque === 0 ? 0.55 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div onClick={() => router.push(`/produtos/${p.id}`)} className="card-img-wrap"
                    style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', flexShrink: 0, background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)', overflow: 'hidden', padding: 14, boxSizing: 'border-box' as const }}>
                    <CardImg src={p.img_url} alt={p.name} />
                    <div className="card-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                      <span style={{ background: '#8b5cf6', color: '#000', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', padding: '8px 20px', borderRadius: 6, boxShadow: '0 4px 12px rgba(109,40,217,0.25)' }}>VER PRODUTO →</span>
                    </div>
                    {badges.length > 0 && (
                      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 2 }}>
                        {badges.slice(0, 3).map((b, i) => {
                          const st = cardBadge(b)
                          return <span key={i} style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 8, fontWeight: 900, padding: '3px 8px', borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase', width: 'fit-content', backdropFilter: 'blur(6px)' }}>{b}</span>
                        })}
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, zIndex: 2 }}>
                      {p.estoque !== null && p.estoque <= 5 && p.estoque > 0 && (
                        <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', fontSize: 8, fontWeight: 900, padding: '3px 7px', borderRadius: 4, letterSpacing: '0.05em' }}>ÚLTIMAS {p.estoque}</span>
                      )}
                      {p.venda_minima != null && p.venda_minima > 1 && (
                        <span style={{ background: 'rgba(255,255,255,0.92)', color: '#404040', border: '1px solid #d4d4d4', fontSize: 8, fontWeight: 800, padding: '3px 7px', borderRadius: 4, letterSpacing: '0.05em', backdropFilter: 'blur(4px)' }}>MÍN {p.venda_minima} UN</span>
                      )}
                    </div>
                    {p.estoque === 0 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', border: '1px solid rgba(239,68,68,0.4)', padding: '5px 12px', borderRadius: 5, background: '#ffffff', letterSpacing: '0.06em' }}>SEM ESTOQUE</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '13px 13px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                    {p.brand && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#6d28d9', letterSpacing: '0.14em', width: 'fit-content' }}>{p.brand.toUpperCase()}</span>
                    )}
                    <h3 onClick={() => router.push(`/produtos/${p.id}`)}
                      style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.4, cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                      {p.name}
                    </h3>
                    {p.rating != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: -4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        <span style={{ fontSize: 10, color: '#b45309', fontWeight: 700 }}>{p.rating}</span>
                        <span style={{ fontSize: 9, color: '#a3a3a3' }}>({p.rating_total ?? 0})</span>
                      </div>
                    )}
                    {p.descricao_curta && (
                      <p style={{ fontSize: 10.5, color: '#737373', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.descricao_curta}</p>
                    )}
                    <div className="price-display" style={{ borderTop: '1px solid #ececec', paddingTop: 10, marginTop: 'auto' }}>
                      {promo ? (
                        <>
                          <div style={{ fontSize: 11, color: '#a3a3a3', textDecoration: 'line-through' }}>{currency.code} {fmt(p.usd_price, currency.rate, currency.code)}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#6d28d9', lineHeight: 1, letterSpacing: '-0.02em' }}>
                            {currency.code} {fmt(p.usd_price_promo!, currency.rate, currency.code)}
                          </div>
                          <div style={{ fontSize: 9, color: '#b45309', fontWeight: 800, marginTop: 2 }}>-{discount}% OFF</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#6d28d9', lineHeight: 1, letterSpacing: '-0.02em' }}>
                          {currency.code} {fmt(p.usd_price, currency.rate, currency.code)}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#a3a3a3', marginTop: 4, fontWeight: 500 }}>
                        {currency.code === 'USD' ? `≈ R$ ${fmt(promo ? p.usd_price_promo! : p.usd_price, 5.20, 'BRL')}` : `USD ${(promo ? p.usd_price_promo! : p.usd_price).toFixed(2)}`}
                      </div>
                    </div>
                    <button disabled={p.estoque === 0} className="card-add-btn"
                      onClick={e => { e.stopPropagation(); adicionar({ id: p.id, name: p.name, usd: promo ? p.usd_price_promo! : p.usd_price, img: p.img_url ?? PLACEHOLDER, brand: p.brand ?? undefined }) }}
                      style={{ width: '100%', padding: '11px 0', borderRadius: 8, background: p.estoque === 0 ? '#fafafa' : '#ffffff', border: `1px solid ${p.estoque === 0 ? '#ececec' : 'rgba(109,40,217,0.4)'}`, color: p.estoque === 0 ? '#a3a3a3' : '#6d28d9', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', cursor: p.estoque === 0 ? 'not-allowed' : 'pointer', transition: 'background 0.15s, border-color 0.15s, color 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {p.estoque === 0 ? 'INDISPONÍVEL' : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                          </svg>
                          ADICIONAR
                        </>
                      )}
                    </button>
                  </div>
                </div>
                </Fragment>
              )
            })}
          </div>
        </div>

        {!loadingProducts && hasMore && (
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button className="ver-mais-btn"
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 40px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(109,40,217,0.4)', color: '#6d28d9', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(109,40,217,0.06)'; b.style.borderColor = 'rgba(109,40,217,0.5)'; b.style.boxShadow = '0 4px 12px rgba(109,40,217,0.18)' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#ffffff'; b.style.borderColor = 'rgba(109,40,217,0.4)'; b.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              VER MAIS
              <span style={{ opacity: 0.6, fontSize: 10, fontWeight: 600 }}>{visible.length} / {filtered.length}</span>
            </button>
          </div>
        )}

        {!loadingProducts && !hasMore && filtered.length > INITIAL_PAGE && (
          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#a3a3a3', letterSpacing: '0.1em' }}>
            TODOS OS {filtered.length} PRODUTOS EXIBIDOS
          </div>
        )}
      </section>

      {/* WhatsApp FAB */}
      {WHATSAPP_ENABLED && (
        <a href="https://wa.me/595994222774" target="_blank" rel="noopener" aria-label="Falar no WhatsApp"
          style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.4)', zIndex: 50, transition: 'transform 0.2s, opacity 0.3s', opacity: fabVisible ? 1 : 0, pointerEvents: fabVisible ? 'auto' : 'none', transform: fabVisible ? 'scale(1)' : 'scale(0.6)' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.1)'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = fabVisible ? 'scale(1)' : 'scale(0.6)'}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* Footer */}
      <footer style={{ background: '#050a05', color: '#a3a3a3', padding: '56px 24px 24px' }}>
        <div className="footer-grid" style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr', gap: 48 }}>
          <div>
            <Image src="/logo-fronteira-dark-mockup.png" alt="Atacado na Fronteira" width={130} height={51} style={{ objectFit: 'contain', marginBottom: 16, opacity: 0.9 }} />
            <p style={{ color: '#737373', fontSize: 13, lineHeight: 1.7, margin: '0 0 20px', maxWidth: 280 }}>
              Distribuidor B2B de peptídeos e suplementos premium importados do Paraguai. Estoque imediato, pagamento via PIX.
            </p>
            {WHATSAPP_ENABLED && (
              <a href={CONTATO_HREF} target="_blank" rel="noopener"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, background: '#25d366', color: '#ffffff', fontSize: 12, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.04em' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                FALAR COM VENDAS
              </a>
            )}
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', marginBottom: 18 }}>MARCAS</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {brands.filter(b => b !== 'Todos').slice(0, 7).map(name => (
                <li key={name}>
                  <a href="#catalogo" className="footer-brand-link"
                    onClick={e => { e.preventDefault(); setActiveCategoria(''); setActiveBrand(name); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }}
                    style={{ color: '#737373', fontSize: 13, textDecoration: 'none', cursor: 'pointer' }}>
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', marginBottom: 18 }}>NAVEGAÇÃO</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li><a href="#catalogo" className="footer-brand-link" onClick={e => { e.preventDefault(); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }} style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Catálogo</a></li>
              <li><a href="/onde-retirar" className="footer-brand-link" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Onde Retirar</a></li>
              <li><a href="/conta/login" className="footer-brand-link" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Minha Conta</a></li>
              <li><a href="/politica-privacidade" className="footer-brand-link" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Privacidade</a></li>
              <li><a href="/termos" className="footer-brand-link" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Termos de Uso</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', marginBottom: 18 }}>LOCALIZAÇÃO</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <svg style={{ flexShrink: 0, marginTop: 1 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>Av. Carlos Antonio López 7000<br />Ciudad del Este, Paraguai</span>
              </li>
              <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <svg style={{ flexShrink: 0, marginTop: 2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 13, lineHeight: 1.7 }}>Seg–Sex: 9h às 18h<br />Sáb: 9h às 13h<br /><span style={{ color: '#525252' }}>Dom: fechado</span></span>
              </li>
              {WHATSAPP_ENABLED && (
                <li style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                  <svg style={{ flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  <a href={CONTATO_HREF} target="_blank" rel="noopener" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#25d366'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#737373'}>
                    +595 994 222 774
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: '40px auto 0', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.05em', color: '#404040' }}>© 2026 ATACADO NA FRONTEIRA — TODOS OS DIREITOS RESERVADOS</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#404040', letterSpacing: '0.08em' }}>PAGAMENTO</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#8b5cf6', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>PIX</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>USD</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>BRL</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
