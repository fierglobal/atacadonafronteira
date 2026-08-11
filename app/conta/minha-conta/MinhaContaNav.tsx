'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import Logo from '@/components/Logo'

export default function MinhaContaNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#A965ED' : '#444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#A965ED' : '#444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      <style>{`
        @media (max-width: 700px) {
          .conta-sidebar { width: 100% !important; min-height: auto !important; flex-direction: row !important; border-right: none !important; border-bottom: 1px solid #141414 !important; padding: 0 !important; align-items: center !important; }
          .conta-user-info { display: none !important; }
          .conta-nav-footer { display: none !important; }
          .conta-logo { padding: 10px 16px !important; border-bottom: none !important; flex: 0 0 auto !important; }
          .conta-nav { display: flex !important; flex-direction: row !important; padding: 0 8px !important; flex: 1 !important; }
          .conta-nav a { margin-bottom: 0 !important; margin-right: 4px !important; padding: 8px 12px !important; }
          .conta-mobile-logout { display: flex !important; }
        }
        @media (min-width: 701px) {
          .conta-mobile-logout { display: none !important; }
        }
      `}</style>
      <div className="conta-sidebar" style={{
        width: 240, minHeight: '100vh', background: '#080808',
        borderRight: '1px solid #141414', display: 'flex',
        flexDirection: 'column', flexShrink: 0,
      }}>
        <div className="conta-logo" style={{ padding: '24px 20px 20px', borderBottom: '1px solid #111' }}>
          <a href="/"><Logo size={28} /></a>
        </div>

        <div className="conta-user-info" style={{ padding: '20px 20px 16px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(169, 101, 237,0.08)', border: '1px solid rgba(169, 101, 237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#A965ED' }}>{nome ? nome[0].toUpperCase() : '?'}</span>
          </div>
          {nome && <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>{nome}</p>}
          <p style={{ fontSize: 11, color: '#444', margin: 0, wordBreak: 'break-all' }}>{email}</p>
        </div>

        <nav className="conta-nav" style={{ padding: '8px 12px', flex: 1 }}>
          {navItems.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                background: active ? 'rgba(169, 101, 237,0.06)' : 'transparent',
                borderLeft: active ? '2px solid #A965ED' : '2px solid transparent',
                color: active ? '#A965ED' : '#555',
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
          color: '#444', fontSize: 12, cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>

        <div className="conta-nav-footer" style={{ padding: '16px 12px', borderTop: '1px solid #111' }}>
          <button onClick={logout} style={{
            width: '100%', padding: '10px 12px', background: 'transparent',
            border: '1px solid #1a1a1a', borderRadius: 8, color: '#444',
            fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'color 0.15s, border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1a1a1a' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair da conta
          </button>
        </div>
      </div>
    </>
  )
}
