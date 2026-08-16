import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/slug'

export { slugify }

export type CategoriaSeo = {
  id: string
  nome: string
  slug: string
  parentId: string | null
  paiNome: string | null
  paiSlug: string | null
  total: number
  descendentes: string[]
}

// Uma categoria vale página quando tem produto ativo nela OU em alguma filha.
// Perfumes e PODs existem no banco com zero produtos: virariam página vazia
// indexável, que é pior que não existir.
export async function listarCategoriasSeo(): Promise<CategoriaSeo[]> {
  const now = new Date().toISOString()
  const [{ data: cats }, { data: ativos }] = await Promise.all([
    supabaseAdmin.from('categorias').select('id, nome, parent_id'),
    supabaseAdmin.from('products').select('categoria_id')
      .eq('ativo', true).or(`published_at.is.null,published_at.lte.${now}`)
      .range(0, 4999),
  ])
  if (!cats) return []

  const diretos: Record<string, number> = {}
  for (const p of ativos || []) {
    if (p.categoria_id) diretos[p.categoria_id] = (diretos[p.categoria_id] ?? 0) + 1
  }

  const porId = new Map(cats.map(c => [c.id as string, c]))
  const filhasDe = (id: string) => cats.filter(c => c.parent_id === id).map(c => c.id as string)

  return cats
    .map(c => {
      const descendentes = filhasDe(c.id as string)
      const total = (diretos[c.id as string] ?? 0) + descendentes.reduce((s, f) => s + (diretos[f] ?? 0), 0)
      const pai = c.parent_id ? porId.get(c.parent_id as string) : null
      return {
        id: c.id as string,
        nome: c.nome as string,
        slug: slugify(c.nome as string),
        parentId: (c.parent_id as string | null) ?? null,
        paiNome: (pai?.nome as string) ?? null,
        paiSlug: pai ? slugify(pai.nome as string) : null,
        total,
        descendentes,
      }
    })
    .filter(c => c.total > 0)
}

export async function acharCategoriaPorSlug(slug: string): Promise<CategoriaSeo | null> {
  const todas = await listarCategoriasSeo()
  return todas.find(c => c.slug === slug) ?? null
}
