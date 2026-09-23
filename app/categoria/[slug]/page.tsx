import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'
import CategoriaProductCard from '@/components/CategoriaProductCard'
import CategoriaProductCardGrupo from '@/components/CategoriaProductCardGrupo'
import { acharCategoriaPorSlug, type CategoriaSeo } from '@/lib/categorias'
import { nomeSemMarca, nomeSemSufixoStatus } from '@/lib/produto'
import { SITE_URL, SITE_NAME } from '@/lib/site'

const POR_PAGINA = 48

type Busca = { marca?: string; ordem?: string; pagina?: string; precoMin?: string; precoMax?: string }

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
    .select('id, name, brand, brl_price, brl_price_promo, usd_price, usd_price_promo, img_url, estoque, badges', { count: 'exact' })
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .in('categoria_id', ids)

  if (b.marca) q = q.eq('brand', b.marca)
  const precoMin = b.precoMin ? Number(b.precoMin) : null
  const precoMax = b.precoMax ? Number(b.precoMax) : null
  if (precoMin != null && !Number.isNaN(precoMin)) q = q.gte('brl_price', precoMin)
  if (precoMax != null && !Number.isNaN(precoMax)) q = q.lte('brl_price', precoMax)

  if (b.ordem === 'menor') q = q.order('brl_price', { ascending: true })
  else if (b.ordem === 'maior') q = q.order('brl_price', { ascending: false })
  else if (b.ordem === 'nome') q = q.order('name', { ascending: true })
  else q = q.order('sort_order', { ascending: true })

  const { data, count } = await q.order('id', { ascending: true }).range(de, de + POR_PAGINA - 1)
  return { itens: data || [], total: count ?? 0, pagina }
}

async function getMarcas(cat: CategoriaSeo) {
  const now = new Date().toISOString()
  const data = await fetchAllRows<{ brand: string | null }>((from, to) =>
    supabaseAdmin
      .from('products')
      .select('brand')
      .eq('ativo', true)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .in('categoria_id', [cat.id, ...cat.descendentes])
      .not('brand', 'is', null)
      .range(from, to)
  )
  const cont: Record<string, number> = {}
  for (const p of data) if (p.brand) cont[p.brand] = (cont[p.brand] || 0) + 1
  return Object.entries(cont).sort((a, b) => b[1] - a[1])
}

// Menor brl_price entre os tiers de quantidade de cada produto — vira o selo
// "a partir de RX/un no atacado" no card, o principal gatilho de decisão do
// comprador B2B (só a PDP mostrava a tabela completa até aqui).
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

type ProdutoItem = Awaited<ReturnType<typeof getProdutos>>['itens'][number]
type LinhaGrid =
  | { tipo: 'unico'; produto: ProdutoItem }
  | { tipo: 'grupo'; brand: string; base: string; img: string; membros: (ProdutoItem & { capacidade: string })[] }

const CAPACIDADE_RE = /^\d+\s?(GB|TB)$/i
const capacidadeEmGB = (token: string) => {
  const m = token.match(/^(\d+)\s?(GB|TB)$/i)
  if (!m) return 0
  return m[2].toUpperCase() === 'TB' ? Number(m[1]) * 1024 : Number(m[1])
}

