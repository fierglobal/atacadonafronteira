import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('marketing', 'rw')
  if (auth) return auth
  const { id } = await params
  const body = await req.json()
  const { error } = await supabaseAdmin.from('cart_sessions').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'update', entity: 'carrinho', entity_id: id, diff: body })
  return NextResponse.json({ ok: true })
}
