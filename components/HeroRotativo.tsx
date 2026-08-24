'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export type HeroProduct = {
  name: string | null; brand: string | null; usd_price: number; usd_price_promo: number | null; img_url: string | null
}

const dec = (s: string | null) => {
  if (!s) return null
  try {
    const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch { return s }
}

const shorten = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s)
const fmtUsd = (n: number) => n.toFixed(2).replace(/\.00$/, '')

type Props = {
  eletronicos: number
  farmacia: number
  total: number
  heroEletronico: HeroProduct | null
  heroPromo: HeroProduct | null
}

export default function HeroRotativo({ eletronicos, farmacia, total, heroEletronico, heroPromo }: Props) {
  const eletronico = heroEletronico ? { ...heroEletronico, name: dec(heroEletronico.name) ?? '', brand: dec(heroEletronico.brand) } : null
  const promo = heroPromo && heroPromo.usd_price_promo != null
    ? { ...heroPromo, name: dec(heroPromo.name) ?? '', brand: dec(heroPromo.brand) }
    : null
  const discountPct = promo ? Math.round((1 - Number(promo.usd_price_promo) / Number(promo.usd_price)) * 100) : 0

  const slides: Array<'identidade' | 'eletronicos' | 'farmacia'> = [
    'identidade',
    ...(eletronico ? (['eletronicos'] as const) : []),
    ...(promo ? (['farmacia'] as const) : []),
  ]
  const slideCount = slides.length

  const [active, setActive] = useState(0)
  const [mountExtra, setMountExtra] = useState(false)
  const hoverRef = useRef(false)

  // Adia a MONTAGEM dos slides 2/3 (não só a visibilidade) — opacity:0 no
  // primeiro paint faz o Chrome nunca buscar a imagem sob loading padrão,
  // mesmo com priority. Já pago essa lição no carrossel do paraguai-express.
  useEffect(() => {
    if (slideCount <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    const ric = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200))
    const cic = w.cancelIdleCallback ?? window.clearTimeout
    const id = ric(() => setMountExtra(true), { timeout: 2000 })
    return () => cic(id)
  }, [slideCount])

  useEffect(() => {
    if (slideCount <= 1 || !mountExtra) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      if (!hoverRef.current) setActive(a => (a + 1) % slideCount)
    }, 5000)
    return () => clearInterval(id)
  }, [slideCount, mountExtra])

  const idxEletronicos = slides.indexOf('eletronicos')
  const idxFarmacia = slides.indexOf('farmacia')

  return (
    <section
      className="sec-hero hero-rot home-only"
      onMouseEnter={() => { hoverRef.current = true }}
      onMouseLeave={() => { hoverRef.current = false }}
      onFocus={() => { hoverRef.current = true }}
      onBlur={() => { hoverRef.current = false }}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="heroNoise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
      </svg>

      {/* Slide 1 · Identidade — sempre montado, NO FLUXO: é ele que define a
          altura do hero e a imagem prioritária de LCP. */}
      <div className="hero-slide hero-slide-base" style={{ opacity: active === 0 ? 1 : 0 }} aria-hidden={active !== 0}>
        <div className="hero-bg" style={{ background: 'linear-gradient(120deg, #2b0a4e 0%, #420E76 58%, #A965ED 130%)' }}>
          <div className="hero-glow" style={{ left: -120, top: -160, width: 520, height: 520, background: 'radial-gradient(circle, rgba(169,101,237,0.35), transparent 70%)' }} />
          <div className="hero-glow" style={{ right: -80, bottom: -200, width: 620, height: 620, background: 'radial-gradient(circle, rgba(246,189,12,0.14), transparent 70%)' }} />
          <svg className="hero-bridge" viewBox="0 0 1280 220" preserveAspectRatio="none" aria-hidden="true">
            <path d="M -40,190 C 260,20 1020,20 1320,190" fill="none" stroke="#F6BD0C" strokeWidth="2.5" />
            <path d="M -40,210 C 260,70 1020,70 1320,210" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          </svg>
          <svg className="hero-grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#heroNoise)" /></svg>
        </div>

        <div className="hero-content">
          <span className="hero-kicker">Atacado na Fronteira</span>
          <h1 className="hero-h1">Direto do Paraguai<br />pra revenda</h1>
          <p className="hero-sub">Eletrônicos, farmácia e perfumaria com preço de fronteira, para lojistas e profissionais da saúde.</p>
          <div className="hero-stats">
            <div className="hero-stat"><span className="hero-stat-num">{total}</span><span className="hero-stat-label">produtos em estoque</span></div>
            <div className="hero-stat-div" />
            <div className="hero-stat"><span className="hero-stat-num">30 min</span><span className="hero-stat-label">PIX confirmado</span></div>
            <div className="hero-stat-div" />
            <div className="hero-stat"><span className="hero-stat-num">Brasil</span><span className="hero-stat-label">retirada ou envio</span></div>
          </div>
          <a href="#catalogo" className="hero-cta" tabIndex={active === 0 ? 0 : -1}>
            Ver catálogo completo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b0a4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>

        {eletronico?.img_url && (
          <div className="hero-card hero-card-solo">
            <Image src={eletronico.img_url} alt={eletronico.name} fill sizes="(max-width: 767px) 180px, 300px" style={{ objectFit: 'contain', padding: '12%' }} priority />
          </div>
        )}
      </div>

      {/* Slide 2 · Eletrônicos — só existe se houver um destaque real em estoque. */}
      {mountExtra && eletronico && (
        <div className="hero-slide hero-slide-abs" style={{ opacity: active === idxEletronicos ? 1 : 0, pointerEvents: active === idxEletronicos ? 'auto' : 'none' }} aria-hidden={active !== idxEletronicos}>
          <div className="hero-bg" style={{ background: 'radial-gradient(120% 140% at 78% 30%, #5a1798 0%, #2b0a4e 62%, #1a0733 100%)' }}>
            <div className="hero-glow" style={{ right: -60, top: -140, width: 520, height: 520, background: 'radial-gradient(circle, rgba(169,101,237,0.4), transparent 70%)' }} />
            <svg className="hero-grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#heroNoise)" /></svg>
          </div>
          <div className="hero-content">
            <span className="hero-kicker">Eletrônicos no atacado</span>
            <h1 className="hero-h1">Apple, Xiaomi<br />e JBL</h1>
            <p className="hero-sub">{shorten(`${eletronico.brand ?? ''} ${eletronico.name}`.trim(), 60)} e mais {eletronicos} produtos.</p>
            <div className="hero-price"><span className="hero-price-num">USD {fmtUsd(eletronico.usd_price)}</span></div>
            <Link href="/categoria/eletronicos" className="hero-cta" tabIndex={active === idxEletronicos ? 0 : -1}>
              Ver eletrônicos ({eletronicos})
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b0a4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          {eletronico.img_url && (
            <>
              <div className="hero-card hero-card-big">
                <Image src={eletronico.img_url} alt={eletronico.name} fill sizes="(max-width: 767px) 220px, 340px" style={{ objectFit: 'contain', padding: '12%' }} loading="eager" />
              </div>
              <div className="hero-badge hero-badge-price">
                <span className="hero-badge-big">USD {fmtUsd(eletronico.usd_price)}</span>
                <span className="hero-badge-small">preço de fronteira</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Slide 3 · Farmácia — só existe se houver desconto real ativo hoje. */}
      {mountExtra && promo && (
        <div className="hero-slide hero-slide-abs" style={{ opacity: active === idxFarmacia ? 1 : 0, pointerEvents: active === idxFarmacia ? 'auto' : 'none' }} aria-hidden={active !== idxFarmacia}>
          <div className="hero-bg" style={{ background: 'radial-gradient(120% 140% at 80% 70%, #421a7a 0%, #2b0a4e 60%, #1a0733 100%)' }}>
            <div className="hero-glow" style={{ right: 20, bottom: -160, width: 520, height: 520, background: 'radial-gradient(circle, rgba(120,190,235,0.16), transparent 70%)' }} />
            <div className="hero-glow" style={{ left: -100, top: -140, width: 420, height: 420, background: 'radial-gradient(circle, rgba(169,101,237,0.28), transparent 70%)' }} />
            <svg className="hero-grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#heroNoise)" /></svg>
          </div>
          <div className="hero-content">
            <span className="hero-kicker">Farmácia · oferta real</span>
            <h1 className="hero-h1">{shorten(promo.name, 34)}</h1>
            <p className="hero-sub">Peptídeos e linha de estética &middot; {farmacia} produtos, preço de fronteira.</p>
            <div className="hero-price">
              <span className="hero-price-strike">USD {fmtUsd(promo.usd_price)}</span>
              <span className="hero-price-num">USD {fmtUsd(Number(promo.usd_price_promo))}</span>
            </div>
            <Link href="/categoria/farmacia" className="hero-cta" tabIndex={active === idxFarmacia ? 0 : -1}>
              Ver farmácia ({farmacia})
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b0a4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          {promo.img_url && (
            <>
              <div className="hero-card hero-card-med">
                <Image src={promo.img_url} alt={promo.name} fill sizes="(max-width: 767px) 170px, 230px" style={{ objectFit: 'contain', padding: '12%' }} loading="eager" />
              </div>
              <div className="hero-badge hero-badge-discount">
                <span className="hero-badge-pct">-{discountPct}%</span>
                <span className="hero-badge-small">HOJE</span>
              </div>
            </>
          )}
        </div>
      )}

      {slideCount > 1 && (
        <div className="hero-dots">
          {slides.map((s, i) => <span key={s} className={i === active ? 'on' : ''} />)}
        </div>
      )}

      <style>{`
        .hero-rot { position: relative; overflow: hidden; font-family: inherit; }
        .hero-slide-base { position: relative; }
        .hero-slide-abs { position: absolute; inset: 0; transition: opacity 0.6s ease; }
        .hero-slide-base { transition: opacity 0.6s ease; }
        .hero-bg { position: absolute; inset: 0; overflow: hidden; }
        .hero-glow { position: absolute; border-radius: 50%; }
        .hero-bridge { position: absolute; left: 0; bottom: 0; width: 100%; height: 190px; opacity: 0.16; }
        .hero-grain { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.05; mix-blend-mode: overlay; }

        .hero-content { position: relative; padding: 64px 24px 56px; max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
        .hero-kicker { font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; color: #F6BD0C; text-transform: uppercase; }
        .hero-h1 { margin: 0; font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; font-size: 50px; line-height: 0.98; font-weight: 900; letter-spacing: -0.02em; color: #ffffff; text-wrap: balance; max-width: 640px; }
        .hero-sub { margin: 0; font-size: 16px; font-weight: 500; line-height: 1.55; color: #E8D9F7; max-width: 460px; }
        .hero-stats { display: flex; gap: 22px; align-items: center; }
        .hero-stat { display: flex; flex-direction: column; gap: 2px; }
        .hero-stat-num { font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 19px; font-weight: 700; color: #ffffff; }
        .hero-stat-label { font-size: 11.5px; font-weight: 600; color: #C293F2; }
        .hero-stat-div { width: 1px; height: 26px; background: rgba(255,255,255,0.18); }
        .hero-price { display: flex; align-items: baseline; gap: 12px; }
        .hero-price-strike { position: relative; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 16px; font-weight: 600; color: #C293F2; }
        .hero-price-strike::after { content: ''; position: absolute; left: -2px; right: -2px; top: 50%; height: 2px; background: #C293F2; transform: rotate(-4deg); }
        .hero-price-num { font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 30px; font-weight: 800; color: #ffffff; }
        .hero-cta { display: inline-flex; align-items: center; gap: 8px; padding: 15px 28px; border-radius: 10px; background: #F6BD0C; color: #2b0a4e; font-weight: 800; font-size: 15px; text-decoration: none; box-shadow: 0 10px 26px rgba(246,189,12,0.35); }

        .hero-card { position: absolute; background: #ffffff; border-radius: 26px; box-shadow: 0 30px 60px rgba(20,4,40,0.45); overflow: hidden; }
        .hero-card-solo { right: 96px; top: 60px; width: 260px; height: 260px; transform: rotate(5deg); }
        .hero-card-big { right: 120px; top: 56px; width: 300px; height: 300px; transform: rotate(4deg); }
        .hero-card-med { right: 150px; top: 70px; width: 220px; height: 220px; transform: rotate(-5deg); }

        .hero-badge { position: absolute; border-radius: 50%; background: #F6BD0C; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; line-height: 1.1; box-shadow: 0 14px 30px rgba(0,0,0,0.35), 0 0 0 6px rgba(246,189,12,0.18); }
        .hero-badge-price { right: 96px; top: 36px; width: 96px; height: 96px; transform: rotate(-8deg); }
        .hero-badge-discount { right: 400px; top: 44px; width: 84px; height: 84px; transform: rotate(-10deg); }
        .hero-badge-big { font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 15px; font-weight: 800; color: #2b0a4e; }
        .hero-badge-pct { font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 21px; font-weight: 800; color: #2b0a4e; }
        .hero-badge-small { font-size: 8px; font-weight: 800; color: #2b0a4e; letter-spacing: 0.05em; margin-top: 2px; }

        .hero-dots { position: absolute; left: 24px; bottom: 22px; z-index: 2; display: flex; gap: 7px; }
        .hero-dots span { width: 8px; height: 5px; border-radius: 99px; background: rgba(255,255,255,0.35); transition: width 0.3s, background 0.3s; }
        .hero-dots span.on { width: 22px; background: #F6BD0C; }

        @media (prefers-reduced-motion: reduce) {
          .hero-slide-abs, .hero-slide-base { transition: none; }
        }

        @media (max-width: 767px) {
          .hero-content { padding: 32px 20px 26px; gap: 12px; align-items: center; text-align: center; }
          .hero-h1 { font-size: 32px; }
          .hero-sub { font-size: 13.5px; max-width: 320px; }
          .hero-stats { gap: 16px; }
          .hero-stat-num { font-size: 16px; }
          .hero-cta { width: 100%; box-sizing: border-box; justify-content: center; padding: 14px 20px; }
          .hero-card, .hero-badge { display: none; }
          .hero-bridge { height: 90px; }
        }
      `}</style>
    </section>
  )
}
