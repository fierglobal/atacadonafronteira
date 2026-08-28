import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

const STATUS_VALIDOS = new Set(['pendente_pagamento', 'pago', 'pronto_retirada', 'retirado', 'cancelado'])

export async function PATCH(req: Request) {
  const auth = await requireAdmin('pedidos', 'rw')
  if (auth) return auth

  const { ids, status } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0 || !STATUS_VALIDOS.has(status)) {
    return NextResponse.json({ error: 'ids e status obrigatórios' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('order_status_history').insert(ids.map((order_id: string) => ({ order_id, status })))
  await logAudit({ action: 'bulk_status', entity: 'pedido', diff: { ids, status } })

  return NextResponse.json({ ok: true })
}
