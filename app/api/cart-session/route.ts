import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rl = rateLimit(`cart:${getIp(req)}`, 20, 60_000)
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 })
  const body = await req.json()
  const { nome, telefone, email, itens, total_usd } = body
  if (!telefone || !itens?.length) return NextResponse.json({ ok: false })
  const { data, error } = await supabaseAdmin
    .from('cart_sessions')
    .insert({ nome, telefone, email, itens, total_usd })
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
