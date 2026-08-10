import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { emailComprovanteRecebido } from '@/lib/email'
import { rateLimit, getIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rl = rateLimit(`notify-comprovante:${getIp(req)}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ ok: true })
  const { orderId, comprovanteUrl } = await req.json()
  if (!orderId) return NextResponse.json({ ok: false, error: 'orderId ausente' }, { status: 400 })

  // A gravação precisa acontecer aqui: `orders` só aceita UPDATE de service_role,
  // então o client anon não consegue salvar a URL do comprovante.
  if (comprovanteUrl) {
    const { error: upErr } = await supabaseAdmin
      .from('orders')
      .update({ comprovante_url: comprovanteUrl })
      .eq('id', orderId)
    if (upErr) {
      return NextResponse.json({ ok: false, error: 'Falha ao salvar comprovante' }, { status: 500 })
    }
  }

  const [{ data: order }, config] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('order_num, total_brl, comprovante_url, customers(nome, email)')
      .eq('id', orderId)
      .single(),
    getConfig(),
  ])

  if (!order || !order.comprovante_url) return NextResponse.json({ ok: false }, { status: 404 })
  if (!config.admin_email) return NextResponse.json({ ok: true, warning: 'admin_email não configurado' })

  const customer = (order as any).customers
  await emailComprovanteRecebido(
    config.admin_email,
    order.order_num,
    customer?.nome || 'Cliente',
    customer?.email || '',
    order.total_brl,
    order.comprovante_url,
  )

  return NextResponse.json({ ok: true })
}
