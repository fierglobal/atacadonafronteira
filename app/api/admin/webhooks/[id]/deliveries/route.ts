import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('webhooks', 'r')
  if (auth) return auth
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json(data || [])
}
