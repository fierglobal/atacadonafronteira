import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'
import CategoriaProductCard from '@/components/CategoriaProductCard'
import { acharCategoriaPorSlug, type CategoriaSeo } from '@/lib/categorias'
import { SITE_URL, SITE_NAME } from '@/lib/site'

const POR_PAGINA = 48

type Busca = { marca?: string; ordem?: string; pagina?: string }

const ORDENS = [
  { chave: '', rotulo: 'Relevância' },
  { chave: 'menor', rotulo: 'Menor preço' },
  { chave: 'maior', rotulo: 'Maior preço' },
  { chave: 'nome', rotulo: 'A–Z' },
] as const

// Ao contrário da home, o nome do produto vai em TEXTO PURO. A home ofusca em
// base64 contra scraping, mas uma landing de categoria sem texto indexável não
// serve para nada — é o texto que diz ao Google que esta página é sobre peptídeos.
async function getProdutos(cat: CategoriaSeo, b: Busca) {
  const now = new Date().toISOString()
  const ids = [cat.id, ...cat.descendentes]
  const pagina = Math.max(1, parseInt(b.pagina || '1', 10) || 1)
  const de = (pagina - 1) * POR_PAGINA

  let q = supabaseAdmin
    .from('products')
    .select('id, name, brand, usd_price, usd_price_promo, img_url, estoque', { count: 'exact' })
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .in('categoria_id', ids)

  if (b.marca) q = q.eq('brand', b.marca)

  if (b.ordem === 'menor') q = q.order('usd_price', { ascending: true })
  else if (b.ordem === 'maior') q = q.order('usd_price', { ascending: false })
  else if (b.ordem === 'nome') q = q.order('name', { ascending: true })
  else q = q.order('sort_order', { ascending: true })

  const { data, count } = await q.order('id', { ascending: true }).range(de, de + POR_PAGINA - 1)
  return { itens: data || [], total: count ?? 0, pagina }
}

