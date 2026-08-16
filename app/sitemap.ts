import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'
import { listarCategoriasSeo } from '@/lib/categorias'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/termos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/politica-privacidade`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const [{ data }, cats] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('id, updated_at')
        .eq('ativo', true)
        .order('updated_at', { ascending: false })
        .limit(5000),
      listarCategoriasSeo(),
    ])

    // Categoria vem com prioridade acima do produto: é a página que responde a
    // busca genérica ("comprar tirzepatida paraguai"), enquanto a de produto só
    // responde a quem já sabe o nome do SKU.
    const categorias: MetadataRoute.Sitemap = cats.map(c => ({
      url: `${SITE_URL}/categoria/${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }))

    const produtos: MetadataRoute.Sitemap = (data || []).map(p => ({
      url: `${SITE_URL}/produtos/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
    return [...estaticas, ...categorias, ...produtos]
  } catch {
    return estaticas
  }
}
