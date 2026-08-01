import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin.from('configuracoes').select('home_config').eq('id', 'default').single()
  return NextResponse.json(data?.home_config || null)
}
