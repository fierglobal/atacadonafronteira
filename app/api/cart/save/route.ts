import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getConfig } from '@/lib/config'

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

  // BRL é a fonte principal do preço (products.brl_price); USD é calculado a partir
  // do BRL só como referência de câmbio, nunca o contrário.
  const config = await getConfig()
  const productIds = itens.map(i => i.id).filter(Boolean) as string[]
  const { data: prods } = productIds.length
    ? await supabaseAdmin.from('products').select('id, brl_price').in('id', productIds)
    : { data: [] as { id: string; brl_price: number | null }[] }
  const brlById = new Map((prods || []).map(p => [p.id, p.brl_price != null ? Number(p.brl_price) : null]))
  const total_brl = +itens.reduce((s, i) => {
    const brlPrice = i.id ? brlById.get(i.id) : undefined
    const unitBrl = brlPrice != null ? brlPrice : +((i.usd || 0) * config.brl_rate).toFixed(2)
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
