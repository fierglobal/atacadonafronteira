import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import CategoriaProductCard from '@/components/CategoriaProductCard'
import { SITE_URL, SITE_NAME } from '@/lib/site'

const POR_PAGINA = 48

type Busca = { pagina?: string }

export const metadata: Metadata = {
  title: `Promoções no Atacado — Direto do Paraguai | ${SITE_NAME}`,
  description: 'Produtos com desconto ativo, direto do Paraguai: Apple, perfumaria árabe e perfumaria de nicho. Preços em R$, pagamento via PIX e retirada na loja.',
  alternates: { canonical: '/promocoes' },
}

// Mesmo critério de isPromo() (lib/produto.ts), reescrito como filtro
// PostgREST — produto com preço promocional ativo e menor que o preço cheio.
async function getPromocoes(b: Busca) {
  const now = new Date().toISOString()
  const pagina = Math.max(1, parseInt(b.pagina || '1', 10) || 1)
  const de = (pagina - 1) * POR_PAGINA

  const { data, count } = await supabaseAdmin
    .from('products')
    .select('id, name, brand, brl_price, brl_price_promo, usd_price, usd_price_promo, img_url, estoque, badges', { count: 'exact' })
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .not('usd_price_promo', 'is', null)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .range(de, de + POR_PAGINA - 1)

  // usd_price_promo < usd_price não dá pra comparar direto no PostgREST (duas colunas) —
  // filtra no app. Volume pequeno (produtos com promo setada), não pesa a query.
  const itens = (data || []).filter(p => p.usd_price_promo != null && Number(p.usd_price_promo) < Number(p.usd_price))
  return { itens, total: count ?? itens.length, pagina }
}

async function getMenorTierPorProduto(produtoIds: string[]): Promise<Record<string, number>> {
  if (!produtoIds.length) return {}
  const { data } = await supabaseAdmin
    .from('product_price_tiers')
    .select('product_id, brl_price')
    .in('product_id', produtoIds)
    .order('brl_price', { ascending: true })
  const menor: Record<string, number> = {}
  for (const t of data || []) {
    if (menor[t.product_id] === undefined) menor[t.product_id] = Number(t.brl_price)
  }
  return menor
}

export default async function PromocoesPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const b = await searchParams
  const { itens, total, pagina } = await getPromocoes(b)
  const menorTierPorProduto = await getMenorTierPorProduto(itens.map(p => p.id))
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  const url = (extra: Partial<Busca>) => {
    const p = new URLSearchParams()
    const pg = extra.pagina
    if (pg && pg !== '1') p.set('pagina', pg)
    const qs = p.toString()
    return `/promocoes${qs ? '?' + qs : ''}`
  }

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: `Promoções — ${SITE_NAME}`, url: `${SITE_URL}/promocoes`,
    mainEntity: {
      '@type': 'ItemList', numberOfItems: total,
      itemListElement: itens.map((p, i) => ({
        '@type': 'ListItem', position: (pagina - 1) * POR_PAGINA + i + 1,
        url: `${SITE_URL}/produtos/${p.id}`, name: p.name,
      })),
    },
  }

  const chip = (ativo: boolean) => ({
    width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none',
    border: `1px solid ${ativo ? '#420E76' : '#ececec'}`,
    background: ativo ? '#420E76' : '#fff', color: ativo ? '#fff' : '#404040',
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      {/* Faixa de destaque — a única página do site com acento vermelho:
          comunica urgência/desconto, fora da paleta roxo/amarelo de marca. */}
      <div style={{ background: 'linear-gradient(90deg, #420E76 0%, #2b0a4e 100%)', padding: '10px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#ffffff', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F6BD0C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
          Ofertas diretas do Paraguai
        </div>
      </div>

      <main style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '20px 20px 60px', boxSizing: 'border-box' }}>
        <nav aria-label="Trilha de navegação" style={{ fontSize: 12, color: '#737373', marginBottom: 14 }}>
          <Link href="/" style={{ color: '#737373', textDecoration: 'none' }}>Início</Link>
          {' / '}<span style={{ color: '#dc2626', fontWeight: 700 }} aria-current="page">Promoções</span>
        </nav>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: 0, color: '#0a0a0a', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
            Promoções
          </h1>
          <span style={{ fontSize: 14, color: '#737373', fontWeight: 500 }}>
            {total === 0 ? 'Nenhuma oferta ativa no momento' : `${total} oferta${total > 1 ? 's' : ''} ativa${total > 1 ? 's' : ''} no atacado`}
          </span>
        </div>

        {itens.length === 0 ? (
          <p style={{ padding: '40px 0', color: '#737373' }}>
            Nenhum produto em promoção agora. <Link href="/produtos" style={{ color: '#420E76', fontWeight: 700 }}>Ver catálogo completo</Link>.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(184px, 1fr))', gap: 16 }}>
            {itens.map(p => (
              <CategoriaProductCard key={p.id} p={p} menorPrecoAtacado={menorTierPorProduto[p.id] ?? null} />
            ))}
          </div>
        )}

        {itens.length > 0 && (
          <p style={{ fontSize: 12, color: '#a3a3a3', margin: '20px 0 0' }}>
            Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}
          </p>
        )}

        {totalPaginas > 1 && (
          <nav aria-label="Paginação" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 40 }}>
            {pagina > 1 && (
              <Link href={url({ pagina: String(pagina - 1) })} aria-label="Página anterior" style={chip(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </Link>
            )}
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
              .map((n, i, arr) => (
                <span key={n}>
                  {i > 0 && arr[i - 1] !== n - 1 && <span style={{ color: '#a3a3a3', padding: '0 4px' }}>…</span>}
                  <Link href={url({ pagina: String(n) })} style={chip(n === pagina)}>{n}</Link>
                </span>
              ))}
            {pagina < totalPaginas && (
              <Link href={url({ pagina: String(pagina + 1) })} aria-label="Próxima página" style={chip(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            )}
          </nav>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
