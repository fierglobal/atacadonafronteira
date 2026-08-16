import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'
import { listarCategoriasSeo, acharCategoriaPorSlug, type CategoriaSeo } from '@/lib/categorias'
import { SITE_URL, SITE_NAME } from '@/lib/site'

export const revalidate = 300

const POR_PAGINA = 48

// Ao contrário da home, aqui o nome do produto vai em TEXTO PURO. A home
// ofusca em base64 contra scraping, mas uma landing de categoria sem texto
// indexável não serve para nada — é justamente o texto que faz o Google
// entender que esta página é sobre "peptídeos" e não sobre a loja inteira.
async function getProdutos(cat: CategoriaSeo) {
  const now = new Date().toISOString()
  const ids = [cat.id, ...cat.descendentes]
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, brand, usd_price, usd_price_promo, img_url, estoque, descricao_curta')
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .in('categoria_id', ids)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .range(0, POR_PAGINA - 1)
  return data || []
}

export async function generateStaticParams() {
  const cats = await listarCategoriasSeo()
  return cats.map(c => ({ slug: c.slug }))
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

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cat = await acharCategoriaPorSlug(slug)
  if (!cat) notFound()

  const produtos = await getProdutos(cat)

  const trilha = [
    { nome: 'Início', url: SITE_URL + '/' },
    ...(cat.paiNome && cat.paiSlug ? [{ nome: cat.paiNome, url: `${SITE_URL}/categoria/${cat.paiSlug}` }] : []),
    { nome: cat.nome, url: `${SITE_URL}/categoria/${cat.slug}` },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: trilha.map((t, i) => ({
        '@type': 'ListItem', position: i + 1, name: t.nome, item: t.url,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${cat.nome} — ${SITE_NAME}`,
      url: `${SITE_URL}/categoria/${cat.slug}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: cat.total,
        itemListElement: produtos.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/produtos/${p.id}`,
          name: p.name,
        })),
      },
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 60px' }}>
        <nav aria-label="Trilha de navegação" style={{ fontSize: 12, color: '#737373', marginBottom: 16 }}>
          <Link href="/" style={{ color: '#737373', textDecoration: 'none' }}>Início</Link>
          {cat.paiNome && cat.paiSlug && (
            <>
              {' / '}
              <Link href={`/categoria/${cat.paiSlug}`} style={{ color: '#737373', textDecoration: 'none' }}>{cat.paiNome}</Link>
            </>
          )}
          {' / '}<span style={{ color: '#420E76', fontWeight: 700 }}>{cat.nome}</span>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: '#0a0a0a', letterSpacing: '-0.02em' }}>
          {cat.nome} no atacado
        </h1>
        <p style={{ fontSize: 15, color: '#525252', margin: '0 0 28px', maxWidth: 720, lineHeight: 1.6 }}>
          {cat.total} {cat.total === 1 ? 'produto disponível' : 'produtos disponíveis'} de {cat.nome.toLowerCase()},
          direto do Paraguai. Preços de atacado em dólar, pagamento via PIX e retirada na loja.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
          {produtos.map(p => {
            const promo = p.usd_price_promo != null && Number(p.usd_price_promo) < Number(p.usd_price)
            const preco = promo ? Number(p.usd_price_promo) : Number(p.usd_price)
            return (
              <Link key={p.id} href={`/produtos/${p.id}`}
                style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#fafafa' }}>
                  {p.img_url && (
                    <Image src={p.img_url} alt={p.name} fill sizes="190px" style={{ objectFit: 'contain', padding: 12 }} />
                  )}
                </div>
                <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  {p.brand && (
                    <span style={{ fontSize: 8.5, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em' }}>{p.brand}</span>
                  )}
                  <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.35 }}>{p.name}</h2>
                  <div style={{ marginTop: 'auto', paddingTop: 6, fontSize: 15, fontWeight: 900, color: '#420E76' }}>
                    USD {fmtUsd(preco)}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {cat.total > produtos.length && (
          <p style={{ marginTop: 28, fontSize: 13, color: '#737373' }}>
            Mostrando {produtos.length} de {cat.total} produtos.{' '}
            <Link href={`/?cat=${cat.id}#catalogo`} style={{ color: '#420E76', fontWeight: 700 }}>
              Ver todos em {cat.nome}
            </Link>
          </p>
        )}
      </main>
    </>
  )
}
