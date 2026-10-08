'use client'

import { useState, useEffect } from 'react'
import { useCarrinho } from '@/components/CarrinhoContext'
import { WHATSAPP_ENABLED, WHATSAPP_GRUPO_HREF } from '@/lib/site'
import SiteFooter from '@/components/SiteFooter'
import { Destaques, Catalogo, ComoFunciona, BandaFinal, type DeptCard, type DestaqueProduto } from '@/components/HomeSecoes'
import HeroRotativo, { type HeroProduct } from '@/components/HeroRotativo'

const dec = (s: string | null) => {
  if (!s) return null
  try {
    const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch { return s }
}

// Home institucional — hero, departamentos, categorias e um link pro
// catálogo completo (/produtos). A vitrine de produtos (busca, filtro,
// scroll infinito) virou página própria, mesmo padrão do Expresso
// Paraguai: home enxuta, catálogo à parte.
export type HomeInitial = {
  deptEletronicos: number
  deptFarmacia: number
  departamentos: DeptCard[]
  destaques: DestaqueProduto[]
  total: number
  brands: { nome: string; total: number }[]  // nomes em base64, como a API
  heroEletronico: HeroProduct | null          // idem — decodificado dentro do HeroRotativo
  heroPromo: HeroProduct | null
}

export default function Home({ initial }: { initial?: HomeInitial }) {
  const [fabVisible, setFabVisible] = useState(false)
  const [aviso, setAviso] = useState('')
  const { brlRate } = useCarrinho()

  useEffect(() => {
    fetch('/api/home-config').then(r => r.json()).then(cfg => {
      if (cfg?.aviso) setAviso(cfg.aviso)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setFabVisible(window.scrollY > 800)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const brands = (initial?.brands ?? []).map(b => dec(b.nome) ?? b.nome)

  return (
    <div className="min-h-screen font-sans home-root" style={{ background: '#ffffff', color: '#0a0a0a' }}>
      {/* Motion e hover reais deste componente — o resto (nav mobile, header
          hover, reduced-motion) já mora em globals.css, compartilhado por
          todo o site; duplicar aqui não mudava nada, só juntava keyframe
          órfã (o arquivo chegou a ter 13, e só shimmer/fadeUp tinham uso
          de verdade — nenhuma delas neste componente). */}
      {aviso && (
        <div style={{ background: 'rgba(66, 14, 118,0.06)', borderBottom: '1px solid rgba(66, 14, 118,0.2)', padding: '8px 24px', textAlign: 'center', fontSize: 12, color: '#420E76', fontWeight: 600, letterSpacing: '0.04em' }}>
          {aviso}
        </div>
      )}

      {/* HERO */}
      {initial && (
        <HeroRotativo
          eletronicos={initial.deptEletronicos} farmacia={initial.deptFarmacia} total={initial.total} brlRate={brlRate}
          heroEletronico={initial.heroEletronico} heroPromo={initial.heroPromo}
        />
      )}

      {/* Ordem no desktop: logo após o hero, quem entra quer ver PREÇO — antes
          disso a home não tinha nenhum fora do hero. Catálogo (departamentos
          fundidos) e Como funciona (passos+retirada fundidos) vêm depois. */}
      {initial && (
        <>
          <Destaques produtos={initial.destaques} />
          <Catalogo cards={initial.departamentos} />
          <ComoFunciona />
        </>
      )}

      {/* WhatsApp FAB */}
      {WHATSAPP_ENABLED && (
        <a href={WHATSAPP_GRUPO_HREF} target="_blank" rel="noopener" aria-label="Entrar no grupo oficial do WhatsApp"
          style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.4)', zIndex: 50, transition: 'transform 0.2s, opacity 0.3s', opacity: fabVisible ? 1 : 0, pointerEvents: fabVisible ? 'auto' : 'none', transform: fabVisible ? 'scale(1)' : 'scale(0.6)' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.1)'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = fabVisible ? 'scale(1)' : 'scale(0.6)'}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}

      <BandaFinal total={initial?.total} />

      <SiteFooter brands={brands} />
    </div>
  )
}
