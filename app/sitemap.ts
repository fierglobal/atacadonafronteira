import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/onde-retirar`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/termos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/politica-privacidade`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, updated_at')
      .eq('ativo', true)
      .order('updated_at', { ascending: false })
      .limit(5000)

    const produtos: MetadataRoute.Sitemap = (data || []).map(p => ({
      url: `${SITE_URL}/produtos/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
    return [...estaticas, ...produtos]
  } catch {
    return estaticas
  }
}
