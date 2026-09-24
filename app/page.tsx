import { Suspense } from 'react'
import { isEmBreve } from '@/lib/produto'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import HomeClient, { type HomeInitial } from './HomeClient'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
import { slugify } from '@/lib/slug'
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
    'Paraguai com tirzepatida, celulares, eletrônicos Apple e perfumaria árabe, importada e de ' +
    'nicho. Preços em real, pagamento via PIX e retirada na loja.',
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
      'Loja de atacado com produtos importados direto do Paraguai: tirzepatida, celulares, ' +
      'eletrônicos Apple e perfumaria árabe, importada e de nicho.',
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

const CAMPOS = 'id, name, brand, brl_price, brl_price_promo, usd_price, usd_price_promo, img_url, estoque, categoria_id, descricao_curta, badges, venda_minima, multiplicador, limite_por_cpf'
const CAMPOS_DESTAQUE = 'id, name, brand, brl_price, brl_price_promo, usd_price, usd_price_promo, img_url, estoque, badges'

type Categoria = { id: string; nome: string; parent_id: string | null }
type ProdutoDestaque = { id: string; name: string; brand: string | null; brl_price: number; brl_price_promo: number | null; usd_price: number; usd_price_promo: number | null; img_url: string | null; estoque: number; badges: string[] | null }

// 4 produtos reais por departamento raiz — com promoção ativa primeiro (sinal
// de destaque genuíno, o mesmo critério do heroPromo), o resto por sort_order
// (a curadoria manual que já existe hoje via "Relevância" na categoria). Sem
// isso a home não tinha NENHUM preço visível fora do hero.
async function getDestaquesPorDepartamento(raizes: Categoria[], cats: Categoria[]): Promise<Record<string, ProdutoDestaque[]>> {
  const now = new Date().toISOString()
  const pares = await Promise.all(raizes.map(async r => {
    const ids = [r.id, ...cats.filter(c => c.parent_id === r.id).map(c => c.id)]
    const { data } = await supabaseAdmin.from('products').select(CAMPOS_DESTAQUE)
      .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
      .in('categoria_id', ids).gt('estoque', 0).not('img_url', 'is', null)
      .order('brl_price_promo', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true }).order('id', { ascending: true })
      .limit(4)
    return [r.id, (data || []) as ProdutoDestaque[]] as const
  }))
  return Object.fromEntries(pares)
}

// Menor brl_price entre os tiers de quantidade — mesmo campo que já alimenta
// o selo "a partir de RX/un no atacado" na página de categoria.
async function getMenorTierPorProduto(produtoIds: string[]): Promise<Record<string, number>> {
  if (!produtoIds.length) return {}
  const { data } = await supabaseAdmin.from('product_price_tiers')
    .select('product_id, brl_price').in('product_id', produtoIds).order('brl_price', { ascending: true })
  const menor: Record<string, number> = {}
  for (const t of data || []) if (menor[t.product_id] === undefined) menor[t.product_id] = Number(t.brl_price)
  return menor
}

