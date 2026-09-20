import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const enc = (s: string | null) => s ? Buffer.from(s).toString('base64') : null

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const nowIso = new Date().toISOString()

  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, brand, brl_price, brl_price_promo, usd_price, usd_price_promo, img_url, imagens, estoque, categoria_id, descricao, descricao_curta, badges, published_at, multiplicador, venda_minima, unidade_venda, custom_fields, sku')
    .eq('id', id)
    .eq('ativo', true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .single()

  if (!data) return NextResponse.json(null, { status: 404 })

  type RelRow = {
    tipo: string
    products: {
      id: string; name: string; titulo: string | null; img_url: string | null
      brl_price: number; usd_price: number; ativo: boolean; published_at: string | null
    } | null
  }
  type CustomFieldDef = { field_key: string; label: string; field_type: string; options: unknown; ordem: number }

  const [tiersRes, relRes, cfdRes] = await Promise.all([
    supabaseAdmin
      .from('product_price_tiers')
      .select('qty_min, qty_max, brl_price, usd_price')
      .eq('product_id', id)
      .order('qty_min'),
    supabaseAdmin
      .from('product_relations')
      .select('tipo, ordem, products!product_relations_related_product_id_fkey(id, name, titulo, img_url, brl_price, usd_price, ativo, published_at)')
      .eq('product_id', id)
      .order('ordem'),
    data.categoria_id
      ? supabaseAdmin
          .from('custom_field_defs')
          .select('field_key, label, field_type, options, ordem')
          .eq('entity', 'products')
          .or(`categoria_id.is.null,categoria_id.eq.${data.categoria_id}`)
          .order('ordem')
      : Promise.resolve({ data: [] as CustomFieldDef[] }),
  ])

  const tiers = tiersRes.data || []

  const grouped: Record<string, { id: string; name: string | null; img_url: string | null; brl_price: number; usd_price: number }[]> = { compre_junto: [], similar: [], acessorio: [], upsell: [] }
  for (const r of (relRes.data || []) as unknown as RelRow[]) {
    const p = r.products
    if (!p || !p.ativo) continue
    if (p.published_at && new Date(p.published_at).getTime() > Date.now()) continue
    const tipo = r.tipo as string
    if (!grouped[tipo]) grouped[tipo] = []
    grouped[tipo].push({
      id: p.id,
      name: enc(p.titulo || p.name),
      img_url: p.img_url,
      brl_price: p.brl_price,
      usd_price: p.usd_price,
    })
  }

  const custom_field_defs = cfdRes.data || []

  return NextResponse.json({
    ...data,
    name: enc(data.name),
    brand: enc(data.brand),
    tiers,
    relacionados: grouped,
    custom_field_defs,
  })
}
