'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase-client'
import Logo from '@/components/Logo'

export default function MinhaContaNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) return
      setEmail(user.email || '')
      const { data: p } = await supabase.from('profiles').select('nome').eq('id', user.id).single()
      if (p?.nome) setNome(p.nome.split(' ')[0])
    })
  }, [])

  const logout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    {
      href: '/conta/minha-conta',
      label: 'Meu Perfil',
      exact: true,
      icon: (active: boolean) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#420E76' : '#525252'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      href: '/conta/minha-conta/pedidos',
      label: 'Meus Pedidos',
      exact: false,
      icon: (active: boolean) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#420E76' : '#525252'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      ),
    },
    {
      href: '/conta/minha-conta/recompra',
      label: 'Lista de Recompra',
      exact: false,
      icon: (active: boolean) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#420E76' : '#525252'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .conta-sidebar { width: 100% !important; min-height: auto !important; flex-direction: row !important; border-right: none !important; border-bottom: 1px solid #ececec !important; padding: 0 !important; align-items: center !important; }
          .conta-user-info { display: none !important; }
          .conta-nav-footer { display: none !important; }
          .conta-logo { padding: 10px 16px !important; border-bottom: none !important; flex: 0 0 auto !important; }
          .conta-nav { display: flex !important; flex-direction: row !important; padding: 0 8px !important; flex: 1 !important; overflow-x: auto !important; }
          .conta-nav a { margin-bottom: 0 !important; margin-right: 4px !important; padding: 10px 12px !important; white-space: nowrap; }
          .conta-mobile-logout { display: flex !important; }
        }
        @media (min-width: 901px) {
          .conta-mobile-logout { display: none !important; }
        }
      `}</style>
      <div className="conta-sidebar" style={{
        width: 280, minHeight: '100vh', background: '#ffffff',
        borderRight: '1px solid #ececec', display: 'flex',
        flexDirection: 'column', flexShrink: 0,
      }}>
        <div className="conta-logo" style={{ padding: '24px 24px 20px', borderBottom: '1px solid #ececec' }}>
          <Link href="/"><Logo size={28} /></Link>
        </div>

        <div className="conta-user-info" style={{ padding: '24px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(66, 14, 118,0.05)', border: '1px solid rgba(66, 14, 118,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#420E76' }}>{nome ? nome[0].toUpperCase() : '?'}</span>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              {nome && <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</p>}
              <p style={{ fontSize: 11, color: '#737373', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
            </div>
          </div>
        </div>

        <nav className="conta-nav" style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12,
                background: active ? 'rgba(66, 14, 118,0.05)' : 'transparent',
                borderLeft: active ? '3px solid #420E76' : '3px solid transparent',
                color: active ? '#420E76' : '#525252',
                textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 500,
                transition: 'all 0.15s',
              }}>
                {item.icon(active)}
                {item.label}
              </a>
            )
          })}
        </nav>

        <button className="conta-mobile-logout" onClick={logout} style={{
          display: 'none', alignItems: 'center', justifyContent: 'center',
          padding: '8px 12px', background: 'transparent', border: 'none',
          color: '#a3a3a3', fontSize: 12, cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>

        <div className="conta-nav-footer" style={{ padding: '24px', borderTop: '1px solid #ececec' }}>
          <button onClick={logout} style={{
            width: '100%', padding: '12px', background: 'transparent',
            border: '1px solid #ececec', borderRadius: 12, color: '#737373',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'color 0.15s, border-color 0.15s, background 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)'; e.currentTarget.style.background = '#fafafa' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#737373'; e.currentTarget.style.borderColor = '#ececec'; e.currentTarget.style.background = 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            SAIR DA CONTA
          </button>
        </div>
      </div>
    </>
  )
}
