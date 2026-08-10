import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('configuracoes')
    .select('store_name, whatsapp')
    .eq('id', 'default')
    .single()
  return NextResponse.json(data || { store_name: 'Atacado na Fronteira', whatsapp: null })
}
