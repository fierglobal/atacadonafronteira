import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'

export const revalidate = 60

const toTitle = (s: string) =>
  s.toLowerCase().replace(/\b([a-záàãâéêíóôõúüç])/gi, c => c.toUpperCase())
   .replace(/\b(\d+)(mg|ml|ui|iu|dac)\b/gi, (_, n, u) => n + u.toUpperCase())

const stripMd = (s: string) => s.replace(/[*#`>-]/g, '').replace(/\s+/g, ' ').trim()

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('products')
    .select('name, titulo, descricao_curta, descricao, img_url, brand, usd_price')
    .eq('id', id)
    .eq('ativo', true)
    .single()

  if (!data) return { title: 'Produto não encontrado | Atacado na Fronteira' }

  const name = (data.titulo as string) || (data.name as string) || ''
  const brand = (data.brand as string | null) || null
  const titulo = toTitle(name)
  const desc = (data.descricao_curta as string)
    || (data.descricao ? stripMd(data.descricao as string).slice(0, 160) : `${titulo} disponível no Atacado na Fronteira`)
  const img = data.img_url ? [data.img_url as string] : ['/og-image.png']
  const title = `${titulo} — Atacado na Fronteira`

  return {
    title,
    description: desc,
    alternates: { canonical: `/produtos/${id}` },
    openGraph: { title: titulo, description: desc, images: img, type: 'website', siteName: 'Atacado na Fronteira' },
    twitter: { card: 'summary_large_image', title: titulo, description: desc, images: img },
    other: brand ? { 'product:brand': brand } : undefined,
  }
}

export default async function ProdutoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: p } = await supabaseAdmin
    .from('products')
    .select('name, titulo, descricao_curta, descricao, img_url, brand, usd_price, usd_price_promo, estoque, sku')
    .eq('id', id)
    .eq('ativo', true)
    .single()

  // Sem isto a rota devolve 200 com "Produto não encontrado" no corpo — um soft
  // 404. Com 47 produtos desativados (perfumes, PODs, acessórios), seriam 47
  // páginas vazias indexáveis.
  if (!p) notFound()

  const name = (p.titulo as string) || (p.name as string) || ''
  const brand = p.brand as string | null

  const base = p.usd_price as number | null
  const promo = p.usd_price_promo as number | null
  const precoVigente = promo != null && base != null && promo < base ? promo : base

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: toTitle(name),
    image: p.img_url ? [p.img_url] : [],
    description: (p.descricao_curta as string) || (p.descricao ? stripMd(p.descricao as string).slice(0, 300) : undefined),
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    sku: p.sku || undefined,
    offers: {
      '@type': 'Offer',
      // Mesma regra da vitrine (promo < base vence). Antes anunciava sempre o
      // usd_price: num produto em oferta o rich result do Google mostrava um preço
      // e a página mostrava outro, que é o tipo de divergência que derruba o rich
      // result inteiro — e ainda por cima anunciava caro.
      price: typeof precoVigente === 'number' ? precoVigente.toFixed(2) : undefined,
      priceCurrency: 'USD',
      availability: p.estoque === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `https://atacadonafronteira.com/produtos/${id}`,
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      {children}
    </>
  )
}
