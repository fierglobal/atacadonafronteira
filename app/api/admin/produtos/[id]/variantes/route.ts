import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('created_at')
  return NextResponse.json(data || [])
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth
  const { id } = await params
  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .insert({ ...body, product_id: id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'create', entity: 'produto', entity_id: data?.id || null, diff: { ...body, product_id: id } })
  return NextResponse.json(data)
}
