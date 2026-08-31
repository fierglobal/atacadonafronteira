import type { Metadata, Viewport } from 'next'
import AdminLayoutClient from './AdminLayoutClient'

// Metadata só é reconhecido em Server Component — por isso o admin virou
// dois arquivos: este (metadata/PWA) e AdminLayoutClient.tsx (a UI de
// verdade, que precisa de useState/useEffect). manifest aponta pra
// /admin/manifest.webmanifest (rota própria, ver o route.ts ao lado) pra
// "adicionar à tela inicial" instalar um app com identidade própria do
// admin, e não o PWA da loja.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ANF Admin',
  },
}

export const viewport: Viewport = {
  themeColor: '#080808',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
