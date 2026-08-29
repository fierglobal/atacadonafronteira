'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCarrinho } from '@/components/CarrinhoContext'
import { getSupabaseClient } from '@/lib/supabase-client'
import { WHATSAPP_ENABLED } from '@/lib/site'
import { slugify } from '@/lib/slug'

type Cat = { id: string; nome: string; subs?: { id: string; nome: string }[]; marca?: string }

export default function HeaderActions({ topCats, contatoHref }: { topCats: Cat[]; contatoHref: string }) {
  const pathname = usePathname()
  const { currency, currencies, brlRate, setCurrency, abrirSidebar, quantidade } = useCarrinho()
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    const q = busca.trim()
    if (!q) return
    setMobileMenu(false)
    // Já na home, router.push('/?q=...') não remonta o HomeClient — a busca
    // ficava sem efeito nenhum (só a URL mudava). O evento deixa o próprio
    // HomeClient aplicar o filtro no estado que já tem.
    if (isHome) {
      window.dispatchEvent(new CustomEvent('anf:busca-header', { detail: q }))
    } else {
      router.push(`/?q=${encodeURIComponent(q)}#catalogo`)
    }
  }
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }: any) => {
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
        <span className="nav-rate">USD/BRL = {brlRate.toFixed(2).replace('.', ',')}</span>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setCurrencyOpen(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: 'rgba(66, 14, 118,0.06)', border: '1px solid rgba(66, 14, 118,0.3)', color: '#420E76', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
            <div style={{ position: 'relative', width: 20, height: 14, overflow: 'hidden', borderRadius: 2 }}>
              <Image src={currency.flag} alt={currency.label} fill style={{ objectFit: 'cover' }} unoptimized />
            </div>
            <span className="nav-cur-code">{currency.code}</span>
            <svg className="nav-cur-caret" style={{ width: 10, height: 10, transform: currencyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {currencyOpen && (
            <>
              <div onClick={() => setCurrencyOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, background: '#fff', border: '1px solid #ececec', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 20, minWidth: 130, overflow: 'hidden' }}>
                {currencies.map(c => (
                  <button key={c.code} onClick={() => { setCurrency(c); setCurrencyOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: currency.code === c.code ? 'rgba(66, 14, 118,0.06)' : 'transparent', border: 'none', color: currency.code === c.code ? '#420E76' : '#404040', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ position: 'relative', width: 20, height: 14, overflow: 'hidden', borderRadius: 2, flexShrink: 0 }}>
                      <Image src={c.flag} alt={c.label} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    {c.code} — {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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
          <Link href="/" onClick={() => setMobileMenu(false)}
            style={{ display: 'block', padding: '11px 14px', fontSize: 13, fontWeight: 700, color: isHome ? '#420E76' : '#404040', background: 'none', borderRadius: 8, letterSpacing: '0.08em', textDecoration: 'none' }}>
            TODOS
          </Link>
          {topCats.map(c => (
            <div key={c.id}>
              <a href={c.marca ? `/?marca=${encodeURIComponent(c.marca)}#catalogo` : `/categoria/${slugify(c.nome)}`} onClick={() => setMobileMenu(false)}
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
