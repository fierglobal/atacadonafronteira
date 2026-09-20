import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { idsEletronicos, idsFarmacia } from '@/lib/categorias'
import { calcularEntrega, PRAZO_ENVIO_BRASIL_HORAS, type EntregaTipo } from '@/lib/entrega'
import { priceForQty, type Tier } from '@/lib/tier'
import { rateLimit, getIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type Entrada = { itens?: { id?: string; quantity?: number }[] }

// A tela não sabe a categoria nem o preço com desconto de volume do carrinho —
// aqui o servidor lê os dois (categoria real + tier por quantidade) e devolve
// as três opções já precificadas, prontas para desenhar.
export async function POST(req: Request) {
  const rl = rateLimit(`cotacao:${getIp(req)}`, 30, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 })

  let body: Entrada
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const itens = (body.itens || []).filter(i => i.id && (i.quantity || 0) > 0).slice(0, 200)
  if (!itens.length) return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })

  const ids = itens.map(i => i.id!)
  const [{ data: prods }, { data: tiersRows }, eletronicos, farmacia] = await Promise.all([
    supabaseAdmin.from('products').select('id, categoria_id, brl_price').in('id', ids),
    supabaseAdmin.from('product_price_tiers').select('product_id, qty_min, qty_max, brl_price').in('product_id', ids),
    idsEletronicos(),
    idsFarmacia(),
  ])

  const catPorId = new Map((prods || []).map(p => [p.id as string, p.categoria_id as string | null]))
  const precoBasePorId = new Map((prods || []).map(p => [p.id as string, Number(p.brl_price) || 0]))
  const tiersPorId = new Map<string, Tier[]>()
  for (const t of (tiersRows || [])) {
    const arr = tiersPorId.get(t.product_id as string) || []
    arr.push({ qty_min: t.qty_min as number, qty_max: t.qty_max as number | null, brl_price: Number(t.brl_price) })
    tiersPorId.set(t.product_id as string, arr)
  }

  const paraCalculo = itens.map(i => {
    const base = precoBasePorId.get(i.id!) || 0
    const unit = priceForQty(i.quantity!, base, tiersPorId.get(i.id!))
    return {
      quantity: i.quantity!,
      eletronico: eletronicos.has(catPorId.get(i.id!) || ''),
      farmacia: farmacia.has(catPorId.get(i.id!) || ''),
      subtotalBRL: unit * i.quantity!,
    }
  })

  const tipos: EntregaTipo[] = ['retirada_cde', 'retirada_foz', 'envio_brasil']
  const opcoes = Object.fromEntries(
    tipos.map(t => [t, calcularEntrega(paraCalculo, t)]),
  )

  return NextResponse.json({
    opcoes,
    unidades: paraCalculo.reduce((s, i) => s + i.quantity, 0),
    tabelaEletronico: paraCalculo.some(i => i.eletronico),
    tabelaFarmacia: !paraCalculo.some(i => i.eletronico) && paraCalculo.some(i => i.farmacia),
    prazoHoras: PRAZO_ENVIO_BRASIL_HORAS,
  })
}
