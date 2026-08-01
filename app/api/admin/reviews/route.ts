import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const auth = await requireAdmin('avaliacoes', 'r')
  if (auth) return auth
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'pending'
  const query = supabaseAdmin
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (filter === 'pending') query.eq('aprovado', false)
  else if (filter === 'approved') query.eq('aprovado', true)
  const { data } = await query
  return NextResponse.json(data || [])
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('avaliacoes', 'rw')
  if (auth) return auth
  const { id, aprovado } = await req.json()
  await supabaseAdmin.from('reviews').update({ aprovado }).eq('id', id)
  await logAudit({ action: 'update', entity: 'review', entity_id: id, diff: { aprovado } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('avaliacoes', 'rw')
  if (auth) return auth
  const { id } = await req.json()
  await supabaseAdmin.from('reviews').delete().eq('id', id)
  await logAudit({ action: 'delete', entity: 'review', entity_id: id, diff: null })
  return NextResponse.json({ ok: true })
}
