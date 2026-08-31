import { NextResponse } from 'next/server'

// manifest.ts só é reconhecido como convenção especial na raiz de app/ nesta
// versão do Next.js (nested não é suportado — ver
// node_modules/next/dist/docs/.../manifest.md). Route Handler normal serve o
// mesmo conteúdo em /admin/manifest.webmanifest, que é o que o layout do
// admin referencia pra ter uma identidade de PWA separada da loja (scope
// '/admin') — sem isso, "adicionar à tela inicial" a partir do admin
// instalaria o PWA da loja, não um app próprio.
export async function GET() {
  return NextResponse.json(
    {
      id: '/admin',
      name: 'Atacado na Fronteira — Admin',
      short_name: 'ANF Admin',
      description: 'Painel administrativo Atacado na Fronteira',
      start_url: '/admin',
      display: 'standalone',
      background_color: '#080808',
      theme_color: '#080808',
      orientation: 'portrait',
      scope: '/admin',
      icons: [
        { src: '/admin-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/admin-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/admin-apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
