import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('id, nome, rating, comentario, created_at')
    .eq('product_id', productId)
    .eq('aprovado', true)
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json(data || [])
}
