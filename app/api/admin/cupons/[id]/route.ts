import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('cupons', 'rw')
  if (auth) return auth
  const { id } = await params
  const body = await req.json()
  const { error } = await supabaseAdmin.from('cupons').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ action: 'update', entity: 'cupom', entity_id: id, diff: body })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('cupons', 'rw')
  if (auth) return auth
  const { id } = await params
  await supabaseAdmin.from('cupons').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'cupom', entity_id: id, diff: null })
  return NextResponse.json({ ok: true })
}
