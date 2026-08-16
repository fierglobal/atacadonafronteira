'use client'
import { useState, useEffect, useRef } from 'react'
import { WHATSAPP_HREF, WHATSAPP_GRUPO_HREF, WHATSAPP_DISPLAY } from '@/lib/site'

const INTERVALO = 6000
const TOTAL = 3

const IconeWhats = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

export default function HeroCarrossel() {
  const [ativo, setAtivo] = useState(0)
  const [pausado, setPausado] = useState(false)
  const reduzMovimento = useRef(false)

  useEffect(() => {
    reduzMovimento.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (pausado || reduzMovimento.current) return
    const id = setInterval(() => setAtivo(a => (a + 1) % TOTAL), INTERVALO)
    return () => clearInterval(id)
  }, [pausado, ativo])

  const irPara = (i: number) => setAtivo(((i % TOTAL) + TOTAL) % TOTAL)

  // O slide 1 fica no fluxo e define a altura da caixa; os outros são absolutos
  // por cima. Assim a imagem do hero continua sendo o elemento de LCP, carregada
  // eager e com fetchPriority alto — empilhar tudo em absolute com opacity faria
  // o Chrome adiar o download e piorar a métrica.
  const camada = (i: number): React.CSSProperties => ({
    position: 'absolute', inset: 0,
    opacity: ativo === i ? 1 : 0,
    pointerEvents: ativo === i ? 'auto' : 'none',
    transition: 'opacity 0.6s ease',
  })

  return (
    <div
      className="hero-banner-col"
      style={{ position: 'relative', flex: '1 1 78%', minWidth: 0, borderRadius: 10, overflow: 'hidden' }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques do Atacado na Fronteira"
    >
      {/* SLIDE 1 — catálogo (no fluxo, define a altura e é o LCP) */}
      <a href="#catalogo"
        onClick={e => { e.preventDefault(); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }}
        style={{ display: 'block', opacity: ativo === 0 ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: ativo === 0 ? 'auto' : 'none' }}
        aria-hidden={ativo !== 0} tabIndex={ativo === 0 ? undefined : -1}>
        <picture>
          <source media="(max-width: 767px)" srcSet="/banner-hero-mobile.webp" width={980} height={797} />
          <img src="/banner-hero.webp" alt="Atacado na Fronteira — preços competitivos, variedade e oportunidade para o seu negócio. Compre atacado."
            width={1920} height={776} fetchPriority="high"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
        </picture>
      </a>

      {/* SLIDE 2 — telefone oficial */}
      <a href={WHATSAPP_HREF} target="_blank" rel="noopener"
        style={{ ...camada(1), background: 'linear-gradient(135deg, #2b0a4e 0%, #420E76 55%, #5a1798 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none', textAlign: 'center', padding: '20px 24px', boxSizing: 'border-box' }}
        aria-hidden={ativo !== 1} tabIndex={ativo === 1 ? undefined : -1}>
        <span className="hero-slide-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.4)', color: '#FBBF24', fontSize: 10, fontWeight: 900, letterSpacing: '0.14em' }}>
          ATENDIMENTO OFICIAL
        </span>
        <span className="hero-slide-title" style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Fale direto com a gente
        </span>
        <span className="hero-slide-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 30, fontWeight: 900, color: '#25d366', letterSpacing: '-0.01em' }}>
          <IconeWhats size={28} />{WHATSAPP_DISPLAY}
        </span>
        <span className="hero-slide-sub" style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', maxWidth: 520, lineHeight: 1.5 }}>
          Este é o nosso único número de atendimento. Desconfie de qualquer outro.
        </span>
      </a>

      {/* SLIDE 3 — grupo oficial */}
      <a href={WHATSAPP_GRUPO_HREF} target="_blank" rel="noopener"
        style={{ ...camada(2), background: 'linear-gradient(135deg, #06301c 0%, #0b5c33 45%, #128c4a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none', textAlign: 'center', padding: '20px 24px', boxSizing: 'border-box' }}
        aria-hidden={ativo !== 2} tabIndex={ativo === 2 ? undefined : -1}>
        <span className="hero-slide-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.32)', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.14em' }}>
          GRUPO OFICIAL
        </span>
        <span className="hero-slide-title" style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Ofertas e novidades em primeira mão
        </span>
        <span className="hero-slide-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 26px', borderRadius: 99, background: '#25d366', color: '#06301c', fontSize: 15, fontWeight: 900, letterSpacing: '0.02em' }}>
          <IconeWhats size={19} />ENTRAR NO GRUPO
        </span>
        <span className="hero-slide-sub" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', maxWidth: 520, lineHeight: 1.5 }}>
          Entrada livre. Avisamos ali quando chega estoque novo e quando o preço cai.
        </span>
      </a>

      {/* Controles */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 3 }}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <button key={i} onClick={() => irPara(i)}
            aria-label={`Ir para o destaque ${i + 1} de ${TOTAL}`}
            aria-current={ativo === i}
            style={{ width: ativo === i ? 26 : 9, height: 9, borderRadius: 99, border: '1px solid rgba(0,0,0,0.18)', background: ativo === i ? '#FBBF24' : 'rgba(255,255,255,0.75)', cursor: 'pointer', padding: 0, transition: 'width 0.3s, background 0.3s' }} />
        ))}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .hero-slide-title { font-size: 21px !important; }
          .hero-slide-num { font-size: 20px !important; }
          .hero-slide-sub { font-size: 11.5px !important; }
          .hero-slide-tag { font-size: 9px !important; }
          .hero-slide-cta { font-size: 13px !important; padding: 10px 20px !important; }
        }
      `}</style>
    </div>
  )
}
