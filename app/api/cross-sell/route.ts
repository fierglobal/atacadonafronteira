import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SOB_ENCOMENDA_BADGE } from '@/lib/site'

const enc = (s: string | null) => s ? Buffer.from(s).toString('base64') : null

export async function POST(req: Request) {
  const { productIds } = await req.json() as { productIds: string[] }
  if (!Array.isArray(productIds) || !productIds.length) {
    return NextResponse.json({ products: [], temSobEncomenda: false })
  }

  const { data: carrinho } = await supabaseAdmin
    .from('products')
    .select('badges')
    .in('id', productIds)
  const temSobEncomenda = (carrinho || []).some(p =>
    (p.badges || []).some((b: string) => b.trim().toLowerCase() === SOB_ENCOMENDA_BADGE))

  const { data: relations } = await supabaseAdmin
    .from('product_relations')
    .select('related_product_id, ordem')
    .in('product_id', productIds)
    .eq('tipo', 'compre_junto')
    .order('ordem', { ascending: true })

  const relatedIds = Array.from(new Set((relations || []).map(r => r.related_product_id)))
    .filter(id => !productIds.includes(id))
    .slice(0, 8)

  if (!relatedIds.length) return NextResponse.json({ products: [], temSobEncomenda })

  const now = new Date().toISOString()
  const { data: prods } = await supabaseAdmin
    .from('products')
    .select('id, name, brand, usd_price, img_url, estoque, descricao_curta')
    .in('id', relatedIds)
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .limit(6)

  return NextResponse.json({
    products: (prods || []).map(p => ({
      ...p, name: enc(p.name), brand: enc(p.brand),
    })),
    temSobEncomenda,
  })
}
