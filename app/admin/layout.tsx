'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Logo from '@/components/Logo'

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem('admin-theme')
    setDark(saved === 'dark')
    const activeGroup = groups.find(g => g.items.some(i => pathname.startsWith(i.href)))
    const savedGroups = localStorage.getItem('admin-nav-groups')
    const initial = new Set<string>(savedGroups ? JSON.parse(savedGroups) : [])
    if (activeGroup) initial.add(activeGroup.key)
    setOpenGroups(initial)
    setMounted(true)
  }, [pathname])

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      localStorage.setItem('admin-nav-groups', JSON.stringify([...next]))
      return next
    })
  }

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('admin-theme', next ? 'dark' : 'light')
  }

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim()) {
      router.push(`/admin/busca?q=${encodeURIComponent(searchQ.trim())}`)
    }
  }

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className={dark ? 'admin-dark' : ''} style={{ minHeight: '100vh', background: 'var(--a-bg)', display: 'flex', color: 'var(--a-text)', visibility: mounted ? 'visible' : 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: 'var(--a-sidebar)', borderRight: '1px solid var(--a-border)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--a-border)' }}>
          <Logo size={26} dark />
          <p style={{ fontSize: 9, color: 'var(--a-text3)', letterSpacing: '0.12em', marginTop: 6, marginBottom: 10 }}>ADMIN</p>
          {/* Busca global */}
          <form onSubmit={handleSearch}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar..."
              style={{ width: '100%', padding: '7px 10px', background: 'var(--a-border)', border: '1px solid transparent', borderRadius: 6, color: 'var(--a-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(18,253,0,0.3)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
            />
          </form>
        </div>

        <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {(() => {
            const dashActive = pathname === '/admin'
            return (
              <a href={dashboard.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 7,
                  background: dashActive ? 'var(--a-nav-active-bg)' : 'transparent',
                  border: `1px solid ${dashActive ? 'var(--a-nav-active-border)' : 'transparent'}`,
                  color: dashActive ? 'var(--a-nav-active-text)' : 'var(--a-nav-inactive)',
                  textDecoration: 'none', fontSize: 12, fontWeight: dashActive ? 700 : 400,
                  flexShrink: 0, marginBottom: 6,
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d={dashboard.icon} />
                </svg>
                {dashboard.label}
              </a>
            )
          })()}

          {groups.map(g => {
            const open = openGroups.has(g.key)
            const hasActive = g.items.some(i => pathname.startsWith(i.href))
            return (
              <div key={g.key} style={{ marginBottom: 2 }}>
                <button onClick={() => toggleGroup(g.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 10px', borderRadius: 7,
                    background: 'transparent', border: '1px solid transparent',
                    color: hasActive ? 'var(--a-text)' : 'var(--a-nav-inactive)',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: 'pointer', textAlign: 'left' as const, flexShrink: 0,
                  }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d={g.icon} />
                  </svg>
                  <span style={{ flex: 1 }}>{g.label}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 8, marginTop: 2 }}>
                    {g.items.map(item => {
                      const active = pathname.startsWith(item.href)
                      return (
                        <a key={item.href} href={item.href}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 10px', borderRadius: 7,
                            background: active ? 'var(--a-nav-active-bg)' : 'transparent',
                            border: `1px solid ${active ? 'var(--a-nav-active-border)' : 'transparent'}`,
                            color: active ? 'var(--a-nav-active-text)' : 'var(--a-nav-inactive)',
                            textDecoration: 'none', fontSize: 12, fontWeight: active ? 700 : 400,
                            flexShrink: 0,
                          }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                            <path d={item.icon} />
                          </svg>
                          {item.label}
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: '10px 10px', borderTop: '1px solid var(--a-border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 7, background: 'none', border: 'none', color: 'var(--a-text2)', fontSize: 12, cursor: 'pointer' }}>
            {dark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
            {dark ? 'Tema Claro' : 'Tema Escuro'}
          </button>

          <button onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 7, background: 'none', border: 'none', color: 'var(--a-text3)', fontSize: 12, cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--a-text3)')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
