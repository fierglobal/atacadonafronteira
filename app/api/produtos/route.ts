import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const enc = (s: string | null) => s ? Buffer.from(s).toString('base64') : null

function toTsQuery(q: string): string {
  return q.split(/\s+/).filter(Boolean).map(t => t.replace(/[^\w]/g, '') + ':*').join(' & ')
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sort = url.searchParams.get('sort') || ''
  const q = (url.searchParams.get('q') || '').trim()
  const minPrice = parseFloat(url.searchParams.get('min') || '0') || 0
  const maxPrice = parseFloat(url.searchParams.get('max') || '0') || 0

  const now = new Date().toISOString()
  let qb = supabaseAdmin
    .from('products')
    .select('id, name, brand, usd_price, usd_price_promo, img_url, estoque, categoria_id, descricao_curta, badges, venda_minima, multiplicador')
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)

  if (q) {
    const tsq = toTsQuery(q)
    if (tsq) qb = qb.textSearch('search_tsv', tsq, { config: 'portuguese' })
  }
  if (minPrice > 0) qb = qb.gte('usd_price', minPrice)
  if (maxPrice > 0) qb = qb.lte('usd_price', maxPrice)

  switch (sort) {
    case 'price_asc':
      qb = qb.order('usd_price', { ascending: true }); break
    case 'price_desc':
      qb = qb.order('usd_price', { ascending: false }); break
    case 'newest':
      qb = qb.order('created_at', { ascending: false }); break
    case 'promo':
      qb = qb.not('usd_price_promo', 'is', null).order('usd_price_promo', { ascending: true }); break
    case 'name':
      qb = qb.order('name', { ascending: true }); break
    default:
      qb = qb.order('sort_order', { ascending: true })
  }

  const { data, error } = await qb.limit(500)
  if (error) return NextResponse.json([], { status: 500 })

  const list = data || []
  const ids = list.map(p => p.id)

  const ratingsMap: Record<string, { rating: number; total: number }> = {}
  if (ids.length) {
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('product_id, rating')
      .in('product_id', ids)
      .eq('aprovado', true)
    if (reviews) {
      const acc: Record<string, { sum: number; total: number }> = {}
      for (const r of reviews) {
        const k = String(r.product_id)
        if (!acc[k]) acc[k] = { sum: 0, total: 0 }
        acc[k].sum += Number(r.rating) || 0
        acc[k].total += 1
      }
      for (const k of Object.keys(acc)) {
        ratingsMap[k] = { rating: +(acc[k].sum / acc[k].total).toFixed(1), total: acc[k].total }
      }
    }
  }

  return NextResponse.json(list.map(p => ({
    ...p,
    name: enc(p.name),
    brand: enc(p.brand),
    rating: ratingsMap[p.id]?.rating ?? null,
    rating_total: ratingsMap[p.id]?.total ?? 0,
  })))
}
