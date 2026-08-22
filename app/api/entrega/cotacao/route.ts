import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { idsEletronicos } from '@/lib/categorias'
import { calcularEntrega, type EntregaTipo } from '@/lib/entrega'
import { rateLimit, getIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type Entrada = { itens?: { id?: string; quantity?: number }[] }

// A tela não sabe a categoria dos produtos do carrinho — e mesmo que soubesse,
// preço não se calcula no navegador. Aqui o servidor lê a categoria real de cada
// item e devolve as três opções já precificadas, prontas para desenhar.
export async function POST(req: Request) {
  const rl = rateLimit(`cotacao:${getIp(req)}`, 30, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 })

  let body: Entrada
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const itens = (body.itens || []).filter(i => i.id && (i.quantity || 0) > 0).slice(0, 200)
  if (!itens.length) return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })

  const [{ data: prods }, eletronicos] = await Promise.all([
    supabaseAdmin.from('products').select('id, categoria_id').in('id', itens.map(i => i.id!)),
    idsEletronicos(),
  ])

  const catPorId = new Map((prods || []).map(p => [p.id as string, p.categoria_id as string | null]))
  const paraCalculo = itens.map(i => ({
    quantity: i.quantity!,
    eletronico: eletronicos.has(catPorId.get(i.id!) || ''),
  }))

  const tipos: EntregaTipo[] = ['retirada_cde', 'retirada_foz', 'envio_brasil']
  const opcoes = Object.fromEntries(
    tipos.map(t => [t, calcularEntrega(paraCalculo, t, false)]),
  )

  return NextResponse.json({
    opcoes,
    unidades: paraCalculo.reduce((s, i) => s + i.quantity, 0),
    tabelaEletronico: paraCalculo.some(i => i.eletronico),
  })
}
