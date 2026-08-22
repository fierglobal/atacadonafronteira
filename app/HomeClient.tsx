'use client'

import { useState, useEffect, useMemo, useRef, Fragment, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCarrinho } from '@/components/CarrinhoContext'
import { WHATSAPP_ENABLED, WHATSAPP_HREF, WHATSAPP_GRUPO_HREF } from '@/lib/site'
import Logo from '@/components/Logo'
import { Hero, ComoComprar, Departamentos, Categorias, Entrega, Contato, type DeptCard, type CatLink } from '@/components/HomeSecoes'

const CONTATO_HREF = WHATSAPP_HREF

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
  'promoção': { bg: 'rgba(66, 14, 118,0.10)', color: '#420E76', border: 'rgba(66, 14, 118,0.4)' },
  'promocao': { bg: 'rgba(66, 14, 118,0.10)', color: '#420E76', border: 'rgba(66, 14, 118,0.4)' },
  'lançamento': { bg: 'rgba(190,40,180,0.10)', color: '#a21caf', border: 'rgba(190,40,180,0.4)' },
  'lancamento': { bg: 'rgba(190,40,180,0.10)', color: '#a21caf', border: 'rgba(190,40,180,0.4)' },
}
const cardBadge = (txt: string) => BADGE_COLORS_CARD[txt.trim().toLowerCase()] ?? { bg: '#f5f5f5', color: '#737373', border: '#d4d4d4' }

const PLACEHOLDER = '/produto-placeholder.svg'

const CAT_COLORS = ['#420E76', '#0891b2', '#a21caf', '#b45309', '#7c3aed', '#0e7490', '#be185d', '#047857']
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
const VITRINE_POR_SECAO = 12


export type HomeInitial = {
  deptEletronicos: number
  deptFarmacia: number
  departamentos: DeptCard[]
  catLinks: CatLink[]
  categorias: Categoria[]
  total: number
  brands: { nome: string; total: number }[]        // nomes em base64, como a API
  secoes: { id: string; nome: string; total: number; items: Product[] }[]  // idem
}

type VitrineRow = { id: string; nome: string; total: number; items: Product[] }

const decodeProd = (p: Product): Product => ({ ...p, name: dec(p.name) ?? p.name, brand: dec(p.brand) })

const isPromo = (p: Product) => p.usd_price_promo != null && p.usd_price_promo < p.usd_price
const effectiveBadges = (p: Product) => {
  const base = (p.badges ?? []).slice()
  if (isPromo(p) && !base.some(b => b.toLowerCase().includes('promo'))) base.unshift('promoção')
  return base
}

