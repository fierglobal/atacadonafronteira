import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getConfig } from '@/lib/config'
import { brlFromUsd } from '@/lib/produto'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const itens = Array.isArray(body.itens) ? body.itens as { id?: string; usd: number; quantity: number }[] : []
  const total_usd = Number(body.total_usd) || 0

  // USD (usd_price/usd_price_promo) é a fonte do preço; R$ é sempre calculado
  // na hora pelo câmbio vivo, nunca lido de coluna brl_price gravada.
  const config = await getConfig()
  const productIds = itens.map(i => i.id).filter(Boolean) as string[]
  const { data: prods } = productIds.length
    ? await supabaseAdmin.from('products').select('id, usd_price, usd_price_promo').in('id', productIds)
    : { data: [] as { id: string; usd_price: number; usd_price_promo: number | null }[] }
  const usdById = new Map((prods || []).map(p => [p.id, (p.usd_price_promo != null && Number(p.usd_price_promo) < Number(p.usd_price)) ? Number(p.usd_price_promo) : Number(p.usd_price)]))
  const total_brl = +itens.reduce((s, i) => {
    const usdPrice = i.id ? usdById.get(i.id) : undefined
    const unitBrl = brlFromUsd(usdPrice != null ? usdPrice : (i.usd || 0), config.brl_rate)
    return s + unitBrl * (i.quantity || 0)
  }, 0).toFixed(2)

  const { data: existing } = await supabaseAdmin
    .from('cart_sessions')
    .select('id')
    .eq('user_id', user.id)
    .is('convertido', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    await supabaseAdmin
      .from('cart_sessions')
      .update({ itens, total_usd, total_brl, email: user.email || null })
      .eq('id', existing.id)
    return NextResponse.json({ ok: true, id: existing.id })
  }

  const { data, error } = await supabaseAdmin
    .from('cart_sessions')
    .insert({ user_id: user.id, email: user.email || null, telefone: 'logged-user', itens, total_usd, total_brl })
    .select('id')
    .single()
  if (error) return NextResponse.json({ ok: false }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
