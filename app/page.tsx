import { Suspense } from 'react'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import HomeClient, { type HomeInitial } from './HomeClient'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { listarCategoriasSeo } from '@/lib/categorias'
import { SITE_URL, SITE_NAME, WHATSAPP_NUMBER } from '@/lib/site'

// ISR: NUNCA ler searchParams aqui — isso tornaria a rota dinâmica e mataria o
// cache (ver o caso da categoria no Expresso Paraguai). O servidor sempre monta
// a vitrine sem filtro; quando a URL tem ?cat/?marca/?q, o client refaz o
// recorte por cima.
export const revalidate = 60

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  // O plural entra aqui porque é como parte das pessoas procura a loja
  // ("atacados na fronteira"). Não é keyword stuffing: é o nome real que o
  // público usa, escrito uma vez, numa frase que faz sentido lida em voz alta.
  description:
    'Atacado na Fronteira (também procurado como Atacados na Fronteira): catálogo direto do ' +
    'Paraguai com peptídeos, tirzepatida, retatrutida, anabolizantes, celulares e eletrônicos. ' +
    'Preços em dólar, pagamento via PIX e retirada na loja.',
}

// Organization + WebSite: é o mecanismo padrão para declarar ao Google que a marca
// também é conhecida no plural, e para habilitar a caixa de busca do site nos
// resultados. O site não tinha nenhum JSON-LD fora das páginas de produto.
const jsonLdLoja = () => ([
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organizacao`,
    name: SITE_NAME,
    alternateName: ['Atacados na Fronteira', 'Atacado Na Fronteira Paraguai', 'atacadonafronteira'],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    image: `${SITE_URL}/og-image.png`,
    description:
      'Loja de atacado com produtos importados direto do Paraguai: peptídeos, tirzepatida, ' +
      'retatrutida, anabolizantes, celulares e eletrônicos.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: `+${WHATSAPP_NUMBER}`,
      availableLanguage: ['Portuguese', 'Spanish'],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#site`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: 'Atacados na Fronteira',
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE_URL}/#organizacao` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
])

const enc = (s: string | null) => s ? Buffer.from(s).toString('base64') : null

const CAMPOS = 'id, name, brand, usd_price, usd_price_promo, img_url, estoque, categoria_id, descricao_curta, badges, venda_minima, multiplicador'
const VITRINE_POR_SECAO = 12

// Mesmo shape que o client montaria via /api/facetas + /api/categorias +
// /api/produtos — mas resolvido no servidor, para a primeira tela sair do HTML
// em vez de nascer skeleton.
async function getInitial(): Promise<HomeInitial | null> {
  try {
    const now = new Date().toISOString()
    const [{ data: cats }, { data: ativos }] = await Promise.all([
      supabaseAdmin.from('categorias').select('id, nome, parent_id'),
      supabaseAdmin.from('products').select('categoria_id, brand')
        .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
        .range(0, 4999),
    ])
    if (!cats || !ativos) return null

    const counts: Record<string, number> = {}
    const marcas: Record<string, number> = {}
    for (const p of ativos) {
      if (p.categoria_id) counts[p.categoria_id] = (counts[p.categoria_id] ?? 0) + 1
      if (p.brand) marcas[p.brand] = (marcas[p.brand] ?? 0) + 1
    }

    const categorias = cats.map(c => ({ ...c, produtos: counts[c.id] ?? 0 }))
    // Uma fileira por categoria-FOLHA (produto ligado direto a ela), não por
    // departamento agregando os filhos — é o padrão "Smartphones", "Informática"
    // como carrosséis separados, não um "Eletrônicos" só que junta tudo.
    const leafRows = categorias.filter(c => c.produtos > 0)

    const secoes = await Promise.all(leafRows.map(async c => {
      const { data } = await supabaseAdmin.from('products').select(CAMPOS)
        .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
        .eq('categoria_id', c.id)
        .order('sort_order', { ascending: true }).order('id', { ascending: true })
        .range(0, VITRINE_POR_SECAO - 1)
      return {
        id: c.id, nome: c.nome, total: c.produtos,
        // nomes em base64, o mesmo contrato da API pública — o client decodifica tudo igual
        items: (data || []).map(p => ({ ...p, name: enc(p.name), brand: enc(p.brand), rating: null, rating_total: 0 })),
      }
    }))
    secoes.sort((a, b) => b.total - a.total)

    return {
      categorias,
      total: ativos.length,
      brands: Object.entries(marcas).sort((a, b) => b[1] - a[1]).map(([nome, total]) => ({ nome: enc(nome)!, total })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      secoes: secoes as any,
    }
  } catch { return null }
}

export default async function HomePage() {
  const [initial, cats] = await Promise.all([getInitial(), listarCategoriasSeo()])
  const departamentos = cats.filter(c => !c.parentId)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLoja()) }} />
      <SiteHeader />
      {/* A home não tinha h1 nenhum e os nomes de produto saem em base64 — para o
          crawler o HTML era quase mudo. Este bloco é o único texto plano que diz
          do que a loja trata, e é visível para todo mundo: nada de texto oculto,
          que o Google trata como manipulação. */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 20px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 6px', color: '#0a0a0a', letterSpacing: '-0.02em' }}>
          Atacado na Fronteira — compras no atacado direto do Paraguai
        </h1>
        <p style={{ fontSize: 13.5, color: '#525252', margin: '0 0 4px', maxWidth: 760, lineHeight: 1.6 }}>
          Catálogo com preços de atacado em dólar, pagamento via PIX e retirada na loja.
          Peptídeos, tirzepatida, retatrutida, anabolizantes, eletrônicos, celulares e notebooks
          com estoque imediato.
        </p>
        {departamentos.length > 0 && (
          <p style={{ fontSize: 12.5, color: '#737373', margin: '0 0 4px' }}>
            Departamentos:{' '}
            {departamentos.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ' · '}
                <Link href={`/categoria/${c.slug}`} style={{ color: '#420E76', fontWeight: 600, textDecoration: 'none' }}>
                  {c.nome}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
      <Suspense>
        <HomeClient initial={initial ?? undefined} />
      </Suspense>
    </>
  )
}
