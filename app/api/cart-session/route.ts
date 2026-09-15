import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { getConfig } from '@/lib/config'

export async function POST(req: Request) {
  const rl = rateLimit(`cart:${getIp(req)}`, 20, 60_000)
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 })
  const body = await req.json()
  const { nome, telefone, email, itens, total_usd } = body as {
    nome?: string; telefone?: string; email?: string
    itens?: { id?: string; usd: number; qty: number }[]; total_usd?: number
  }
  if (!telefone || !itens?.length) return NextResponse.json({ ok: false })

  // BRL é a fonte principal do preço (products.brl_price); USD é calculado a partir
  // do BRL só como referência de câmbio, nunca o contrário.
  const config = await getConfig()
  const productIds = itens.map(i => i.id).filter(Boolean) as string[]
  const { data: prods } = productIds.length
    ? await supabaseAdmin.from('products').select('id, brl_price').in('id', productIds)
    : { data: [] as { id: string; brl_price: number | null }[] }
  const brlById = new Map((prods || []).map(p => [p.id, p.brl_price != null ? Number(p.brl_price) : null]))
  const totalBrl = +itens.reduce((s, i) => {
    const brlPrice = i.id ? brlById.get(i.id) : undefined
    const unitBrl = brlPrice != null ? brlPrice : +((i.usd || 0) * config.brl_rate).toFixed(2)
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
