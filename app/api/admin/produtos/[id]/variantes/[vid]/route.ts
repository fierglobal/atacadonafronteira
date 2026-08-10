import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { vid } = await params
  const body = await req.json()
  const { error } = await supabaseAdmin.from('product_variants').update(body).eq('id', vid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'update', entity: 'produto', entity_id: vid, diff: body })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { vid } = await params
  const { error } = await supabaseAdmin.from('product_variants').delete().eq('id', vid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'delete', entity: 'produto', entity_id: vid, diff: null })
  return NextResponse.json({ ok: true })
}
