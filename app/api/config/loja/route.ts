import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

// Só a taxa do câmbio, nada sensível — é o mesmo número que a vitrine já estampa
// no header. Existe separado de /api/checkout-config (que devolve chave PIX) porque
// a vitrine inteira lê isto a cada visita, e chave PIX não precisa ir junto.
//
// force-dynamic + s-maxage: a rota nunca congela no build, e o CDN segura 60s
// para não virar uma consulta ao banco por visitante.
export async function GET() {
  const { brl_rate } = await getConfig()
  return NextResponse.json({ brl_rate }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
