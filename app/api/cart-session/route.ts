import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { getConfig } from '@/lib/config'
import { brlFromUsd } from '@/lib/produto'

export async function POST(req: Request) {
  const rl = rateLimit(`cart:${getIp(req)}`, 20, 60_000)
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 })
  const body = await req.json()
  const { nome, telefone, email, itens, total_usd } = body as {
    nome?: string; telefone?: string; email?: string
    itens?: { id?: string; usd: number; qty: number }[]; total_usd?: number
  }
  if (!telefone || !itens?.length) return NextResponse.json({ ok: false })

  // USD (usd_price/usd_price_promo) é a fonte do preço; R$ é sempre calculado
  // na hora pelo câmbio vivo, nunca lido de coluna brl_price gravada.
  const config = await getConfig()
  const productIds = itens.map(i => i.id).filter(Boolean) as string[]
  const { data: prods } = productIds.length
    ? await supabaseAdmin.from('products').select('id, usd_price, usd_price_promo').in('id', productIds)
    : { data: [] as { id: string; usd_price: number; usd_price_promo: number | null }[] }
  const usdById = new Map((prods || []).map(p => [p.id, (p.usd_price_promo != null && Number(p.usd_price_promo) < Number(p.usd_price)) ? Number(p.usd_price_promo) : Number(p.usd_price)]))
  const totalBrl = +itens.reduce((s, i) => {
    const usdPrice = i.id ? usdById.get(i.id) : undefined
    const unitBrl = brlFromUsd(usdPrice != null ? usdPrice : (i.usd || 0), config.brl_rate)
    return s + unitBrl * (i.qty || 0)
  }, 0).toFixed(2)

  const { data, error } = await supabaseAdmin
    .from('cart_sessions')
    .insert({ nome, telefone, email, itens, total_usd, total_brl: totalBrl })
    .select('id')
    .single()
  if (error) return NextResponse.json({ ok: false })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ ok: false })
  await supabaseAdmin.from('cart_sessions').update({ convertido: true }).eq('id', id)
  return NextResponse.json({ ok: true })
}