function ProductCardCompact({ p }: { p: Product }) {
  const router = useRouter()
  const { currency, brlRate, adicionar } = useCarrinho()
  const promo = isPromo(p)
  const priceShown = promo ? p.usd_price_promo! : p.usd_price
  const badges = effectiveBadges(p)
  const badge = badges[0] ? cardBadge(badges[0]) : null
  return (
    <div className="product-card-compact" onClick={() => router.push(`/produtos/${p.id}`)}
      style={{ flexShrink: 0, width: 178, background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', opacity: p.estoque === 0 ? 0.55 : 1, scrollSnapAlign: 'start' }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', flexShrink: 0, background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)', overflow: 'hidden', padding: 12, boxSizing: 'border-box' as const }}>
        <CardImg src={p.img_url} alt={p.name} />
        {badges.length > 0 && badge && (
          <span style={{ position: 'absolute', top: 7, left: 7, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 8, fontWeight: 900, padding: '3px 7px', borderRadius: 99, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{badges[0]}</span>
        )}
        {p.estoque === 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', border: '1px solid rgba(239,68,68,0.4)', padding: '4px 9px', borderRadius: 4, background: '#ffffff', letterSpacing: '0.05em' }}>SEM ESTOQUE</span>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 11px 11px', display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
        {p.brand && (
          <span style={{ fontSize: 8, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em', width: 'fit-content' }}>{p.brand.toUpperCase()}</span>
        )}
        <h4 style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.35, minHeight: 30, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.name}</h4>
        <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 7, marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 900, color: '#420E76', lineHeight: 1, letterSpacing: '-0.01em' }}>
              {currency.code} {fmt(priceShown, currency.rate, currency.code)}
            </div>
            <div style={{ fontSize: 9, color: '#a3a3a3', marginTop: 3, fontWeight: 500 }}>
              {currency.code === 'USD' ? `≈ R$ ${fmt(priceShown, brlRate, 'BRL')}` : `USD ${priceShown.toFixed(2)}`}
            </div>
          </div>
          <button disabled={p.estoque === 0} aria-label="Adicionar ao carrinho"
            onClick={e => { e.stopPropagation(); adicionar({ id: p.id, name: p.name, usd: priceShown, img: p.img_url ?? PLACEHOLDER, brand: p.brand ?? undefined }) }}
            style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: p.estoque === 0 ? '#fafafa' : '#420E76', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: p.estoque === 0 ? 'not-allowed' : 'pointer', transition: 'background 0.15s, transform 0.15s' }}
            onMouseEnter={e => { if (p.estoque !== 0) (e.currentTarget as HTMLButtonElement).style.background = '#5a1798' }}
            onMouseLeave={e => { if (p.estoque !== 0) (e.currentTarget as HTMLButtonElement).style.background = '#420E76' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryCarouselRow({ id, nome, total, items, icon, onSeeAll }: { id: string; nome: string; total: number; items: Product[]; icon?: string; onSeeAll?: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  if (items.length === 0) return null
  const color = catColor(id)
  const scroll = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' })
  return (
    <section className="carousel-row home-only">
      <div className="carousel-row-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span className="carousel-row-icon" style={{ background: `${color}18`, color }}>{icon ?? nome.charAt(0).toUpperCase()}</span>
          <h3 className="carousel-row-title">{nome}</h3>
          <span className="carousel-row-count">{total}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {onSeeAll && (
            <button onClick={() => onSeeAll(id)} className="carousel-see-all">VER TODOS →</button>
          )}
          <button type="button" className="carousel-arrow" onClick={() => scroll(-1)} aria-label="Anterior">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button type="button" className="carousel-arrow" onClick={() => scroll(1)} aria-label="Próximo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="carousel-track">
        {items.map(p => <ProductCardCompact key={p.id} p={p} />)}
      </div>
    </section>
  )
}

function CategoryStrip({ rows, onSelect }: { rows: VitrineRow[]; onSelect: (id: string) => void }) {
  if (rows.length === 0) return null
  return (
    <div className="category-strip-wrapper home-only">
      <div className="category-strip">
        {rows.map(r => {
          const color = catColor(r.id)
          const img = r.items[0]?.img_url
          return (
            <button key={r.id} type="button" className="category-strip-card" onClick={() => onSelect(r.id)}>
              <span className="category-strip-label">{r.nome}</span>
              <span className="category-strip-swatch" style={{ background: `${color}14` }}>
                {img ? (
                  <Image src={img} alt={r.nome} fill sizes="90px" style={{ objectFit: 'contain', padding: 10 }} />
                ) : (
                  <span style={{ fontSize: 26 }}>📦</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Home({ initial }: { initial?: HomeInitial }) {
  const router = useRouter()
  const [activeBrand, setActiveBrand] = useState('Todos')
  // Filtro é estado local; a URL é só cosmética/compartilhável. Navegar de
  // verdade (router.replace) exigiria useSearchParams para reagir — e esse
  // hook tira a página inteira do HTML estático (bailout do Suspense).
  const aplicarFiltro = (cat: string, marca: string) => {
    setActiveCategoria(cat)
    setActiveBrand(marca)
    if (!cat && marca === 'Todos') { setSearch(''); setDebouncedSearch('') }
    const qs = cat ? `?cat=${cat}` : marca !== 'Todos' ? `?marca=${encodeURIComponent(marca)}` : ''
    window.history.replaceState(null, '', `/${qs}`)
  }
  const [activeCategoria, setActiveCategoria] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('destaque')
  const [sortOpen, setSortOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>(
    () => initial ? initial.secoes.flatMap(s => s.items.map(decodeProd)) : []
  )
  // total e marcas do catálogo inteiro. A listagem é paginada, então não dá
  // mais para derivar isso do que está carregado.
  const [totalCatalogo, setTotalCatalogo] = useState(initial?.total ?? 0)
  const [totalFiltrado, setTotalFiltrado] = useState(initial?.total ?? 0)
  const [marcasFacet, setMarcasFacet] = useState<{ nome: string; total: number }[]>(
    () => initial ? initial.brands.map(b => ({ nome: dec(b.nome) ?? b.nome, total: b.total })) : []
  )
  const [categorias, setCategorias] = useState<Categoria[]>(initial?.categorias ?? [])
  const [loadingProducts, setLoadingProducts] = useState(!initial)
  // fileiras da vitrine, uma por categoria-folha (home sem filtro) — carrossel
  // no estilo atacadoconnect: cada uma carrega seus próprios itens, não é só
  // uma contagem para injetar cabeçalho no grid
  const [vitrineRows, setVitrineRows] = useState<VitrineRow[]>(
    () => initial ? initial.secoes.map(s => ({ id: s.id, nome: s.nome, total: s.total, items: s.items.map(decodeProd) })) : []
  )
  const [refetching, setRefetching] = useState(false)
  const [destaques, setDestaques] = useState<string[]>([])
  const [aviso, setAviso] = useState('')
  const { currency, brlRate, setCurrency, adicionar, abrirSidebar, quantidade } = useCarrinho()
  const [filterOpen, setFilterOpen] = useState(false)
  const [fabVisible, setFabVisible] = useState(false)
  const firstLoad = useRef(true)
  const revealedCards = useRef(new Set<string>(initial ? initial.secoes.flatMap(s => s.items.map(i => i.id)) : []))

  // Sync dos filtros com a URL: ?cat= (categoria) e ?marca= (vitrine de marca).
  // Marca precisa vir da URL, e não só do state, para o menu poder linkar uma
  // vitrine — um iPhone fica em Eletrônicos > Celular e aparece na Apple ao
  // mesmo tempo, o que categoria sozinha não resolve.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const cat = sp.get('cat') ?? ''
    const marca = sp.get('marca') ?? ''
    const q = sp.get('q') ?? ''
    if (cat) setActiveCategoria(cat)
    if (marca) setActiveBrand(marca)
    if (q) setSearch(q)
    if (cat || marca || q) {
      // o HTML estático trouxe a vitrine; o conteúdo certo ainda vai chegar
      setLoadingProducts(true)
      setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [])

  // libera o grid quando o recorte da URL já foi aplicado (par do script
  // anti-flash do layout)
  useEffect(() => {
    if (!loadingProducts && !refetching) document.documentElement.removeAttribute('data-filtro-pendente')
  }, [loadingProducts, refetching])

  useEffect(() => {
    fetch('/api/home-config').then(r => r.json()).then(cfg => {
      if (cfg?.destaques?.length) setDestaques(cfg.destaques)
      if (cfg?.aviso) setAviso(cfg.aviso)
    }).catch(() => {})
    if (initial) return // facetas e categorias já vieram do servidor
    Promise.all([
      fetch('/api/facetas').then(r => r.json()).catch(() => ({ total: 0, brands: [] })),
      fetch('/api/categorias').then(r => r.json()).catch(() => []),
    ]).then(([facetas, cats]) => {
      setTotalCatalogo(facetas.total ?? 0)
      setMarcasFacet((facetas.brands ?? []).map((b: { nome: string; total: number }) => ({ nome: dec(b.nome) ?? b.nome, total: b.total })))
      setCategorias(cats || [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Busca no servidor a cada mudança de filtro. Antes o catálogo inteiro vinha
  // numa tacada e tudo era filtrado em memória; com 639 produtos isso já eram
  // 386 KB no primeiro load, e cresceria junto com o estoque.
  // Vitrine por departamento: a home sem filtro não mistura mais peptídeo com
  // iPhone num grid só — cada departamento vira uma seção com "ver tudo".
  const raizesVitrine = useMemo(() => categorias
    .filter(c => c.produtos > 0)
    .map(c => ({ id: c.id, nome: c.nome })), [categorias])
  const raizesKey = raizesVitrine.map(r => r.id).join(',')
  const modoVitrine = raizesVitrine.length > 0 && !debouncedSearch && activeBrand === 'Todos' && !activeCategoria && sortBy === 'destaque'
  // Página inicial de verdade: sem nenhum filtro ativo, independente de haver
  // 1 ou vários departamentos. Banner, ticker e "Marcas" são só disso — o
  // Guilherme notou que o banner ficava fixo em toda categoria clicada.
  const isHome = !debouncedSearch && activeBrand === 'Todos' && !activeCategoria

  const filtrosKey = `${debouncedSearch}|${activeBrand}|${activeCategoria}|${sortBy}`
  useEffect(() => {
    // a primeira renderização já veio pronta do servidor (SSR/ISR)
    if (firstLoad.current) {
      const sp = new URLSearchParams(window.location.search)
      const urlComFiltro = !!(sp.get('cat') || sp.get('marca') || sp.get('q'))
      if (initial && !urlComFiltro) { firstLoad.current = false; return }
      // com filtro na URL, espera o efeito de sync popular o estado — senão
      // buscaria a vitrine à toa e refaria em seguida
      if (urlComFiltro && !activeCategoria && activeBrand === 'Todos' && !debouncedSearch) { firstLoad.current = false; return }
    }
    let cancelado = false
    if (firstLoad.current) setLoadingProducts(true); else setRefetching(true)
    const fim = () => { if (!cancelado) { setLoadingProducts(false); setRefetching(false); firstLoad.current = false } }

    if (modoVitrine) {
      Promise.all(raizesVitrine.map(r =>
        fetch(`/api/produtos?cat=${r.id}&limit=${VITRINE_POR_SECAO}`)
          .then(x => x.json())
          .then((j: { items: Product[]; total: number }) => ({ ...r, total: j.total ?? 0, items: (j.items || []).map(decodeProd) }))
          .catch(() => ({ ...r, total: 0, items: [] as Product[] }))
      )).then(rs => {
        if (cancelado) return
        setVitrineRows(rs)
        setTotalFiltrado(rs.reduce((s, r) => s + r.total, 0))
      }).finally(fim)
      return () => { cancelado = true }
    }

    const params = new URLSearchParams({ limit: String(INITIAL_PAGE), offset: '0' })
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (activeBrand !== 'Todos') params.set('marca', activeBrand)
    if (activeCategoria) params.set('cat', activeCategoria)
    if (sortBy !== 'destaque') params.set('sort', sortBy)

    fetch(`/api/produtos?${params}`)
      .then(r => r.json())
      .then((res: { items: Product[]; total: number }) => {
        if (cancelado) return
        setProducts((res.items || []).map(decodeProd))
        setTotalFiltrado(res.total ?? 0)
      })
      .catch(() => { if (!cancelado) { setProducts([]); setTotalFiltrado(0) } })
      .finally(fim)
    // corrida: filtro trocado antes da resposta chegar não pode sobrescrever o novo
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey, modoVitrine, raizesKey])

  const [carregandoMais, setCarregandoMais] = useState(false)
  const carregarMais = useCallback(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(products.length) })
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (activeBrand !== 'Todos') params.set('marca', activeBrand)
    if (activeCategoria) params.set('cat', activeCategoria)
    if (sortBy !== 'destaque') params.set('sort', sortBy)
    setCarregandoMais(true)
    fetch(`/api/produtos?${params}`)
      .then(r => r.json())
      .then((res: { items: Product[] }) => {
        setProducts(prev => [...prev, ...(res.items || []).map(p => ({ ...p, name: dec(p.name) ?? p.name, brand: dec(p.brand) }))])
      })
      .catch(() => {})
      .finally(() => setCarregandoMais(false))
  }, [products.length, debouncedSearch, activeBrand, activeCategoria, sortBy])

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

  // Com uma única raiz (Farmácia), listar só ela esconderia a subcategorização
  // inteira do cliente. Nesse caso navegamos pelas filhas, como o Expresso
  // Paraguai faz: o grupo não vira item de menu, as categorias sim.
  const raizes = categorias.filter(c => !c.parent_id && (
    c.produtos > 0 || categorias.some(ch => ch.parent_id === c.id && ch.produtos > 0)
  ))
  const topCats = raizes.length === 1
    ? categorias.filter(c => c.parent_id === raizes[0].id && c.produtos > 0)
    : raizes
  const catTotals = (c: Categoria) => c.produtos + categorias.filter(ch => ch.parent_id === c.id).reduce((s, ch) => s + ch.produtos, 0)
  topCats.sort((a, b) => catTotals(b) - catTotals(a))

  // Departamento em foco: a seleção pode ser o próprio departamento ou uma
  // filha dele. Com mais de um departamento os chips de topo passam a ser os
  // departamentos, e as subcategorias iriam sumir daqui — por isso a segunda
  // fila, que só aparece quando há um departamento selecionado.
  const deptoAtivo = (() => {
    if (!activeCategoria || raizes.length < 2) return null
    const sel = categorias.find(c => c.id === activeCategoria)
    if (!sel) return null
    return sel.parent_id ? categorias.find(c => c.id === sel.parent_id) ?? null : sel
  })()
  const subChips = deptoAtivo
    ? categorias.filter(c => c.parent_id === deptoAtivo.id && c.produtos > 0).sort((a, b) => b.produtos - a.produtos)
    : []

  const brands = ['Todos', ...marcasFacet.map(m => m.nome)]

  // O recorte já vem pronto do servidor (categoria com filhas, marca, busca e
  // ordenação): products É a lista visível, não um subconjunto a filtrar.
  const visible = products
  const hasMore = !modoVitrine && products.length < totalFiltrado

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

  // Idem: o produto em destaque pode não estar na página carregada.
  const [destaquesProdutos, setDestaquesProdutos] = useState<Product[]>([])
  const destaquesKey = destaques.join(',')
  useEffect(() => {
    if (!destaquesKey) { setDestaquesProdutos([]); return }
    let cancelado = false
    Promise.all(destaquesKey.split(',').map(id =>
      fetch(`/api/produtos/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)
    )).then(rs => {
      if (cancelado) return
      setDestaquesProdutos(rs.filter(Boolean).map((p: Product) => ({ ...p, name: dec(p.name) ?? p.name, brand: dec(p.brand) })))
    })
    return () => { cancelado = true }
  }, [destaquesKey])

  const brandCounts = useMemo(
    () => marcasFacet.reduce((acc, m) => { acc[m.nome] = m.total; return acc }, {} as Record<string, number>),
    [marcasFacet]
  )

  const topBrands = useMemo(
    () => Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
    [brandCounts]
  )

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
          height: 1px; background: #A965ED;
          box-shadow: 0 0 6px rgba(66, 14, 118,0.4);
          transition: left 0.25s, right 0.25s;
        }
        .nav-link:hover::after { left: 0; right: 0; }
        .product-card:hover { border-color: #d4d4d4 !important; box-shadow: 0 12px 28px rgba(0,0,0,0.08) !important; transform: translateY(-3px); }
        .product-card:hover .card-img { transform: scale(1.04); filter: brightness(1.02); }
        .product-card:hover .card-overlay { opacity: 1 !important; }
        .card-add-btn:hover:not(:disabled) { background: #420E76 !important; color: #ffffff !important; border-color: #420E76 !important; box-shadow: 0 4px 12px rgba(66, 14, 118,0.18) !important; }
        .skeleton { background: linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%); background-size: 400px 100%; animation: shimmer 1.4s ease-in-out infinite; }
        .nav-mobile-btn { display: none; }
        .nav-mobile-drawer { display: none; position: absolute; top: 60px; left: 0; right: 0; background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); border-bottom: 1px solid #ececec; padding: 12px 16px; flex-direction: column; gap: 4px; z-index: 200; box-shadow: 0 8px 16px rgba(0,0,0,0.06); }
        .nav-desktop { display: flex; align-items: center; gap: 2px; flex: 1; justify-content: center; min-width: 0; }
        .nav-cat-btn { padding: 0 12px; height: 60px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #737373; background: none; border: none; cursor: pointer; transition: color 0.15s; white-space: nowrap; }
        .nav-cat-btn:hover { color: #0a0a0a; }
        .nav-cat-btn.active { color: #420E76; }
        .nav-cat-btn.active::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 0; height: 2px; background: #A965ED; box-shadow: 0 0 6px rgba(66, 14, 118,0.4); }
        .nav-cat-btn { position: relative; }
        .nav-cat-skel { width: 78px; height: 12px; border-radius: 4px; flex-shrink: 0; }
        .header-account:hover { color: #0a0a0a !important; border-color: #d4d4d4 !important; }
        .header-cart:hover { box-shadow: 0 4px 12px rgba(66, 14, 118,0.18) !important; border-color: rgba(66, 14, 118,0.5) !important; }
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
        .cat-chip-active { background: rgba(66, 14, 118,0.08) !important; border-color: rgba(66, 14, 118,0.4) !important; color: #420E76 !important; }
        .cat-chip-inactive { border-color: #ececec; color: #737373; background: #ffffff; }
        .cat-chip-inactive:hover { border-color: #d4d4d4; color: #0a0a0a; }
        .cat-chip-sub { padding: 5px 11px; font-size: 10px; letter-spacing: 0.05em; font-weight: 600; text-transform: none; }
        .destaques-scroll { display: flex; gap: 16px; overflow-x: auto; scrollbar-width: none; padding-bottom: 8px; }
        .destaques-scroll::-webkit-scrollbar { display: none; }
        .category-strip-wrapper { margin-bottom: 36px; }
        .category-strip { display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
        .category-strip::-webkit-scrollbar { display: none; }
        .category-strip-card { flex-shrink: 0; width: 108px; border: none; background: none; padding: 0; cursor: pointer; display: flex; flex-direction: column; }
        .category-strip-label { background: #0a0a0a; color: #ffffff; font-size: 10px; font-weight: 800; letter-spacing: 0.02em; text-align: center; padding: 8px 6px; border-radius: 10px 10px 0 0; line-height: 1.25; min-height: 32px; display: flex; align-items: center; justify-content: center; }
        .category-strip-swatch { position: relative; width: 100%; aspect-ratio: 1 / 1; border-radius: 0 0 10px 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .category-strip-card:hover .category-strip-label { background: #420E76; }
        .carousel-row { margin-bottom: 40px; }
        .carousel-row-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .carousel-row-icon { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
        .carousel-row-title { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.01em; color: #0a0a0a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .carousel-row-count { flex-shrink: 0; font-size: 11px; color: #a3a3a3; font-weight: 700; background: #f5f5f5; padding: 2px 8px; border-radius: 99px; }
        .carousel-see-all { background: none; border: none; color: #420E76; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; cursor: pointer; padding: 0; white-space: nowrap; }
        .carousel-arrow { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #ececec; background: #ffffff; color: #404040; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.15s, color 0.15s; flex-shrink: 0; }
        .carousel-arrow:hover { border-color: rgba(66, 14, 118,0.4); color: #420E76; }
        .carousel-track { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none; padding-bottom: 4px; }
        .carousel-track::-webkit-scrollbar { display: none; }
        .product-card-compact { transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s; }
        .product-card-compact:hover { border-color: #d4d4d4; box-shadow: 0 10px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
        }
        }
        .brand-card { transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s; cursor: pointer; }
        .brand-card:hover { border-color: rgba(66, 14, 118,0.4) !important; box-shadow: 0 8px 24px rgba(66, 14, 118,0.08) !important; transform: translateY(-2px); }
        .footer-brand-link { transition: color 0.15s; }
        .footer-brand-link:hover { color: #420E76 !important; }
        @media (max-width: 640px) {
          /* nav */
          .promo-banners-row { grid-template-columns: 1fr !important; }
          .nav-rate { display: none !important; }
          .nav-cart-txt { display: none !important; }
          .nav-acct-txt { display: none !important; }
          .nav-mobile-btn { display: flex !important; align-items: center; justify-content: center; width: 36px; height: 36px; background: #fafafa; border: 1px solid #ececec; border-radius: 8px; color: #404040; cursor: pointer; font-size: 18px; }
          .nav-mobile-drawer.open { display: flex !important; }
          /* hero — banner sozinho no mobile, sem o widget de vídeo */
          .hero-row { padding: 8px !important; }
          .hero-video-col { display: none !important; }
          .hero-banner-col { flex: 1 1 100% !important; }
          /* catálogo */
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .card-img-wrap { padding: 10px !important; }
          .ver-mais-btn { padding: 12px 24px !important; font-size: 11px !important; }
          /* carrosséis de categoria */
          .category-strip-card { width: 92px !important; }
          .carousel-row-title { font-size: 14px !important; max-width: 130px; }
          .product-card-compact { width: 152px !important; }
          /* como funciona — scroll horizontal */
          .como-grid { display: flex !important; overflow-x: auto !important; gap: 12px !important; scrollbar-width: none !important; padding-bottom: 4px !important; }
          .como-grid::-webkit-scrollbar { display: none !important; }
          /* marcas — scroll horizontal */
          .brand-grid { display: flex !important; overflow-x: auto !important; gap: 8px !important; scrollbar-width: none !important; padding-bottom: 4px !important; flex-wrap: nowrap !important; }
          .brand-grid::-webkit-scrollbar { display: none !important; }
          .brand-card { min-width: 100px !important; flex-shrink: 0 !important; }
          /* seções intermediárias — padding reduzido */
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
        <div style={{ background: 'rgba(66, 14, 118,0.06)', borderBottom: '1px solid rgba(66, 14, 118,0.2)', padding: '8px 24px', textAlign: 'center', fontSize: 12, color: '#420E76', fontWeight: 600, letterSpacing: '0.04em' }}>
          {aviso}
        </div>
      )}

      {/* HERO */}
      {/* HERO: banner estático de atacado. O carrossel neon saiu — falava a
          língua do varejo hype e empurrava o catálogo pra baixo da dobra.
          Asset pré-otimizado em /public (sem custo de /_next/image). */}
      {isHome && initial && (
        <Hero eletronicos={initial.deptEletronicos} farmacia={initial.deptFarmacia} total={initial.total} />
      )}


      {isHome && initial && (
        <>
          <ComoComprar />
          <Departamentos cards={initial.departamentos} />
          <Categorias cats={initial.catLinks} />
          <Entrega />
        </>
      )}

      {/* PRODUTOS */}
      <section id="catalogo" className="catalogo-section" style={{ maxWidth: 1280, margin: '0 auto', padding: isHome ? '64px 24px 96px' : '28px 24px 96px' }}>
        {!isHome && (
          <button onClick={() => aplicarFiltro('', 'Todos')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#737373', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Início
          </button>
        )}
        {modoVitrine ? (
          <>
            <CategoryStrip rows={vitrineRows} onSelect={id => aplicarFiltro(id, 'Todos')} />
            {destaquesProdutos.length > 0 && (
              <CategoryCarouselRow id="destaques" nome="Mais Vendidos" total={destaquesProdutos.length} items={destaquesProdutos} icon="🔥" />
            )}
            {vitrineRows.map(row => (
              <CategoryCarouselRow key={row.id} id={row.id} nome={row.nome} total={row.total} items={row.items} onSeeAll={id => aplicarFiltro(id, 'Todos')} />
            ))}
          </>
        ) : (
        <>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10, flexWrap: 'wrap' as const }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#0a0a0a' }}>
              {activeCategoria ? (categorias.find(c => c.id === activeCategoria)?.nome ?? 'Catálogo')
                : activeBrand !== 'Todos' ? activeBrand
                : debouncedSearch ? `Busca: "${debouncedSearch}"`
                : 'Catálogo'}
            </h2>
            <span style={{ fontSize: 11, color: '#737373', fontWeight: 600, letterSpacing: '0.04em' }}>
              {loadingProducts ? 'carregando…' : `${totalFiltrado} produtos disponíveis`}
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
                onClick={() => aplicarFiltro('', 'Todos')}>
                TODAS
                <span style={{ opacity: 0.7, fontSize: 10 }}>{totalCatalogo}</span>
              </button>
              {topCats.map(c => {
                const total = catTotals(c)
                // também destacado quando quem está selecionado é uma filha,
                // senão escolher Tirzepatida apagaria FARMÁCIA do caminho
                const isActive = activeCategoria === c.id || deptoAtivo?.id === c.id
                const color = catColor(c.id)
                return (
                  <button key={c.id}
                    className={`cat-chip ${isActive ? 'cat-chip-active' : 'cat-chip-inactive'}`}
                    onClick={() => aplicarFiltro(c.id, 'Todos')}
                    style={isActive ? { background: `${color}15`, borderColor: `${color}66`, color } : undefined}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: isActive ? `0 0 4px ${color}80` : 'none', display: 'inline-block' }} />
                    {c.nome.toUpperCase()}
                    <span style={{ opacity: 0.7, fontSize: 10 }}>{total}</span>
                  </button>
                )
              })}
            </div>
            {subChips.length > 0 && (
              <div className="cat-chips" style={{ marginTop: 8 }}>
                {subChips.map(s => {
                  const isActive = activeCategoria === s.id
                  return (
                    <button key={s.id}
                      className={`cat-chip cat-chip-sub ${isActive ? 'cat-chip-active' : 'cat-chip-inactive'}`}
                      onClick={() => aplicarFiltro(s.id, 'Todos')}>
                      {s.nome}
                      <span style={{ opacity: 0.7, fontSize: 10 }}>{s.produtos}</span>
                    </button>
                  )
                })}
              </div>
            )}
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
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(66, 14, 118,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#ececec')} />
              {refetching && (
                <div style={{ position: 'absolute', right: search ? 32 : 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid #ececec', borderTopColor: '#A965ED', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              )}
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
              )}
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setFilterOpen(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', height: 40, background: activeBrand !== 'Todos' ? 'rgba(66, 14, 118,0.06)' : '#ffffff', border: `1px solid ${activeBrand !== 'Todos' ? 'rgba(66, 14, 118,0.4)' : '#ececec'}`, borderRadius: 8, color: activeBrand !== 'Todos' ? '#420E76' : '#404040', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
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
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 6, border: 'none', background: activeBrand === br ? 'rgba(66, 14, 118,0.06)' : 'transparent', color: activeBrand === br ? '#420E76' : '#404040', fontSize: 13, fontWeight: activeBrand === br ? 700 : 500, cursor: 'pointer', transition: 'background 0.1s' }}
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
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', height: 40, background: sortBy !== 'destaque' ? 'rgba(66, 14, 118,0.06)' : '#ffffff', border: `1px solid ${sortBy !== 'destaque' ? 'rgba(66, 14, 118,0.4)' : '#ececec'}`, borderRadius: 8, color: sortBy !== 'destaque' ? '#420E76' : '#404040', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
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
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 6, border: 'none', background: sortBy === opt ? 'rgba(66, 14, 118,0.06)' : 'transparent', color: sortBy === opt ? '#420E76' : '#404040', fontSize: 13, fontWeight: sortBy === opt ? 700 : 500, cursor: 'pointer', transition: 'background 0.1s' }}
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
              {totalFiltrado} produto{totalFiltrado !== 1 ? 's' : ''} encontrado{totalFiltrado !== 1 ? 's' : ''}
              {search && <span style={{ color: '#420E76' }}> para &ldquo;{search}&rdquo;</span>}
              {' '}
              <button onClick={() => { setSearch(''); setActiveBrand('Todos'); setActiveCategoria('') }}
                style={{ background: 'none', border: 'none', color: '#420E76', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}>
                limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* SEÇÃO DESTAQUES */}
        {!loadingProducts && destaquesProdutos.length > 0 && !search && !activeCategoria && activeBrand === 'Todos' && sortBy === 'destaque' && (
          <section style={{ marginBottom: 48 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, fontWeight: 900, letterSpacing: '-0.01em', margin: '0 0 16px', color: '#0a0a0a' }}>
              <span style={{ width: 3, height: 22, background: '#A965ED', borderRadius: 99, boxShadow: '0 0 6px rgba(66, 14, 118,0.4)' }} />
              MAIS VENDIDOS
              <span style={{ background: 'rgba(66, 14, 118,0.08)', border: '1px solid rgba(66, 14, 118,0.3)', color: '#420E76', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.1em' }}>
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
                        <span style={{ position: 'absolute', top: 8, left: 8, background: '#420E76', color: '#ffffff', fontSize: 8, fontWeight: 900, padding: '3px 7px', borderRadius: 4, letterSpacing: '0.08em' }}>PROMO</span>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {p.brand && (
                        <span style={{ fontSize: 8, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em' }}>{p.brand.toUpperCase()}</span>
                      )}
                      <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.name}</h4>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#420E76', lineHeight: 1 }}>
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
              <div style={{ width: 32, height: 32, border: '3px solid #ececec', borderTopColor: '#A965ED', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
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
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#F6BD0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', color: '#F6BD0C' }}>DISTRIBUIDOR OFICIAL</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 8 }}>
                          LINHA<br/><span style={{ color: '#F6BD0C', textShadow: '0 0 20px rgba(72,144,255,0.55)' }}>ZPHC</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 18 }}>Farmacêuticos certificados.<br/>Alta pureza. Estoque imediato.</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: '#F6BD0C', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', boxShadow: '0 4px 16px rgba(72,144,255,0.4)' }}>
                          VER LINHA ZPHC
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                      <div aria-hidden="true" style={{ position: 'relative', flexShrink: 0, width: 88, height: 88, opacity: 0.9 }}>
                        {[{t:'10%',l:'15%',s:3,d:'0s'},{t:'65%',l:'75%',s:2,d:'0.8s'},{t:'75%',l:'5%',s:2,d:'1.4s'},{t:'20%',l:'82%',s:3,d:'0.4s'}].map((d,i)=>(
                          <div key={i} style={{ position:'absolute', top:d.t, left:d.l, width:d.s, height:d.s, borderRadius:'50%', background:'#F6BD0C', boxShadow:'0 0 5px #F6BD0C', animation:`floatDot ${3+i*0.6}s ease-in-out infinite`, animationDelay:d.d }}/>
                        ))}
                        <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
                          <path d="M44 8 L74 20 L74 46 C74 60 62 72 44 80 C26 72 14 60 14 46 L14 20 Z" stroke="#F6BD0C" strokeWidth="1.8" fill="rgba(72,144,255,0.06)" opacity="0.75"/>
                          <polyline points="30 44 41 55 58 34" stroke="#F6BD0C" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                        </svg>
                      </div>
                    </div>

                    {/* Biogenises Banner */}
                    <div onClick={() => { setActiveBrand('BIOGENESIS'); setActiveCategoria('') }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(169, 101, 237,0.38)'; el.style.boxShadow = '0 12px 40px rgba(0,30,0,0.8), 0 0 40px rgba(169, 101, 237,0.1), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(169, 101, 237,0.14)'; el.style.boxShadow = '0 8px 32px rgba(0,30,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)' }}
                      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '28px 32px', background: 'linear-gradient(135deg, #030a03 0%, #051405 40%, #071d07 70%, #0a2408 100%)', border: '1px solid rgba(169, 101, 237,0.14)', boxShadow: '0 8px 32px rgba(0,30,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: 160 }}>
                      <div aria-hidden="true" style={{ position: 'absolute', right: -20, top: -20, width: 200, height: 200, background: 'radial-gradient(circle, rgba(169, 101, 237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, right: 0, height: 60, background: 'linear-gradient(to top, rgba(169, 101, 237,0.04), transparent)', pointerEvents: 'none' }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'rgba(169, 101, 237,0.07)', border: '1px solid rgba(169, 101, 237,0.22)', marginBottom: 12 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#A965ED', boxShadow: '0 0 5px #A965ED', animation: 'pulseDot 3s ease-in-out infinite' }} />
                          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', color: '#A965ED' }}>BIOTECNOLOGIA</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 8 }}>
                          LINHA<br/><span style={{ color: '#A965ED', textShadow: '0 0 20px rgba(169, 101, 237,0.55)' }}>BIOGENISES</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 18 }}>Peptídeos de alta pureza.<br/>Qualidade laboratório certificado.</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: 'rgba(169, 101, 237,0.1)', border: '1px solid rgba(169, 101, 237,0.35)', color: '#A965ED', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', boxShadow: '0 4px 16px rgba(169, 101, 237,0.18)' }}>
                          VER LINHA BIOGENISES
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                      <div aria-hidden="true" style={{ position: 'relative', flexShrink: 0, width: 88, height: 88, opacity: 0.9 }}>
                        {[{t:'12%',l:'48%',s:3,d:'0s'},{t:'58%',l:'8%',s:2,d:'0.7s'},{t:'78%',l:'68%',s:3,d:'1.3s'},{t:'30%',l:'82%',s:2,d:'0.3s'}].map((d,i)=>(
                          <div key={i} style={{ position:'absolute', top:d.t, left:d.l, width:d.s, height:d.s, borderRadius:'50%', background:'#A965ED', boxShadow:'0 0 5px #A965ED', animation:`floatDot ${3+i*0.5}s ease-in-out infinite`, animationDelay:d.d }}/>
                        ))}
                        <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
                          <circle cx="44" cy="18" r="10" stroke="#A965ED" strokeWidth="1.8" fill="rgba(169, 101, 237,0.07)" opacity="0.85"/>
                          <circle cx="18" cy="64" r="8" stroke="#A965ED" strokeWidth="1.5" fill="rgba(169, 101, 237,0.05)" opacity="0.7"/>
                          <circle cx="70" cy="64" r="8" stroke="#A965ED" strokeWidth="1.5" fill="rgba(169, 101, 237,0.05)" opacity="0.7"/>
                          <line x1="44" y1="28" x2="18" y2="56" stroke="#A965ED" strokeWidth="1.4" opacity="0.5"/>
                          <line x1="44" y1="28" x2="70" y2="56" stroke="#A965ED" strokeWidth="1.4" opacity="0.5"/>
                          <line x1="26" y1="64" x2="62" y2="64" stroke="#A965ED" strokeWidth="1.4" opacity="0.5"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                <div data-card-id={p.id} className={`product-card${revealedCards.current.has(p.id) ? '' : ' card-pre-reveal'}`}
                  style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', opacity: p.estoque === 0 ? 0.55 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div onClick={() => router.push(`/produtos/${p.id}`)} className="card-img-wrap"
                    style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', flexShrink: 0, background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)', overflow: 'hidden', padding: 14, boxSizing: 'border-box' as const }}>
                    <CardImg src={p.img_url} alt={p.name} />
                    <div className="card-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                      <span style={{ background: '#A965ED', color: '#000', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', padding: '8px 20px', borderRadius: 6, boxShadow: '0 4px 12px rgba(66, 14, 118,0.25)' }}>VER PRODUTO →</span>
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
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#420E76', letterSpacing: '0.14em', width: 'fit-content' }}>{p.brand.toUpperCase()}</span>
                    )}
                    <h3 onClick={() => router.push(`/produtos/${p.id}`)}
                      style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.4, cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                      {p.name}
                    </h3>
                    {p.rating != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: -4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#F7C528" stroke="#F7C528" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
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
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#420E76', lineHeight: 1, letterSpacing: '-0.02em' }}>
                            {currency.code} {fmt(p.usd_price_promo!, currency.rate, currency.code)}
                          </div>
                          <div style={{ fontSize: 9, color: '#b45309', fontWeight: 800, marginTop: 2 }}>-{discount}% OFF</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#420E76', lineHeight: 1, letterSpacing: '-0.02em' }}>
                          {currency.code} {fmt(p.usd_price, currency.rate, currency.code)}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#a3a3a3', marginTop: 4, fontWeight: 500 }}>
                        {currency.code === 'USD' ? `≈ R$ ${fmt(promo ? p.usd_price_promo! : p.usd_price, brlRate, 'BRL')}` : `USD ${(promo ? p.usd_price_promo! : p.usd_price).toFixed(2)}`}
                      </div>
                    </div>
                    <button disabled={p.estoque === 0} className="card-add-btn"
                      onClick={e => { e.stopPropagation(); adicionar({ id: p.id, name: p.name, usd: promo ? p.usd_price_promo! : p.usd_price, img: p.img_url ?? PLACEHOLDER, brand: p.brand ?? undefined }) }}
                      style={{ width: '100%', padding: '11px 0', borderRadius: 8, background: p.estoque === 0 ? '#fafafa' : '#ffffff', border: `1px solid ${p.estoque === 0 ? '#ececec' : 'rgba(66, 14, 118,0.4)'}`, color: p.estoque === 0 ? '#a3a3a3' : '#420E76', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', cursor: p.estoque === 0 ? 'not-allowed' : 'pointer', transition: 'background 0.15s, border-color 0.15s, color 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
              onClick={carregarMais} disabled={carregandoMais}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 40px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(66, 14, 118,0.4)', color: '#420E76', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(66, 14, 118,0.06)'; b.style.borderColor = 'rgba(66, 14, 118,0.5)'; b.style.boxShadow = '0 4px 12px rgba(66, 14, 118,0.18)' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#ffffff'; b.style.borderColor = 'rgba(66, 14, 118,0.4)'; b.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              VER MAIS
              <span style={{ opacity: 0.6, fontSize: 10, fontWeight: 600 }}>{visible.length} / {totalFiltrado}</span>
            </button>
          </div>
        )}

        {!loadingProducts && !hasMore && totalFiltrado > INITIAL_PAGE && (
          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#a3a3a3', letterSpacing: '0.1em' }}>
            TODOS OS {totalFiltrado} PRODUTOS EXIBIDOS
          </div>
        )}
        </>
        )}
      </section>

      {/* WhatsApp FAB */}
      {WHATSAPP_ENABLED && (
        <a href={WHATSAPP_GRUPO_HREF} target="_blank" rel="noopener" aria-label="Entrar no grupo oficial do WhatsApp"
          style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.4)', zIndex: 50, transition: 'transform 0.2s, opacity 0.3s', opacity: fabVisible ? 1 : 0, pointerEvents: fabVisible ? 'auto' : 'none', transform: fabVisible ? 'scale(1)' : 'scale(0.6)' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.1)'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = fabVisible ? 'scale(1)' : 'scale(0.6)'}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      {/* Footer */}
      {isHome && <Contato />}

      <footer style={{ background: '#0A0710', color: '#a3a3a3', padding: '56px 24px 24px' }}>
        <div className="footer-grid" style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr', gap: 48 }}>
          <div>
            <span style={{ display: 'inline-block', marginBottom: 16 }}><Logo size={30} dark /></span>
            <p style={{ color: '#737373', fontSize: 13, lineHeight: 1.7, margin: '0 0 20px', maxWidth: 280 }}>
              Distribuidor atacadista na fronteira do Paraguai: farmácia, Apple, Xiaomi e JBL. Estoque imediato, pagamento via PIX, retirada em loja.
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
              <li><a href="/conta/login" className="footer-brand-link" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Minha Conta</a></li>
              <li><a href="/politica-privacidade" className="footer-brand-link" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Privacidade</a></li>
              <li><a href="/termos" className="footer-brand-link" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>Termos de Uso</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', marginBottom: 18 }}>RETIRADA</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <svg style={{ flexShrink: 0, marginTop: 1 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>Retirada em loja ou entrega em<br />Foz do Iguaçu por equipe própria.</span>
              </li>
              <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <svg style={{ flexShrink: 0, marginTop: 2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 13, lineHeight: 1.7 }}>Pedido pronto em até 24h úteis<br />após a confirmação do PIX.</span>
              </li>
              {WHATSAPP_ENABLED && (
                <li style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                  <svg style={{ flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  <a href={CONTATO_HREF} target="_blank" rel="noopener" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#25d366'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#737373'}>
                    +595 992 636 618
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
            <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(169, 101, 237,0.12)', border: '1px solid rgba(169, 101, 237,0.2)', color: '#A965ED', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>PIX</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>USD</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>BRL</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