// Variações de capacidade do mesmo modelo (iPhone 18 Pro 256GB/512GB/1TB/2TB...)
// compartilham a MESMA foto no banco — product_price_tiers existe, mas
// product_variants (a feature pensada pra isso) nunca foi populada (0 linhas).
// Em vez de esperar uma migração de dado, a foto idêntica + marca + "nome sem a
// capacidade" já são, juntos, uma chave segura: se qualquer parte não bater, o
// produto cai como card avulso — nunca agrupa errado. Só roda em Relevância/A–Z,
// porque nas ordenações por preço os "irmãos" ficam espalhados no ranking e um
// card com faixa de preço quebraria a intenção de quem pediu esse filtro.
function agruparPorFoto(itens: ProdutoItem[], podeAgrupar: boolean): LinhaGrid[] {
  if (!podeAgrupar) return itens.map(produto => ({ tipo: 'unico', produto }))

  type Grupo = { key: string; brand: string; base: string; img: string; membros: (ProdutoItem & { capacidade: string })[] }
  const grupos = new Map<string, Grupo>()
  const chavePorId = new Map<string, string>()

  for (const p of itens) {
    if (!p.img_url || !p.brand) continue
    const nomeLimpo = nomeSemSufixoStatus(nomeSemMarca(p.name, p.brand))
    const tokens = nomeLimpo.trim().split(/\s+/)
    const ultimo = tokens[tokens.length - 1] || ''
    if (!CAPACIDADE_RE.test(ultimo)) continue
    const base = tokens.slice(0, -1).join(' ')
    if (!base) continue
    const key = `${p.img_url}::${p.brand}::${base}`
    if (!grupos.has(key)) grupos.set(key, { key, brand: p.brand, base, img: p.img_url, membros: [] })
    grupos.get(key)!.membros.push({ ...p, capacidade: ultimo.toUpperCase().replace(/\s+/, '') })
    chavePorId.set(p.id, key)
  }

  const emGrupoValido = new Set<string>()
  for (const g of grupos.values()) {
    if (g.membros.length < 2) continue
    g.membros.sort((a, b) => capacidadeEmGB(a.capacidade) - capacidadeEmGB(b.capacidade))
    for (const m of g.membros) emGrupoValido.add(m.id)
  }

  const grupoJaEmitido = new Set<string>()
  const linhas: LinhaGrid[] = []
  for (const p of itens) {
    if (emGrupoValido.has(p.id)) {
      const key = chavePorId.get(p.id)!
      if (grupoJaEmitido.has(key)) continue
      grupoJaEmitido.add(key)
      const g = grupos.get(key)!
      linhas.push({ tipo: 'grupo', brand: g.brand, base: g.base, img: g.img, membros: g.membros })
    } else {
      linhas.push({ tipo: 'unico', produto: p })
    }
  }
  return linhas
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cat = await acharCategoriaPorSlug(slug)
  if (!cat) return { title: 'Categoria não encontrada | ' + SITE_NAME }

  const title = `${cat.nome} no Atacado — Direto do Paraguai | ${SITE_NAME}`
  const description =
    `${cat.total} produtos de ${cat.nome.toLowerCase()} em atacado, direto do Paraguai. ` +
    `Preços em R$, pagamento via PIX e retirada na loja. Estoque imediato no Atacado na Fronteira.`

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
  const menorTierPorProduto = await getMenorTierPorProduto(itens.map(p => p.id))
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  const url = (extra: Partial<Busca>) => {
    const p = new URLSearchParams()
    const m = extra.marca !== undefined ? extra.marca : b.marca
    const o = extra.ordem !== undefined ? extra.ordem : b.ordem
    const pMin = extra.precoMin !== undefined ? extra.precoMin : b.precoMin
    const pMax = extra.precoMax !== undefined ? extra.precoMax : b.precoMax
    const pg = extra.pagina
    if (m) p.set('marca', m)
    if (o) p.set('ordem', o)
    if (pMin) p.set('precoMin', pMin)
    if (pMax) p.set('precoMax', pMax)
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

  const pill = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
    fontSize: 12, fontWeight: 700, color: '#420E76', background: 'rgba(66, 14, 118,0.06)',
    border: '1px solid rgba(66, 14, 118,0.25)', textDecoration: 'none',
  }
  const temFiltrosAtivos = !!(b.marca || b.precoMin || b.precoMax)

  // Agrupamento por foto só faz sentido quando a ordem preserva os "irmãos"
  // próximos (Relevância/A–Z) — nas ordenações por preço eles se espalham pelo
  // ranking e o card teria que mostrar uma faixa em vez de um preço, que é
  // justamente o que o cliente NÃO pediu ao escolher ordenar por preço.
  const podeAgrupar = !b.ordem || b.ordem === 'nome'
  const linhas = agruparPorFoto(itens, podeAgrupar)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '20px 20px 60px', boxSizing: 'border-box' }}>
        <nav aria-label="Trilha de navegação" style={{ fontSize: 12, color: '#737373', marginBottom: 14 }}>
          <Link href="/" style={{ color: '#737373', textDecoration: 'none' }}>Início</Link>
          {cat.paiNome && cat.paiSlug && (
            <>{' / '}<Link href={`/categoria/${cat.paiSlug}`} style={{ color: '#737373', textDecoration: 'none' }}>{cat.paiNome}</Link></>
          )}
          {' / '}<span style={{ color: '#420E76', fontWeight: 700 }} aria-current="page">{cat.nome}</span>
        </nav>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: temFiltrosAtivos ? 12 : 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#0a0a0a', letterSpacing: '-0.02em' }}>
            {cat.nome} no atacado
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12.5, color: '#737373' }}>
              {total === 0 ? 'Nenhum produto' : `${total} produto${total > 1 ? 's' : ''}`}
            </span>
            <details className="cat-order">
              <summary className="cat-order-summary">
                Ordenar: {ORDENS.find(o => o.chave === (b.ordem || ''))?.rotulo}
                <svg className="cat-order-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <div className="cat-order-menu">
                {ORDENS.map(o => (
                  <Link key={o.chave} href={url({ ordem: o.chave, pagina: '1' })}
                    style={{ fontWeight: (b.ordem || '') === o.chave ? 800 : 600, color: (b.ordem || '') === o.chave ? '#420E76' : '#404040' }}>
                    {o.rotulo}
                  </Link>
                ))}
              </div>
            </details>
          </div>
        </div>

        {temFiltrosAtivos && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {b.marca && <Link href={url({ marca: '', pagina: '1' })} style={pill}>Marca: {b.marca} <span aria-hidden="true">×</span></Link>}
            {(b.precoMin || b.precoMax) && (
              <Link href={url({ precoMin: '', precoMax: '', pagina: '1' })} style={pill}>R$ {b.precoMin || '0'}–{b.precoMax || '∞'} <span aria-hidden="true">×</span></Link>
            )}
          </div>
        )}

        {/* Sidebar + grid: no celular vira 1 coluna, os filtros ficam empilhados
            em cima do grid (globals.css). Filtros como LINK, não estado de
            navegador — devolve a navegação ao cliente sem tirar a página do
            índice do Google. <details>/<summary> dá o toggle sem JS (nasce
            "open" — sem JS o comportamento é idêntico a antes, só com uma
            alça pra fechar). O script logo abaixo é só uma melhoria
            progressiva: fecha por padrão no celular pra não empurrar o grid
            pra baixo da dobra — <details> não tem como nascer aberto só no
            desktop via CSS puro (o conteúdo fechado usa render nativo do
            browser, um "display:flex!important" no CSS não sobrepõe). */}
        <div className="cat-layout">
          <aside className="cat-sidebar" aria-label="Filtros">
            {marcas.length > 1 && (
              <details className="cat-filter-group" open>
                <summary className="cat-filter-title">
                  <span>MARCA{b.marca ? `: ${b.marca}` : ''}</span>
                  <svg className="cat-filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <div className="cat-filter-list">
                  <Link href={url({ marca: '', pagina: '1' })} style={sidebarLink(!b.marca)}>Todas as marcas</Link>
                  {marcas.map(([nome, qtd]) => (
                    <Link key={nome} href={url({ marca: nome, pagina: '1' })} style={sidebarLink(b.marca === nome)}>
                      <span>{nome}</span>
                      <span style={{ opacity: 0.6, fontWeight: 600, fontSize: 11.5 }}>{qtd}</span>
                    </Link>
                  ))}
                </div>
              </details>
            )}
            <details className="cat-filter-group" open>
              <summary className="cat-filter-title">
                <span>PREÇO{b.precoMin || b.precoMax ? `: R$${b.precoMin || '0'}–${b.precoMax || '∞'}` : ''}</span>
                <svg className="cat-filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <form method="get" action={`/categoria/${cat.slug}`} className="cat-filter-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 10px 8px' }}>
                {b.marca && <input type="hidden" name="marca" value={b.marca} />}
                {b.ordem && <input type="hidden" name="ordem" value={b.ordem} />}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" name="precoMin" defaultValue={b.precoMin || ''} placeholder="Mín" min={0}
                    style={{ width: 0, flex: 1, padding: '7px 8px', borderRadius: 6, border: '1px solid #ececec', fontSize: 12.5 }} />
                  <span style={{ color: '#a3a3a3', fontSize: 12 }}>–</span>
                  <input type="number" name="precoMax" defaultValue={b.precoMax || ''} placeholder="Máx" min={0}
                    style={{ width: 0, flex: 1, padding: '7px 8px', borderRadius: 6, border: '1px solid #ececec', fontSize: 12.5 }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="submit" style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', background: '#420E76', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Aplicar</button>
                  {(b.precoMin || b.precoMax) && (
                    <Link href={url({ precoMin: '', precoMax: '', pagina: '1' })} style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12.5, color: '#737373', textDecoration: 'none' }}>Limpar</Link>
                  )}
                </div>
              </form>
            </details>
          </aside>
          <script dangerouslySetInnerHTML={{ __html:
            `if(window.innerWidth<=900)document.querySelectorAll('.cat-filter-group').forEach(function(d){d.removeAttribute('open')})`
          }} />

          <div className="cat-main">
            {itens.length === 0 ? (
              <p style={{ padding: '40px 0', color: '#737373' }}>
                Nada encontrado com esse filtro. <Link href={url({ marca: '', ordem: '', precoMin: '', precoMax: '', pagina: '1' })} style={{ color: '#420E76', fontWeight: 700 }}>Ver tudo em {cat.nome}</Link>.
              </p>
            ) : (
              <div className="categoria-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(184px, 1fr))', gap: 16 }}>
                {linhas.map(l => l.tipo === 'grupo'
                  ? <CategoriaProductCardGrupo key={l.membros.map(m => m.id).join('-')} brand={l.brand} base={l.base} img={l.img} membros={l.membros} />
                  : <CategoriaProductCard key={l.produto.id} p={l.produto} menorPrecoAtacado={menorTierPorProduto[l.produto.id] ?? null} />
                )}
              </div>
            )}

            {itens.length > 0 && (
              <p style={{ fontSize: 12, color: '#a3a3a3', margin: '20px 0 0' }}>
                Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}
              </p>
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
          direto do Paraguai. Preços de atacado em R$, pagamento via PIX e retirada na loja.
        </p>
      </main>
    </>
  )
}
