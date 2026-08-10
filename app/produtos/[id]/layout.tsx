import type { Metadata } from 'next'
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
  const img = data.img_url ? [data.img_url as string] : ['/og-default.png']
  const title = `${titulo} — Atacado na Fronteira`

  return {
    title,
    description: desc,
    openGraph: { title: titulo, description: desc, images: img, type: 'website', siteName: 'Atacado na Fronteira' },
    twitter: { card: 'summary_large_image', title: titulo, description: desc, images: img },
    other: brand ? { 'product:brand': brand } : undefined,
  }
}

export default async function ProdutoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: p } = await supabaseAdmin
    .from('products')
    .select('name, titulo, descricao_curta, descricao, img_url, brand, usd_price, estoque, sku')
    .eq('id', id)
    .eq('ativo', true)
    .single()

  const name = p ? ((p.titulo as string) || (p.name as string) || '') : ''
  const brand = p ? (p.brand as string | null) : null

  const jsonLd = p ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: toTitle(name),
    image: p.img_url ? [p.img_url] : [],
    description: (p.descricao_curta as string) || (p.descricao ? stripMd(p.descricao as string).slice(0, 300) : undefined),
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    sku: p.sku || undefined,
    offers: {
      '@type': 'Offer',
      price: typeof p.usd_price === 'number' ? p.usd_price.toFixed(2) : undefined,
      priceCurrency: 'USD',
      availability: p.estoque === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `https://atacadonafronteira.com/produtos/${id}`,
    },
  } : null

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <SiteHeader />
      {children}
    </>
  )
}
