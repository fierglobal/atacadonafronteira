import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const enc = (s: string | null) => s ? Buffer.from(s).toString('base64') : null

function toTsQuery(q: string): string {
  return q.split(/\s+/).filter(Boolean).map(t => t.replace(/[^\w]/g, '') + ':*').join(' & ')
}

const LIMITE_PADRAO = 24
const LIMITE_MAX = 60

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sort = url.searchParams.get('sort') || ''
  const q = (url.searchParams.get('q') || '').trim()
  const cat = url.searchParams.get('cat') || ''
  const marca = url.searchParams.get('marca') || ''
  const minPrice = parseFloat(url.searchParams.get('min') || '0') || 0
  const maxPrice = parseFloat(url.searchParams.get('max') || '0') || 0
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(LIMITE_MAX, Math.max(1, parseInt(url.searchParams.get('limit') || '', 10) || LIMITE_PADRAO))

  const now = new Date().toISOString()

  // count: 'exact' devolve o total do recorte no header, que é o que permite
  // paginar sem trazer o catálogo inteiro só para saber quantos são.
  let qb = supabaseAdmin
    .from('products')
    .select('id, name, brand, usd_price, usd_price_promo, img_url, estoque, categoria_id, descricao_curta, badges, venda_minima, multiplicador', { count: 'exact' })
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)

  // Categoria inclui as filhas: clicar em Farmácia tem que trazer Peptídeos,
  // Tirzepatida e o resto, não só o que estiver preso na categoria pai.
  if (cat) {
    const { data: cats } = await supabaseAdmin.from('categorias').select('id, parent_id')
    const filhas = (cats || []).filter(c => c.parent_id === cat).map(c => c.id)
    qb = qb.in('categoria_id', [cat, ...filhas])
  }
  if (marca) qb = qb.eq('brand', marca)

  if (q) {
    // Busca de 1–2 letras não casa em full-text (o tsvector trabalha com
    // lexemas), então cai para ilike — antes isso era feito no client, o que
    // deixou de funcionar quando a lista passou a vir paginada.
    if (q.length < 3) {
      const termo = q.replace(/[%_,]/g, '')
      if (termo) qb = qb.or(`name.ilike.%${termo}%,brand.ilike.%${termo}%`)
    } else {
      const tsq = toTsQuery(q)
      if (tsq) qb = qb.textSearch('search_tsv', tsq, { config: 'portuguese' })
    }
  }
  if (minPrice > 0) qb = qb.gte('usd_price', minPrice)
  if (maxPrice > 0) qb = qb.lte('usd_price', maxPrice)

  switch (sort) {
    case 'price_asc':  qb = qb.order('usd_price', { ascending: true }); break
    case 'price_desc': qb = qb.order('usd_price', { ascending: false }); break
    case 'newest':     qb = qb.order('created_at', { ascending: false }); break
    case 'promo':      qb = qb.not('usd_price_promo', 'is', null).order('usd_price_promo', { ascending: true }); break
    case 'name':       qb = qb.order('name', { ascending: true }); break
    default:           qb = qb.order('sort_order', { ascending: true })
  }
  // desempate estável: sem isto, duas páginas podem repetir ou pular item
  // quando vários produtos compartilham o mesmo valor de ordenação.
  qb = qb.order('id', { ascending: true })

  const { data, count, error } = await qb.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ items: [], total: 0 }, { status: 500 })

  const list = data || []
  const ids = list.map(p => p.id)

  const ratingsMap: Record<string, { rating: number; total: number }> = {}
  if (ids.length) {
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('product_id, rating')
      .in('product_id', ids)
      .eq('aprovado', true)
    const acc: Record<string, { sum: number; total: number }> = {}
    for (const r of reviews || []) {
      const k = String(r.product_id)
      if (!acc[k]) acc[k] = { sum: 0, total: 0 }
      acc[k].sum += Number(r.rating) || 0
      acc[k].total += 1
    }
    for (const k of Object.keys(acc)) {
      ratingsMap[k] = { rating: +(acc[k].sum / acc[k].total).toFixed(1), total: acc[k].total }
    }
  }

  return NextResponse.json({
    items: list.map(p => ({
      ...p,
      name: enc(p.name),
      brand: enc(p.brand),
      rating: ratingsMap[p.id]?.rating ?? null,
      rating_total: ratingsMap[p.id]?.total ?? 0,
    })),
    total: count ?? list.length,
  })
}
