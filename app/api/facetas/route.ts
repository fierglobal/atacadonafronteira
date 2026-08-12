import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const enc = (s: string) => Buffer.from(s).toString('base64')

export const revalidate = 300

// Agregados do catálogo inteiro: total e marcas com contagem. Existem porque a
// listagem virou paginada — o cliente não vê mais todos os produtos e não tem
// como derivar daí o filtro de marcas nem o contador da home.
export async function GET() {
  const now = new Date().toISOString()
  const PAGINA = 1000
  const marcas: Record<string, number> = {}
  let total = 0

  // só a coluna brand: são ~5 KB para 639 produtos, contra 386 KB do catálogo
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('brand')
      .eq('ativo', true)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .range(inicio, inicio + PAGINA - 1)
    if (error) return NextResponse.json({ total: 0, brands: [] }, { status: 500 })
    const pagina = data || []
    total += pagina.length
    for (const p of pagina) if (p.brand) marcas[p.brand] = (marcas[p.brand] ?? 0) + 1
    if (pagina.length < PAGINA) break
  }

  return NextResponse.json({
    total,
    brands: Object.entries(marcas)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, qtd]) => ({ nome: enc(nome), total: qtd })),
  })
}
