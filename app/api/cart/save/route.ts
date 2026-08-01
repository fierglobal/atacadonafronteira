import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
  const itens = Array.isArray(body.itens) ? body.itens : []
  const total_usd = Number(body.total_usd) || 0

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
      .update({ itens, total_usd, email: user.email || null })
      .eq('id', existing.id)
    return NextResponse.json({ ok: true, id: existing.id })
  }

  const { data, error } = await supabaseAdmin
    .from('cart_sessions')
    .insert({ user_id: user.id, email: user.email || null, telefone: 'logged-user', itens, total_usd })
    .select('id')
    .single()
  if (error) return NextResponse.json({ ok: false }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