async function getMarcas(cat: CategoriaSeo) {
  const now = new Date().toISOString()
  const { data } = await supabaseAdmin
    .from('products')
    .select('brand')
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .in('categoria_id', [cat.id, ...cat.descendentes])
    .not('brand', 'is', null)
    .range(0, 4999)
  const cont: Record<string, number> = {}
  for (const p of data || []) if (p.brand) cont[p.brand as string] = (cont[p.brand as string] || 0) + 1
  return Object.entries(cont).sort((a, b) => b[1] - a[1])
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cat = await acharCategoriaPorSlug(slug)
  if (!cat) return { title: 'Categoria não encontrada | ' + SITE_NAME }

  const title = `${cat.nome} no Atacado — Direto do Paraguai | ${SITE_NAME}`
  const description =
    `${cat.total} produtos de ${cat.nome.toLowerCase()} em atacado, direto do Paraguai. ` +
    `Preços em dólar, pagamento via PIX e retirada na loja. Estoque imediato no Atacado na Fronteira.`

  return {
    title,
    description,
    // Sempre a URL limpa: as variações com ?marca= e ?ordem= existem para o
    // cliente navegar, não para o Google indexar 300 versões da mesma página.
    alternates: { canonical: `/categoria/${cat.slug}` },
    openGraph: {
      title, description, url: `${SITE_URL}/categoria/${cat.slug}`,
      siteName: SITE_NAME, locale: 'pt_BR', type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${cat.nome} — ${SITE_NAME}` }],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CategoriaPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<Busca> }) {
  const [{ slug }, b] = await Promise.all([params, searchParams])
  const cat = await acharCategoriaPorSlug(slug)
  if (!cat) notFound()

  const [{ itens, total, pagina }, marcas] = await Promise.all([getProdutos(cat, b), getMarcas(cat)])
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  const url = (extra: Partial<Busca>) => {
    const p = new URLSearchParams()
    const m = extra.marca !== undefined ? extra.marca : b.marca
    const o = extra.ordem !== undefined ? extra.ordem : b.ordem
    const pg = extra.pagina
    if (m) p.set('marca', m)
    if (o) p.set('ordem', o)
    if (pg && pg !== '1') p.set('pagina', pg)
    const qs = p.toString()
    return `/categoria/${cat.slug}${qs ? '?' + qs : ''}`
  }

  const trilha = [
    { nome: 'Início', url: SITE_URL + '/' },
    ...(cat.paiNome && cat.paiSlug ? [{ nome: cat.paiNome, url: `${SITE_URL}/categoria/${cat.paiSlug}` }] : []),
    { nome: cat.nome, url: `${SITE_URL}/categoria/${cat.slug}` },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: trilha.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.nome, item: t.url })),
    },
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: `${cat.nome} — ${SITE_NAME}`, url: `${SITE_URL}/categoria/${cat.slug}`,
      mainEntity: {
        '@type': 'ItemList', numberOfItems: cat.total,
        itemListElement: itens.map((p, i) => ({
          '@type': 'ListItem', position: (pagina - 1) * POR_PAGINA + i + 1,
          url: `${SITE_URL}/produtos/${p.id}`, name: p.name,
        })),
      },
    },
  ]

  const chip = (ativo: boolean) => ({
    display: 'inline-block', padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 700,
    textDecoration: 'none', border: `1px solid ${ativo ? '#420E76' : '#ececec'}`,
    background: ativo ? '#420E76' : '#fff', color: ativo ? '#fff' : '#404040',
  })

  // Itens de filtro da sidebar: lista vertical, não pílula horizontal.
  const sidebarLink = (ativo: boolean) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 8, fontSize: 13, textDecoration: 'none',
    fontWeight: ativo ? 800 as const : 600 as const,
    background: ativo ? 'rgba(66, 14, 118,0.08)' : 'transparent',
    color: ativo ? '#420E76' : '#404040',
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 20px 60px' }}>
        <nav aria-label="Trilha de navegação" style={{ fontSize: 12, color: '#737373', marginBottom: 14 }}>
          <Link href="/" style={{ color: '#737373', textDecoration: 'none' }}>Início</Link>
          {cat.paiNome && cat.paiSlug && (
            <>{' / '}<Link href={`/categoria/${cat.paiSlug}`} style={{ color: '#737373', textDecoration: 'none' }}>{cat.paiNome}</Link></>
          )}
          {' / '}<span style={{ color: '#420E76', fontWeight: 700 }}>{cat.nome}</span>
        </nav>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#0a0a0a', letterSpacing: '-0.02em' }}>
            {cat.nome} no atacado
          </h1>
          <span style={{ fontSize: 12.5, color: '#737373' }}>
            {total === 0 ? 'Nenhum produto' : `${total} produto${total > 1 ? 's' : ''}`}
            {b.marca ? ` · ${b.marca}` : ''}
          </span>
        </div>

        {/* Sidebar + grid: no celular vira 1 coluna, os filtros ficam empilhados
            em cima do grid (globals.css). Filtros como LINK, não estado de
            navegador — devolve a navegação ao cliente sem tirar a página do
            índice do Google. */}
        <div className="cat-layout">
          <aside className="cat-sidebar" aria-label="Filtros">
            {marcas.length > 1 && (
              <div className="cat-filter-group">
                <span className="cat-filter-title">MARCA</span>
                <div className="cat-filter-list">
                  <Link href={url({ marca: '', pagina: '1' })} style={sidebarLink(!b.marca)}>Todas as marcas</Link>
                  {marcas.map(([nome, qtd]) => (
                    <Link key={nome} href={url({ marca: nome, pagina: '1' })} style={sidebarLink(b.marca === nome)}>
                      <span>{nome}</span>
                      <span style={{ opacity: 0.6, fontWeight: 600, fontSize: 11.5 }}>{qtd}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="cat-filter-group">
              <span className="cat-filter-title">ORDENAR</span>
              <div className="cat-filter-list">
                {ORDENS.map(o => (
                  <Link key={o.chave} href={url({ ordem: o.chave, pagina: '1' })} style={sidebarLink((b.ordem || '') === o.chave)}>{o.rotulo}</Link>
                ))}
              </div>
            </div>
          </aside>

          <div className="cat-main">
            {itens.length === 0 ? (
              <p style={{ padding: '40px 0', color: '#737373' }}>
                Nada encontrado com esse filtro. <Link href={url({ marca: '', ordem: '', pagina: '1' })} style={{ color: '#420E76', fontWeight: 700 }}>Ver tudo em {cat.nome}</Link>.
              </p>
            ) : (
              <div className="categoria-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                {itens.map(p => <CategoriaProductCard key={p.id} p={p} />)}
              </div>
            )}

            {totalPaginas > 1 && (
              <nav aria-label="Paginação" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginTop: 30 }}>
                {pagina > 1 && <Link href={url({ pagina: String(pagina - 1) })} style={chip(false)}>← Anterior</Link>}
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
                  .map((n, i, arr) => (
                    <span key={n}>
                      {i > 0 && arr[i - 1] !== n - 1 && <span style={{ color: '#a3a3a3', padding: '0 4px' }}>…</span>}
                      <Link href={url({ pagina: String(n) })} style={chip(n === pagina)}>{n}</Link>
                    </span>
                  ))}
                {pagina < totalPaginas && <Link href={url({ pagina: String(pagina + 1) })} style={chip(false)}>Próxima →</Link>}
              </nav>
            )}
          </div>
        </div>

        {/* Texto para SEO: fica no rodapé da página, não compete com o filtro
            nem com o grid pela primeira tela. */}
        <p style={{ fontSize: 14, color: '#737373', margin: '48px 0 0', paddingTop: 24, borderTop: '1px solid #ececec', maxWidth: 720, lineHeight: 1.6 }}>
          {cat.total} {cat.total === 1 ? 'produto disponível' : 'produtos disponíveis'} de {cat.nome.toLowerCase()},
          direto do Paraguai. Preços de atacado em dólar, pagamento via PIX e retirada na loja.
        </p>
      </main>
    </>
  )
}
