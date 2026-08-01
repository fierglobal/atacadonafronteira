import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('produtos', 'r')
  if (auth) return auth
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('product_logs')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data)
}
