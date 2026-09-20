'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCarrinho } from '@/components/CarrinhoContext'
import { getSupabaseClient } from '@/lib/supabase-client'
import { WHATSAPP_ENABLED } from '@/lib/site'
import type { User } from '@supabase/supabase-js'
import { slugify } from '@/lib/slug'

type Cat = { id: string; nome: string; subs?: { id: string; nome: string }[]; marca?: string }

export default function HeaderActions({ topCats, contatoHref }: { topCats: Cat[]; contatoHref: string }) {
  const pathname = usePathname()
  const { abrirSidebar, quantidade } = useCarrinho()
  const [mobileMenu, setMobileMenu] = useState(false)
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    const q = busca.trim()
    if (!q) return
    setMobileMenu(false)
    // Busca sempre manda pro catálogo (/produtos) — a home é só institucional,
    // não tem mais grid de produto pra filtrar.
    router.push(`/produtos?q=${encodeURIComponent(q)}`)
  }
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      if (user) setUserName(user.user_metadata?.nome || user.email?.split('@')[0] || 'Conta')
    })
  }, [])

  const isHome = pathname === '/'

  return (
    <>
      <div className="nav-search-wrap">
        <form onSubmit={buscar} className="nav-search" role="search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto…" aria-label="Buscar produto" />
        </form>
      </div>
      <div className="nav-actions">
        <a href={userName ? '/conta/minha-conta' : '/conta/login'} className="header-account"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.02)', border: '1px solid #ececec', borderRadius: 8, padding: '7px 12px', color: '#404040', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="nav-acct-txt">{userName ? userName.split(' ')[0].toUpperCase() : 'CONTA'}</span>
        </a>
        <button className="nav-mobile-btn" onClick={() => setMobileMenu(p => !p)} aria-label="Menu">
          {mobileMenu ? '×' : '☰'}
        </button>
        <button onClick={abrirSidebar} className="header-cart"
          style={{ position: 'relative', background: 'rgba(66, 14, 118,0.06)', border: '1px solid rgba(66, 14, 118,0.3)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#420E76', fontSize: 12, fontWeight: 700 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span className="nav-cart-txt">CARRINHO</span>
          {quantidade > 0 && (
            <span style={{ background: '#A965ED', color: '#000', borderRadius: 99, fontSize: 10, fontWeight: 900, padding: '0 6px', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{quantidade}</span>
          )}
        </button>
      </div>

      {mobileMenu && (
        <div className="nav-mobile-drawer open">
          <form onSubmit={buscar} role="search" style={{ display: 'flex', gap: 8, padding: '4px 6px 10px' }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto ou marca…" aria-label="Buscar produto"
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d4d4d4', fontSize: 14, outline: 'none' }} />
            <button type="submit" style={{ padding: '10px 16px', borderRadius: 8, background: '#420E76', color: '#ffffff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>IR</button>
          </form>
          <Link href="/produtos" onClick={() => setMobileMenu(false)}
            style={{ display: 'block', padding: '11px 14px', fontSize: 13, fontWeight: 700, color: isHome ? '#420E76' : '#404040', background: 'none', borderRadius: 8, letterSpacing: '0.08em', textDecoration: 'none' }}>
            TODOS
          </Link>
          {topCats.map(c => (
            <div key={c.id}>
              <a href={c.marca ? `/produtos?marca=${encodeURIComponent(c.marca)}` : `/categoria/${slugify(c.nome)}`} onClick={() => setMobileMenu(false)}
                style={{ display: 'block', padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#404040', background: 'none', borderRadius: 8, letterSpacing: '0.08em', textDecoration: 'none' }}>
                {c.nome.toUpperCase()}
              </a>
              {/* sem isto o drawer mostraria só o departamento e as categorias
                  ficariam inalcançáveis no celular */}
              {(c.subs ?? []).map(s => (
                <a key={s.id} href={`/categoria/${slugify(s.nome)}`} onClick={() => setMobileMenu(false)}
                  style={{ display: 'block', padding: '8px 14px 8px 28px', fontSize: 12, fontWeight: 600, color: '#737373', borderRadius: 8, letterSpacing: '0.05em', textDecoration: 'none' }}>
                  {s.nome}
                </a>
              ))}
            </div>
          ))}
          {WHATSAPP_ENABLED && (
            <a href={contatoHref} target="_blank" rel="noopener" onClick={() => setMobileMenu(false)}
              style={{ display: 'block', padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#404040', textDecoration: 'none', borderRadius: 8, borderTop: '1px solid #ececec', marginTop: 4, paddingTop: 14, letterSpacing: '0.08em' }}>
              CONTATO
            </a>
          )}
          <a href={userName ? '/conta/minha-conta' : '/conta/login'} onClick={() => setMobileMenu(false)}
            style={{ display: 'block', padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#404040', textDecoration: 'none', borderRadius: 8, letterSpacing: '0.08em' }}>
            {userName ? `Minha Conta (${userName.split(' ')[0]})` : 'Entrar / Cadastrar'}
          </a>
        </div>
      )}
    </>
  )
}
