import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'

export async function GET() {
  const c = await getConfig()
  return NextResponse.json({
    pedido_minimo_brl: c.pedido_minimo_brl,
    estimated_ready_time: c.estimated_ready_time,
    pix_expiry_minutes: c.pix_expiry_minutes,
    brl_rate: c.brl_rate,
  })
}
