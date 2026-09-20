import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'
import CategoriaProductCard from '@/components/CategoriaProductCard'
import { listarCategoriasSeo } from '@/lib/categorias'
import { SITE_URL, SITE_NAME } from '@/lib/site'

const POR_PAGINA = 48

type Busca = { q?: string; categoria?: string; marca?: string; ordem?: string; pagina?: string; precoMin?: string; precoMax?: string }

const ORDENS = [
  { chave: '', rotulo: 'Relevância' },
  { chave: 'menor', rotulo: 'Menor preço' },
  { chave: 'maior', rotulo: 'Maior preço' },
  { chave: 'nome', rotulo: 'A–Z' },
] as const

export const metadata: Metadata = {
  title: `Catálogo completo — ${SITE_NAME}`,
  description: 'Catálogo completo de produtos em atacado, direto do Paraguai: Apple, perfumes e farmácia. Preços em R$, pagamento via PIX e retirada na loja.',
  alternates: { canonical: '/produtos' },
}

async function getProdutos(b: Busca) {
  const now = new Date().toISOString()
  const pagina = Math.max(1, parseInt(b.pagina || '1', 10) || 1)
  const de = (pagina - 1) * POR_PAGINA

  let q = supabaseAdmin
    .from('products')
    .select('id, name, brand, brl_price, brl_price_promo, usd_price, usd_price_promo, img_url, estoque, badges, categoria_id', { count: 'exact' })
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)

  if (b.categoria) q = q.eq('categoria_id', b.categoria)
  if (b.marca) q = q.eq('brand', b.marca)
  if (b.q) q = q.ilike('name', `%${b.q}%`)
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

