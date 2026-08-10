import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/api/', '/conta/minha-conta', '/checkout', '/pix', '/pedido'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
