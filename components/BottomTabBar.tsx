'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCarrinho } from './CarrinhoContext'
import { getSupabaseClient } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'
import { COR_ROXO } from '@/lib/site'

// Só aparece nas páginas de navegação (home, catálogo, conta) — nas
// transacionais (PDP, carrinho, checkout) e de drill-down (detalhe de pedido,
// login) ela cederia espaço pra uma barra de ação ou nem aparece, mesmo padrão
// condicional por pathname que MinimoBar.tsx já usa.
const ROTAS_COM_TAB_BAR = new Set(['/', '/produtos', '/promocoes', '/conta/minha-conta', '/conta/minha-conta/pedidos', '/conta/minha-conta/recompra'])

// Exportada porque MinimoBar.tsx precisa saber se a tab bar está visível na
// rota atual pra subir e não ficar escondida atrás dela no mobile.
export function mostrarEm(pathname: string): boolean {
  if (ROTAS_COM_TAB_BAR.has(pathname)) return true
  if (pathname.startsWith('/categoria/')) return true
  return false
}

export default function BottomTabBar() {
  const pathname = usePathname()
  const { abrirSidebar, quantidade } = useCarrinho()
  const [logado, setLogado] = useState(false)

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      setLogado(!!user)
    })
  }, [])

  const visivel = mostrarEm(pathname)

  // Reserva o espaço dela no fim da página (só mobile, via CSS) pra não
  // cobrir o footer — mesmo mecanismo que MinimoBar já usa pro CookieBanner.
  useEffect(() => {
    document.body.style.setProperty('--tabbar-h', visivel ? '64px' : '0px')
    return () => { document.body.style.setProperty('--tabbar-h', '0px') }
  }, [visivel])

  if (!visivel) return null

  const ativo = pathname === '/' ? 'inicio'
    : pathname === '/conta/minha-conta/recompra' ? 'recompra'
    : pathname.startsWith('/conta/minha-conta') ? 'conta'
    : null

  const item = (href: string, chave: string, label: string, icon: React.ReactNode) => {
    const estaAtivo = ativo === chave
    return (
      <a href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, textDecoration: 'none', color: estaAtivo ? COR_ROXO : '#737373' }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>{label}</span>
      </a>
    )
  }

  return (
    <nav className="bottom-tab-bar" aria-label="Navegação principal" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, height: 64, background: '#ffffff', borderTop: '1px solid #ececec', display: 'flex', alignItems: 'flex-start', padding: '8px 4px 0' }}>
      {item('/', 'inicio', 'Início', (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      ))}
      {item('/conta/minha-conta/recompra', 'recompra', 'Recompra', (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      ))}

      <a href="/produtos" aria-label="Catálogo" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <span style={{ position: 'relative', top: -18, width: 50, height: 50, borderRadius: '50%', background: COR_ROXO, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(66, 14, 118,0.35)', border: '4px solid #ffffff' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </span>
      </a>

      {item(logado ? '/conta/minha-conta' : '/conta/login', 'conta', 'Conta', (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ))}

      <button onClick={abrirSidebar} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, background: 'none', border: 'none', color: '#737373', position: 'relative' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        {quantidade > 0 && (
          <span style={{ position: 'absolute', top: -2, right: '28%', background: '#A965ED', color: '#000', borderRadius: 99, fontSize: 9, fontWeight: 900, minWidth: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{quantidade}</span>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>Carrinho</span>
      </button>
    </nav>
  )
}
