import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'
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

const fmtUsd = (n: number) => n.toFixed(2).replace('.', ',')

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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 60px' }}>
        <nav aria-label="Trilha de navegação" style={{ fontSize: 12, color: '#737373', marginBottom: 16 }}>
          <Link href="/" style={{ color: '#737373', textDecoration: 'none' }}>Início</Link>
          {cat.paiNome && cat.paiSlug && (
            <>{' / '}<Link href={`/categoria/${cat.paiSlug}`} style={{ color: '#737373', textDecoration: 'none' }}>{cat.paiNome}</Link></>
          )}
          {' / '}<span style={{ color: '#420E76', fontWeight: 700 }}>{cat.nome}</span>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: '#0a0a0a', letterSpacing: '-0.02em' }}>
          {cat.nome} no atacado
        </h1>
        <p style={{ fontSize: 15, color: '#525252', margin: '0 0 20px', maxWidth: 720, lineHeight: 1.6 }}>
          {cat.total} {cat.total === 1 ? 'produto disponível' : 'produtos disponíveis'} de {cat.nome.toLowerCase()},
          direto do Paraguai. Preços de atacado em dólar, pagamento via PIX e retirada na loja.
        </p>

        {/* Filtros como LINK, não estado de navegador: é o que devolve a navegação
            ao cliente sem tirar a página do índice do Google. */}
        {marcas.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
            <Link href={url({ marca: '', pagina: '1' })} style={chip(!b.marca)}>Todas as marcas</Link>
            {marcas.map(([nome, qtd]) => (
              <Link key={nome} href={url({ marca: nome, pagina: '1' })} style={chip(b.marca === nome)}>
                {nome} <span style={{ opacity: 0.65, fontWeight: 600 }}>{qtd}</span>
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid #ececec' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#a3a3a3' }}>ORDENAR</span>
          {ORDENS.map(o => (
            <Link key={o.chave} href={url({ ordem: o.chave, pagina: '1' })} style={chip((b.ordem || '') === o.chave)}>{o.rotulo}</Link>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#737373' }}>
            {total === 0 ? 'Nenhum produto' : `${total} produto${total > 1 ? 's' : ''}`}
            {b.marca ? ` · ${b.marca}` : ''}
          </span>
        </div>

        {itens.length === 0 ? (
          <p style={{ padding: '40px 0', color: '#737373' }}>
            Nada encontrado com esse filtro. <Link href={url({ marca: '', ordem: '', pagina: '1' })} style={{ color: '#420E76', fontWeight: 700 }}>Ver tudo em {cat.nome}</Link>.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
            {itens.map(p => {
              const promo = p.usd_price_promo != null && Number(p.usd_price_promo) < Number(p.usd_price)
              const preco = promo ? Number(p.usd_price_promo) : Number(p.usd_price)
              return (
                <Link key={p.id} href={`/produtos/${p.id}`}
                  style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column', opacity: p.estoque === 0 ? 0.55 : 1 }}>
                  <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#fafafa' }}>
                    {p.img_url && <Image src={p.img_url} alt={p.name} fill sizes="190px" style={{ objectFit: 'contain', padding: 12 }} />}
                  </div>
                  <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    {p.brand && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em' }}>{p.brand}</span>}
                    <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.35 }}>{p.name}</h2>
                    <div style={{ marginTop: 'auto', paddingTop: 6, fontSize: 15, fontWeight: 900, color: '#420E76' }}>USD {fmtUsd(preco)}</div>
                  </div>
                </Link>
              )
            })}
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
      </main>
    </>
  )
}
