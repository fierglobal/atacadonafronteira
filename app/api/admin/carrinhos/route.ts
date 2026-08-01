import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('marketing', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin
    .from('cart_sessions')
    .select('*')
    .eq('convertido', false)
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json(data || [])
}
