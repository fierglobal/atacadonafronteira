'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Logo from '@/components/Logo'
import AdminCommandPalette from './AdminCommandPalette'

type NavItem = { href: string; label: string; icon: string }
type NavGroup = { key: string; label: string; icon: string; items: NavItem[] }

const dashboard: NavItem = { href: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' }

const groups: NavGroup[] = [
  {
    key: 'vendas', label: 'Vendas',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    items: [
      { href: '/admin/pedidos', label: 'Pedidos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/admin/clientes', label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/admin/carrinhos', label: 'Carrinhos', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    ],
  },
  {
    key: 'catalogo', label: 'Catálogo',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    items: [
      { href: '/admin/produtos', label: 'Produtos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/admin/marcas', label: 'Marcas', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z' },
      { href: '/admin/categorias', label: 'Categorias', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { href: '/admin/estoque', label: 'Estoque', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
      { href: '/admin/importar', label: 'Importar CSV', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    ],
  },
  {
    key: 'marketing', label: 'Marketing',
    icon: 'M7 7h.01M3 5a2 2 0 012-2h4.586a1 1 0 01.707.293l7 7a2 2 0 010 2.828l-4.586 4.586a2 2 0 01-2.828 0l-7-7A1 1 0 013 9.586V5z',
    items: [
      { href: '/admin/home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/admin/cupons', label: 'Cupons', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
      { href: '/admin/promocoes', label: 'Promoções', icon: 'M7 7h.01M3 5a2 2 0 012-2h4.586a1 1 0 01.707.293l7 7a2 2 0 010 2.828l-4.586 4.586a2 2 0 01-2.828 0l-7-7A1 1 0 013 9.586V5z' },
      { href: '/admin/avaliacoes', label: 'Avaliações', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    ],
  },
  {
    key: 'analises', label: 'Análises',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    items: [
      { href: '/admin/relatorios', label: 'Relatórios', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href: '/admin/financeiro', label: 'Financeiro', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/admin/audit', label: 'Auditoria', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    ],
  },
  {
    key: 'config', label: 'Configuração',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    items: [
      { href: '/admin/configuracoes', label: 'Geral', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/admin/sales-channels', label: 'Canais', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 15a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zM8 7h.01M8 16h.01' },
      { href: '/admin/custom-fields', label: 'Campos Custom', icon: 'M4 6h16M4 12h16M4 18h7' },
      { href: '/admin/webhooks', label: 'Webhooks', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { href: '/admin/usuarios', label: 'Usuários', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { href: '/admin/seguranca', label: 'Segurança 2FA', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    ],
  },
]

const BOTTOM_TAB_ITEMS: NavItem[] = [
  dashboard,
  { href: '/admin/pedidos', label: 'Pedidos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/admin/produtos', label: 'Produtos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href: '/admin/clientes', label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Sidebar de menu vira drawer no mobile — sem isto ela ficava com os 220px
  // fixos sempre, empurrando o conteúdo e forçando scroll lateral na tela
  // inteira.
  useEffect(() => {
    if (!sidebarOpen) return
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onEsc) }
  }, [sidebarOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>

  const allItems = [dashboard, ...groups.flatMap(g => g.items)]
  const currentLabel = pathname === '/admin' ? 'Dashboard' : (allItems.find(i => pathname.startsWith(i.href))?.label ?? 'Admin')

  const navLinkStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 7,
    background: active ? 'rgba(214,168,101,0.12)' : 'transparent',
    borderLeft: `2px solid ${active ? '#9D7133' : 'transparent'}`,
    color: active ? '#9D7133' : '#475569',
    textDecoration: 'none', fontSize: 12, fontWeight: active ? 700 : 500,
    flexShrink: 0,
  } as const)

  return (
    <>
      <AdminCommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} items={allItems} />
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', color: '#0f172a' }}>
        <style>{`
          .admin-desktop-header { display: flex; }
          .admin-mobile-header { display: none; }
          .admin-bottom-tabbar { display: none; }
          @media (max-width: 900px) {
            .admin-sidebar {
              width: 260px !important;
              max-width: 82vw !important;
              transform: translateX(-100%);
              transition: transform 0.22s ease;
              box-shadow: 8px 0 32px rgba(0,0,0,0.25);
            }
            .admin-sidebar.open { transform: translateX(0) !important; }
            .admin-sidebar-close { display: flex !important; }
            .admin-main { margin-left: 0 !important; padding-bottom: 66px; }
            .admin-desktop-header { display: none !important; }
            .admin-mobile-header { display: flex !important; }
            .admin-bottom-tabbar { display: flex !important; }
          }
        `}</style>

        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} aria-hidden="true"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45 }} />
        )}

        {/* Sidebar */}
        <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} style={{ width: 220, background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <Logo size={24} />
            <button onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" className="admin-sidebar-close"
              style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', flexShrink: 0, marginTop: -2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
            <a href={dashboard.href} onClick={() => setSidebarOpen(false)} style={{ ...navLinkStyle(pathname === '/admin'), marginBottom: 10 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d={dashboard.icon} />
              </svg>
              {dashboard.label}
            </a>

            {groups.map(g => (
              <div key={g.key} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 10px 6px' }}>{g.label}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {g.items.map(item => (
                    <a key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} style={navLinkStyle(pathname.startsWith(item.href))}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.85 }}>
                        <path d={item.icon} />
                      </svg>
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Coluna principal */}
        <div className="admin-main" style={{ marginLeft: 220, flex: 1, minHeight: '100vh', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Barra superior mobile */}
          <header className="admin-mobile-header" style={{ alignItems: 'center', gap: 12, padding: '10px 14px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 40 }}>
            <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            </button>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLabel}</span>
            <a href="/" target="_blank" aria-label="Ver loja" title="Ver loja"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L4.5 4h15L21 9.5M4 9.5v9a1.5 1.5 0 001.5 1.5H10v-5a1 1 0 011-1h2a1 1 0 011 1v5h4.5A1.5 1.5 0 0020 18.5v-9M4 9.5a2 2 0 004 0M8 9.5a2 2 0 004 0M12 9.5a2 2 0 004 0M16 9.5a2 2 0 004 0"/></svg>
            </a>
            <button onClick={logout} aria-label="Sair" title="Sair"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </header>

          {/* Barra superior desktop */}
          <header className="admin-desktop-header" style={{ alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '10px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 40 }}>
            <button onClick={() => setCmdOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#94a3b8', fontSize: 13 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <span>Buscar...</span>
              <kbd style={{ fontSize: 10, color: '#94a3b8', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em' }}>⌘K</kbd>
            </button>
            <a href="/" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              Ver loja
            </a>
            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Sair
            </button>
          </header>

          <main style={{ flex: 1, minWidth: 0 }}>
            {children}
          </main>

          {/* Bottom tab bar — mobile */}
          <nav className="admin-bottom-tabbar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderTop: '1px solid #e2e8f0', minHeight: 58, paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
            {BOTTOM_TAB_ITEMS.map(item => {
              const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
              return (
                <a key={item.href} href={item.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 0', textDecoration: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#9D7133' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#9D7133' : '#94a3b8' }}>{item.label}</span>
                </a>
              )
            })}
            <button onClick={() => setSidebarOpen(true)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>Menu</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  )
}
