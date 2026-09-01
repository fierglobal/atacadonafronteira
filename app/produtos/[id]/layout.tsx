import type { Metadata } from 'next'
import { isEmBreve } from '@/lib/produto'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'

export const revalidate = 60

// Existe porque metade do catálogo é cadastrado em CAIXA ALTA ("MOUNJARO KWIKPEN
// 10 MG") e gritar no <title> fica ruim. Mas antes reescrevia TODO nome: "iPhone"
// virava "Iphone", "256GB" virava "256gb" e "PRÉ-VENDA" virava "PrÉ-Venda" — o
// acento quebra o \b do JS, que é ASCII. Agora só mexe em nome gritado; nome com
// caixa intencional foi digitado assim de propósito e fica como está.
const toTitle = (s: string, brand?: string | null) => {
  const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, '')
  const gritado = letras.length > 0 && letras.replace(/[^A-ZÀ-Þ]/g, '').length / letras.length >= 0.8
  if (!gritado) return s
  let out = s.toLowerCase()
    .replace(/(^|[^A-Za-zÀ-ÿ])([a-zà-ÿ])/g, (_, pre, c) => pre + c.toUpperCase())
    .replace(/(\d+)\s?(mg|ml|ui|iu|gb|tb|dac|un|kg|w|pa)\b/gi, (_, n, u) => n + u.toUpperCase())
  // Recapitalizar caixa alta transforma sigla em palavra: ZPHC vira "Zphc". Não dá
  // para adivinhar qual token é sigla, mas a marca do próprio produto está no
  // banco — devolve pelo menos essa à forma correta.
  if (brand) {
    const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    out = out.replace(re, brand)
  }
  return out
}

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
  const titulo = toTitle(name, brand)
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
    .select('name, titulo, descricao_curta, descricao, img_url, brand, usd_price, usd_price_promo, estoque, sku, badges')
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
    name: toTitle(name, brand),
    image: p.img_url ? [p.img_url] : [],
    description: (p.descricao_curta as string) || (p.descricao ? stripMd(p.descricao as string).slice(0, 300) : undefined),
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    sku: p.sku || undefined,
    // Produto de pré-venda sai sem `offers`: declarar preço e InStock pro Google anuncia
    // disponibilidade que não existe, e alimenta Shopping e rich result. Offer sem `price` é
    // inválido no schema, então o certo é omitir o bloco, não zerar o valor.
    ...(isEmBreve(p as never) ? {} : { offers: {
      '@type': 'Offer',
      // Mesma regra da vitrine (promo < base vence). Antes anunciava sempre o
      // usd_price: num produto em oferta o rich result do Google mostrava um preço
      // e a página mostrava outro, que é o tipo de divergência que derruba o rich
      // result inteiro — e ainda por cima anunciava caro.
      price: typeof precoVigente === 'number' ? precoVigente.toFixed(2) : undefined,
      priceCurrency: 'USD',
      availability: p.estoque === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `https://atacadonafronteira.com/produtos/${id}`,
    } }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      {children}
    </>
  )
}
