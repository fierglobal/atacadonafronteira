import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rl = rateLimit(`cupom:${getIp(req)}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'Muitas tentativas' }, { status: 429 })
  const { codigo } = await req.json()
  if (!codigo) return NextResponse.json({ ok: false, error: 'Código inválido' })

  const { data: cupom } = await supabaseAdmin
    .from('cupons')
    .select('id, desconto_pct, ativo, validade, usos_max, usos_count')
    .eq('codigo', codigo.toUpperCase().trim())
    .single()

  if (!cupom) return NextResponse.json({ ok: false, error: 'Cupom não encontrado' })
  if (!cupom.ativo) return NextResponse.json({ ok: false, error: 'Cupom inativo' })
  if (cupom.validade && new Date(cupom.validade) < new Date()) return NextResponse.json({ ok: false, error: 'Cupom expirado' })
  if (cupom.usos_max && cupom.usos_count >= cupom.usos_max) return NextResponse.json({ ok: false, error: 'Cupom esgotado' })

  return NextResponse.json({ ok: true, id: cupom.id, desconto_pct: cupom.desconto_pct })
}
