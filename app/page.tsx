import { Suspense } from 'react'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import HomeClient, { type HomeInitial } from './HomeClient'
import { supabaseAdmin } from '@/lib/supabase'

// ISR: NUNCA ler searchParams aqui — isso tornaria a rota dinâmica e mataria o
// cache (ver o caso da categoria no Expresso Paraguai). O servidor sempre monta
// a vitrine sem filtro; quando a URL tem ?cat/?marca/?q, o client refaz o
// recorte por cima.
export const revalidate = 60

export const metadata: Metadata = { alternates: { canonical: '/' } }

const enc = (s: string | null) => s ? Buffer.from(s).toString('base64') : null

const CAMPOS = 'id, name, brand, usd_price, usd_price_promo, img_url, estoque, categoria_id, descricao_curta, badges, venda_minima, multiplicador'
const VITRINE_POR_SECAO = 12

// Mesmo shape que o client montaria via /api/facetas + /api/categorias +
// /api/produtos — mas resolvido no servidor, para a primeira tela sair do HTML
// em vez de nascer skeleton.
async function getInitial(): Promise<HomeInitial | null> {
  try {
    const now = new Date().toISOString()
    const [{ data: cats }, { data: ativos }] = await Promise.all([
      supabaseAdmin.from('categorias').select('id, nome, parent_id'),
      supabaseAdmin.from('products').select('categoria_id, brand')
        .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
        .range(0, 4999),
    ])
    if (!cats || !ativos) return null

    const counts: Record<string, number> = {}
    const marcas: Record<string, number> = {}
    for (const p of ativos) {
      if (p.categoria_id) counts[p.categoria_id] = (counts[p.categoria_id] ?? 0) + 1
      if (p.brand) marcas[p.brand] = (marcas[p.brand] ?? 0) + 1
    }

    const categorias = cats.map(c => ({ ...c, produtos: counts[c.id] ?? 0 }))
    const raizes = categorias.filter(c => !c.parent_id &&
      (c.produtos > 0 || categorias.some(ch => ch.parent_id === c.id && ch.produtos > 0)))

    const secoes = await Promise.all(raizes.map(async r => {
      const ids = [r.id, ...categorias.filter(ch => ch.parent_id === r.id).map(ch => ch.id)]
      const total = ids.reduce((s, id) => s + (counts[id] ?? 0), 0)
      const { data } = await supabaseAdmin.from('products').select(CAMPOS)
        .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
        .in('categoria_id', ids)
        .order('sort_order', { ascending: true }).order('id', { ascending: true })
        .range(0, VITRINE_POR_SECAO - 1)
      return {
        id: r.id, nome: r.nome, total,
        // nomes em base64, o mesmo contrato da API pública — o client decodifica tudo igual
        items: (data || []).map(p => ({ ...p, name: enc(p.name), brand: enc(p.brand), rating: null, rating_total: 0 })),
      }
    }))
    secoes.sort((a, b) => b.total - a.total)

    return {
      categorias,
      total: ativos.length,
      brands: Object.entries(marcas).sort((a, b) => b[1] - a[1]).map(([nome, total]) => ({ nome: enc(nome)!, total })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      secoes: secoes as any,
    }
  } catch { return null }
}

export default async function HomePage() {
  const initial = await getInitial()
  return (
    <>
      <SiteHeader />
      <Suspense>
        <HomeClient initial={initial ?? undefined} />
      </Suspense>
    </>
  )
}
