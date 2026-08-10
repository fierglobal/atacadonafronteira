import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { product_id, nome, rating, comentario } = await req.json()
  if (!product_id || !nome?.trim() || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from('reviews')
    .insert({ product_id, nome: nome.trim(), rating: +rating, comentario: comentario?.trim() || null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