// Mesmo shape que o client montaria via /api/facetas + /api/categorias —
// mas resolvido no servidor, para a primeira tela sair do HTML em vez de
// nascer skeleton. A vitrine de produtos em si mora em /produtos.
async function getInitial(): Promise<HomeInitial | null> {
  try {
    const now = new Date().toISOString()
    const [{ data: cats }, ativos] = await Promise.all([
      supabaseAdmin.from('categorias').select('id, nome, parent_id'),
      fetchAllRows<{ categoria_id: string | null; brand: string | null }>((from, to) =>
        supabaseAdmin.from('products').select('categoria_id, brand')
          .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
          .range(from, to)
      ),
    ])
    if (!cats) return null

    const counts: Record<string, number> = {}
    const marcas: Record<string, number> = {}
    for (const p of ativos) {
      if (p.categoria_id) counts[p.categoria_id] = (counts[p.categoria_id] ?? 0) + 1
      if (p.brand) marcas[p.brand] = (marcas[p.brand] ?? 0) + 1
    }

    // Números por departamento e as marcas de cada um: alimentam o hero e os
    // cards que substituíram a seção "Marcas disponíveis". Contados aqui, do
    // banco, para nenhum número da copy ser escrito à mão e envelhecer.
    const raizes = cats.filter(c => !c.parent_id)
    const totalDe = (raizId: string) =>
      (counts[raizId] ?? 0) + cats.filter(c => c.parent_id === raizId).reduce((t, f) => t + (counts[f.id] ?? 0), 0)
    const marcasDe: Record<string, Record<string, number>> = {}
    for (const p of ativos) {
      if (!p.brand || !p.categoria_id) continue
      const cat = cats.find(c => c.id === p.categoria_id)
      const raiz = cat?.parent_id ?? cat?.id
      if (!raiz) continue
      marcasDe[raiz] = marcasDe[raiz] || {}
      marcasDe[raiz][p.brand] = (marcasDe[raiz][p.brand] ?? 0) + 1
    }
    const DESC_DEPT: Record<string, string> = {
      'Eletrônicos': 'Linha Apple: iPhone, Mac, iPad, Apple Watch e AirPods, direto do Paraguai.',
      'Farmácia': 'Tirzepatida (GLP-1) das principais marcas, direto do Paraguai.',
      'Perfumes': 'Perfumaria árabe, importados e de nicho, direto do Paraguai.',
    }
    // Destaques (Catálogo fundido): 4 produtos reais por departamento —
    // reaproveitados também como miniaturas da linha do departamento, então
    // é UMA busca só, não uma pra cada seção.
    const destaquesPorDept = await getDestaquesPorDepartamento(raizes as Categoria[], cats as Categoria[])
    const idsDestaque = Object.values(destaquesPorDept).flat().map(p => p.id)
    const menorTierDestaque = await getMenorTierPorProduto(idsDestaque)

    const departamentos = raizes
      .map(r => ({
        nome: r.nome as string,
        slug: slugify(r.nome as string),
        total: totalDe(r.id as string),
        descricao: DESC_DEPT[r.nome as string] || '',
        marcas: Object.entries(marcasDe[r.id as string] || {})
          .sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([nome, qtd]) => ({ nome, qtd })),
        miniaturas: (destaquesPorDept[r.id as string] || []).map(p => ({ id: p.id, img: p.img_url })),
      }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)

    // Achatado na MESMA ordem dos departamentos (maior estoque real primeiro)
    // — Perfumes lidera porque é o maior de longe, não porque foi escrito à mão.
    const destaques = raizes
      .filter(r => departamentos.some(d => d.nome === r.nome))
      .sort((a, b) => (departamentos.findIndex(d => d.nome === a.nome)) - (departamentos.findIndex(d => d.nome === b.nome)))
      .flatMap(r => (destaquesPorDept[r.id as string] || []).map(p => ({ ...p, menorPrecoAtacado: menorTierDestaque[p.id] ?? null })))

    // Hero rotativo: o slide de Eletrônicos mostra o Apple/Xiaomi mais caro em
    // Celular (foto de aparelho na mão cabe melhor no card quadrado do que um
    // notebook) — vitrine, não "a partir de", não é o menor preço do departamento.
    // Cai para o departamento inteiro só se Celular não tiver candidato.
    // O slide de Farmácia mostra o MAIOR desconto real ativo hoje — se não houver
    // nenhuma promoção rodando, o slide some sozinho em vez de inventar uma.
    const eletronicosRaiz = raizes.find(r => r.nome === 'Eletrônicos')
    const eletronicosIds = eletronicosRaiz
      ? [eletronicosRaiz.id as string, ...cats.filter(c => c.parent_id === eletronicosRaiz.id).map(c => c.id as string)]
      : []
    const celularCat = eletronicosRaiz ? cats.find(c => c.nome === 'Celular' && c.parent_id === eletronicosRaiz.id) : null
    const [{ data: destaqueCelular }, { data: destaqueEletronicosGeral }, { data: promos }] = await Promise.all([
      celularCat
        ? supabaseAdmin.from('products').select(CAMPOS)
            .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
            .eq('categoria_id', celularCat.id as string).in('brand', ['APPLE', 'XIAOMI'])
            .gt('estoque', 0).not('img_url', 'is', null)
            .order('brl_price', { ascending: false }).limit(1)
        : Promise.resolve({ data: [] as { name: string; brand: string | null; usd_price: number; usd_price_promo: number | null; brl_price: number | null; brl_price_promo: number | null; img_url: string | null }[] }),
      eletronicosIds.length
        ? supabaseAdmin.from('products').select(CAMPOS)
            .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
            .in('categoria_id', eletronicosIds).in('brand', ['APPLE', 'XIAOMI'])
            .gt('estoque', 0).not('img_url', 'is', null)
            .order('brl_price', { ascending: false }).limit(1)
        : Promise.resolve({ data: [] as { name: string; brand: string | null; usd_price: number; usd_price_promo: number | null; brl_price: number | null; brl_price_promo: number | null; img_url: string | null }[] }),
      supabaseAdmin.from('products').select(CAMPOS)
        .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
        .not('brl_price_promo', 'is', null).gt('estoque', 0).not('img_url', 'is', null),
    ])
    // Produto de pré-venda não pode liderar o hero: o hero anuncia preço, e ele não tem preço
    // a anunciar. Filtrar aqui evita ter que tratar o caso dentro do HeroRotativo, que nem
    // recebe `badges`.
    // Pré-venda não pode liderar o hero: o hero anuncia preço e ela não tem preço a anunciar.
    // Filtrado aqui porque o HeroRotativo nem recebe `badges`.
    // Os dois arrays de destaque têm formatos diferentes (um nem seleciona `badges`), então o
    // predicado aceita qualquer objeto e lê o campo de forma defensiva.
    const naoEhPreVenda = (x: unknown) =>
      !isEmBreve({ usd_price: 0, badges: (x as { badges?: string[] | null })?.badges })
    const heroEletronico = (destaqueCelular ?? []).filter(naoEhPreVenda)[0]
      ?? (destaqueEletronicosGeral ?? []).filter(naoEhPreVenda)[0]
    const heroPromo = (promos ?? []).filter(naoEhPreVenda)
      // brand GENÉRICO é insumo (água bacteriostática etc.), não o produto que
      // vende a categoria — mesmo com desconto real, não é o que deve liderar
      // o hero. Todo produto de verdade tem marca de fabricante.
      .filter(p => p.brl_price_promo != null && Number(p.brl_price_promo) < Number(p.brl_price) && p.brand !== 'GENÉRICO')
      .sort((a, b) =>
        (1 - Number(b.brl_price_promo) / Number(b.brl_price)) - (1 - Number(a.brl_price_promo) / Number(a.brl_price)))[0]

    return {
      total: ativos.length,
      deptEletronicos: departamentos.find(d => d.nome === 'Eletrônicos')?.total ?? 0,
      deptFarmacia: departamentos.find(d => d.nome === 'Farmácia')?.total ?? 0,
      departamentos,
      destaques,
      heroEletronico: heroEletronico
        ? { ...heroEletronico, name: enc(heroEletronico.name), brand: enc(heroEletronico.brand) }
        : null,
      heroPromo: heroPromo
        ? { ...heroPromo, name: enc(heroPromo.name), brand: enc(heroPromo.brand) }
        : null,
      brands: Object.entries(marcas).sort((a, b) => b[1] - a[1]).map(([nome, total]) => ({ nome: enc(nome)!, total })),
    }
  } catch (e) {
    // Este catch já escondeu um erro meu: uma variável usada antes de ser
    // declarada derrubava getInitial() e a home caía no fetch do client sem
    // avisar ninguém. Silencioso para o visitante, visível no log.
    console.error('[home] getInitial falhou, caindo para render client-side:', e)
    return null
  }
}

export default async function HomePage() {
  const initial = await getInitial()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLoja()) }} />
      <SiteHeader />
      <Suspense>
        <HomeClient initial={initial ?? undefined} />
      </Suspense>
    </>
  )
}
