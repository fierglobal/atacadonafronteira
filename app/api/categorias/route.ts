import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('categorias')
    .select('id, nome, parent_id')
    .order('nome')
  if (error) return NextResponse.json([], { status: 500 })

  const { data: counts } = await supabaseAdmin
    .from('products')
    .select('categoria_id')
    .eq('ativo', true)

  const countMap: Record<string, number> = {}
  for (const p of counts ?? []) {
    if (p.categoria_id) countMap[p.categoria_id] = (countMap[p.categoria_id] ?? 0) + 1
  }

  return NextResponse.json((data ?? []).map(c => ({ ...c, produtos: countMap[c.id] ?? 0 })))
}