async function getMarcas(b: Busca) {
  const now = new Date().toISOString()
  let q = supabaseAdmin.from('products').select('brand').eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`).not('brand', 'is', null)
  if (b.categoria) q = q.eq('categoria_id', b.categoria)
  const data = await fetchAllRows<{ brand: string | null }>((from, to) => q.range(from, to))
  const cont: Record<string, number> = {}
  for (const p of data) if (p.brand) cont[p.brand] = (cont[p.brand] || 0) + 1
  return Object.entries(cont).sort((a, b) => b[1] - a[1])
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

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const b = await searchParams
  const [categorias, { itens, total, pagina }, marcas] = await Promise.all([
    listarCategoriasSeo(),
    getProdutos(b),
    getMarcas(b),
  ])
  const menorTierPorProduto = await getMenorTierPorProduto(itens.map(p => p.id))
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  // Categorias-folha (produto ligado direto), ordenadas por volume — mesmo
  // recorte da home, é o que faz sentido pro comprador escolher por nicho.
  const categoriasFolha = categorias.filter(c => c.parentId).sort((a, b) => b.total - a.total)

  const url = (extra: Partial<Busca>) => {
    const p = new URLSearchParams()
    const campos: (keyof Busca)[] = ['q', 'categoria', 'marca', 'ordem', 'precoMin', 'precoMax']
    for (const campo of campos) {
      const v = extra[campo] !== undefined ? extra[campo] : b[campo]
      if (v) p.set(campo, v)
    }
    const pg = extra.pagina
    if (pg && pg !== '1') p.set('pagina', pg)
    const qs = p.toString()
    return `/produtos${qs ? '?' + qs : ''}`
  }

  const chip = (ativo: boolean) => ({
    display: 'inline-block', padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 700,
    textDecoration: 'none', border: `1px solid ${ativo ? '#420E76' : '#ececec'}`,
    background: ativo ? '#420E76' : '#fff', color: ativo ? '#fff' : '#404040',
  })

  const sidebarLink = (ativo: boolean) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 8, fontSize: 13, textDecoration: 'none',
    fontWeight: ativo ? 800 as const : 600 as const,
    background: ativo ? 'rgba(66, 14, 118,0.08)' : 'transparent',
    color: ativo ? '#420E76' : '#404040',
  })

  const categoriaAtiva = b.categoria ? categorias.find(c => c.id === b.categoria) : null

  return (
    <>
      <SiteHeader />
      <main style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '20px 20px 60px', boxSizing: 'border-box' }}>
        <nav aria-label="Trilha de navegação" style={{ fontSize: 12, color: '#737373', marginBottom: 14 }}>
          <Link href="/" style={{ color: '#737373', textDecoration: 'none' }}>Início</Link>
          {' / '}<span style={{ color: '#420E76', fontWeight: 700 }}>Catálogo</span>
        </nav>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#0a0a0a', letterSpacing: '-0.02em' }}>
            {categoriaAtiva ? categoriaAtiva.nome : 'Catálogo completo'}
          </h1>
          <span style={{ fontSize: 12.5, color: '#737373' }}>
            {total === 0 ? 'Nenhum produto' : `${total} produto${total > 1 ? 's' : ''}`}
            {b.marca ? ` · ${b.marca}` : ''}
            {(b.precoMin || b.precoMax) ? ` · R$${b.precoMin || '0'}–${b.precoMax || '∞'}` : ''}
          </span>
        </div>

        <div className="cat-layout">
          <aside className="cat-sidebar" aria-label="Filtros">
            <form method="get" action="/produtos" style={{ marginBottom: 26 }}>
              {b.categoria && <input type="hidden" name="categoria" value={b.categoria} />}
              <input type="search" name="q" defaultValue={b.q || ''} placeholder="Buscar no catálogo..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ececec', fontSize: 13, boxSizing: 'border-box' }} />
            </form>

            <details className="cat-filter-group" open>
              <summary className="cat-filter-title">
                <span>CATEGORIA{categoriaAtiva ? `: ${categoriaAtiva.nome}` : ''}</span>
                <svg className="cat-filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <div className="cat-filter-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <Link href={url({ categoria: '', pagina: '1' })} style={sidebarLink(!b.categoria)}>Todas as categorias</Link>
                {categoriasFolha.map(c => (
                  <Link key={c.id} href={url({ categoria: c.id, pagina: '1' })} style={sidebarLink(b.categoria === c.id)}>
                    <span>{c.nome}</span>
                    <span style={{ opacity: 0.6, fontWeight: 600, fontSize: 11.5 }}>{c.total}</span>
                  </Link>
                ))}
              </div>
            </details>

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
              <form method="get" action="/produtos" className="cat-filter-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 10px 8px' }}>
                {b.categoria && <input type="hidden" name="categoria" value={b.categoria} />}
                {b.marca && <input type="hidden" name="marca" value={b.marca} />}
                {b.q && <input type="hidden" name="q" value={b.q} />}
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

            <details className="cat-filter-group" open>
              <summary className="cat-filter-title">
                <span>ORDENAR: {ORDENS.find(o => o.chave === (b.ordem || ''))?.rotulo}</span>
                <svg className="cat-filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <div className="cat-filter-list">
                {ORDENS.map(o => (
                  <Link key={o.chave} href={url({ ordem: o.chave, pagina: '1' })} style={sidebarLink((b.ordem || '') === o.chave)}>{o.rotulo}</Link>
                ))}
              </div>
            </details>
          </aside>
          <script dangerouslySetInnerHTML={{ __html:
            `if(window.innerWidth<=900)document.querySelectorAll('.cat-filter-group').forEach(function(d){d.removeAttribute('open')})`
          }} />

          <div className="cat-main">
            {itens.length === 0 ? (
              <p style={{ padding: '40px 0', color: '#737373' }}>
                Nada encontrado com esse filtro. <Link href="/produtos" style={{ color: '#420E76', fontWeight: 700 }}>Ver catálogo completo</Link>.
              </p>
            ) : (
              <div className="categoria-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                {itens.map(p => <CategoriaProductCard key={p.id} p={p} menorPrecoAtacado={menorTierPorProduto[p.id] ?? null} />)}
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
      </main>
    </>
  )
}
