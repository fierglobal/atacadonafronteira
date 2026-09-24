'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export type HeroProduct = {
  id?: string; name: string | null; brand: string | null; usd_price: number; usd_price_promo: number | null
  brl_price: number | null; brl_price_promo?: number | null; img_url: string | null
  badges?: string[] | null; limite_por_cpf?: number | null
}

const dec = (s: string | null) => {
  if (!s) return null
  try {
    const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch { return s }
}

const shorten = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s)
// brl_price é o preço nativo em reais — só cai pro câmbio ao vivo em produto
// ainda não migrado (brl_price nulo). Preço no hero é sempre em R$, usd_price
// é legado de banco.
const brlNativo = (usd: number, brl: number | null | undefined, rate: number) => brl ?? usd * rate
const fmtBrl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Props = {
  eletronicos: number
  farmacia: number
  total: number
  brlRate: number
  heroEletronico: HeroProduct | null
  heroPromo: HeroProduct | null
}

// A "ficha de produto" é o único objeto visual do hero, e é IDÊNTICA nos 3
// slides possíveis — só o conteúdo muda. Antes cada slide tinha sua própria
// fórmula (card rotacionado sem preço / card grande com selo circular / card
// médio com outro selo circular), o que lia como "gerado 3 vezes". Um
// componente só, reaproveitado, é o que devolve consistência.
function Ficha({ img, alt, brand, name, priceNode, tag, href, linkLabel }: {
  img: string; alt: string; brand: string | null; name: string
  priceNode: ReactNode; tag?: ReactNode; href: string; linkLabel: string
}) {
  return (
    <div className="hero-ficha">
      <div className="hero-ficha-photo">
        {tag}
        <Image src={img} alt={alt} fill sizes="(max-width: 767px) 120px, 380px" style={{ objectFit: 'contain', padding: '10%' }} priority />
      </div>
      <div className="hero-ficha-body">
        {brand && <span className="hero-ficha-brand">{brand}</span>}
        <p className="hero-ficha-name">{name}</p>
        {priceNode}
        <Link href={href} className="hero-ficha-link">{linkLabel} →</Link>
      </div>
    </div>
  )
}

export default function HeroRotativo({ eletronicos, farmacia, total, brlRate, heroEletronico, heroPromo }: Props) {
  const eletronico = heroEletronico ? { ...heroEletronico, name: dec(heroEletronico.name) ?? '', brand: dec(heroEletronico.brand) } : null
  // Pré-venda com unidades limitadas merece uma chamada própria — o slide
  // padrão ("iPhone, Mac e mais Apple") esconderia justamente o que faz
  // alguém clicar agora: é lançamento e é limitado.
  const limitePorCpf = eletronico?.limite_por_cpf ?? null
  const promo = heroPromo && heroPromo.brl_price_promo != null
    ? { ...heroPromo, name: dec(heroPromo.name) ?? '', brand: dec(heroPromo.brand) }
    : null
  const discountPct = promo ? Math.round((1 - Number(promo.brl_price_promo) / Number(promo.brl_price)) * 100) : 0

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
    }, 7000)
    return () => clearInterval(id)
  }, [slideCount, mountExtra])

  const idxEletronicos = slides.indexOf('eletronicos')
  const idxFarmacia = slides.indexOf('farmacia')

  const precoNormal = (p: { usd_price: number; brl_price: number | null }) => (
    <div className="hero-ficha-price">R$ {fmtBrl(brlNativo(p.usd_price, p.brl_price, brlRate))}</div>
  )
  const precoPromo = (p: { usd_price: number; usd_price_promo: number | null; brl_price: number | null; brl_price_promo?: number | null }) => (
    <div>
      <div className="hero-ficha-price-strike">R$ {fmtBrl(brlNativo(p.usd_price, p.brl_price, brlRate))}</div>
      <div className="hero-ficha-price">R$ {fmtBrl(brlNativo(Number(p.usd_price_promo), p.brl_price_promo, brlRate))}</div>
    </div>
  )

  return (
    <section
      className="sec-hero hero-rot home-only"
      onMouseEnter={() => { hoverRef.current = true }}
      onMouseLeave={() => { hoverRef.current = false }}
      onFocus={() => { hoverRef.current = true }}
      onBlur={() => { hoverRef.current = false }}
    >
      {/* Slide 1 · Identidade — sempre montado, NO FLUXO: é ele que define a
          altura do hero e a imagem prioritária de LCP. */}
      <div className="hero-slide hero-slide-base" style={{ opacity: active === 0 ? 1 : 0, transform: active === 0 ? 'translateY(0)' : 'translateY(8px)' }} aria-hidden={active !== 0}>
        <div className="hero-content">
          <div className="hero-fade-in hero-col-text">
            <h1 className="hero-h1">Direto do Paraguai<br />pra revenda</h1>
            <p className="hero-sub">Eletrônicos, farmácia e perfumaria com preço de fronteira, para lojistas e profissionais da saúde.</p>
            <p className="hero-facts">
              <span className="hero-mono">{total}</span> produtos <span className="hero-facts-dot">·</span> PIX confirmado em <span className="hero-mono">30 min</span> <span className="hero-facts-dot">·</span> retirada CDE + Foz
            </p>
            <div className="hero-cta-row">
              <Link href="/produtos" className="hero-cta" tabIndex={active === 0 ? 0 : -1}>
                Ver catálogo completo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b0a4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <Link href="#como-funciona" className="hero-cta-secondary" tabIndex={active === 0 ? 0 : -1}>Como comprar →</Link>
            </div>
          </div>
          {eletronico?.img_url && (
            <Ficha img={eletronico.img_url} alt={eletronico.name} brand={eletronico.brand} name={eletronico.name}
              priceNode={precoNormal(eletronico)} href={`/produtos/${eletronico.id}`} linkLabel="Ver produto" />
          )}
        </div>
      </div>

      {/* Slide 2 · Eletrônicos — só existe se houver um destaque real em estoque. */}
      {mountExtra && eletronico && (
        <div className="hero-slide hero-slide-abs" style={{ opacity: active === idxEletronicos ? 1 : 0, transform: active === idxEletronicos ? 'translateY(0)' : 'translateY(8px)', pointerEvents: active === idxEletronicos ? 'auto' : 'none' }} aria-hidden={active !== idxEletronicos}>
          <div className="hero-content">
            <div className="hero-col-text">
              {limitePorCpf ? (
                <>
                  <span className="hero-tag hero-tag-amber"><i />Pré-venda</span>
                  <h1 className="hero-h1">{shorten(eletronico.name, 28)}</h1>
                  <p className="hero-sub">Estoque de lançamento — limitado a {limitePorCpf} unidades por cliente.</p>
                </>
              ) : (
                <>
                  <h1 className="hero-h1">iPhone, Mac<br />e mais Apple</h1>
                  <p className="hero-sub">{shorten(`${eletronico.brand ?? ''} ${eletronico.name}`.trim(), 60)} e mais {eletronicos} produtos.</p>
                </>
              )}
              <div className="hero-cta-row">
                <Link href={limitePorCpf && eletronico.id ? `/produtos/${eletronico.id}` : '/categoria/eletronicos'} className="hero-cta" tabIndex={active === idxEletronicos ? 0 : -1}>
                  {limitePorCpf ? 'Garantir o meu' : `Ver eletrônicos (${eletronicos})`}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b0a4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
                <Link href="#como-funciona" className="hero-cta-secondary" tabIndex={active === idxEletronicos ? 0 : -1}>Como comprar →</Link>
              </div>
            </div>
            {eletronico.img_url && (
              <Ficha img={eletronico.img_url} alt={eletronico.name} brand={eletronico.brand} name={eletronico.name}
                priceNode={precoNormal(eletronico)} href={`/produtos/${eletronico.id}`} linkLabel="Ver produto" />
            )}
          </div>
        </div>
      )}

      {/* Slide 3 · Farmácia — só existe se houver desconto real ativo hoje. */}
      {mountExtra && promo && (
        <div className="hero-slide hero-slide-abs" style={{ opacity: active === idxFarmacia ? 1 : 0, transform: active === idxFarmacia ? 'translateY(0)' : 'translateY(8px)', pointerEvents: active === idxFarmacia ? 'auto' : 'none' }} aria-hidden={active !== idxFarmacia}>
          <div className="hero-content">
            <div className="hero-col-text">
              <span className="hero-tag hero-tag-green"><i />Oferta ativa hoje</span>
              <h1 className="hero-h1">{shorten(promo.name, 34)}</h1>
              <p className="hero-sub">Tirzepatida (GLP-1) &middot; {farmacia} produtos, preço de fronteira.</p>
              <div className="hero-cta-row">
                <Link href="/categoria/farmacia" className="hero-cta" tabIndex={active === idxFarmacia ? 0 : -1}>
                  Ver farmácia ({farmacia})
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b0a4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
                <Link href="#como-funciona" className="hero-cta-secondary" tabIndex={active === idxFarmacia ? 0 : -1}>Como comprar →</Link>
              </div>
            </div>
            {promo.img_url && (
              <Ficha img={promo.img_url} alt={promo.name} brand={promo.brand} name={promo.name}
                priceNode={precoPromo(promo)}
                tag={<span className="hero-ficha-tag">-{discountPct}%</span>}
                href={`/produtos/${promo.id}`} linkLabel="Ver produto" />
            )}
          </div>
        </div>
      )}

      {slideCount > 1 && (
        <div className="hero-indicator">
          <span className="hero-mono hero-indicator-count">{active + 1}/{slideCount}</span>
          <div className="hero-indicator-ticks">
            {slides.map((s, i) => <span key={s} className={i === active ? 'on' : ''} />)}
          </div>
        </div>
      )}

      <style>{`
        .hero-rot { position: relative; overflow: hidden; font-family: inherit; background: #420E76; }
        .hero-slide-base { position: relative; }
        .hero-slide-abs { position: absolute; inset: 0; }
        .hero-slide-base, .hero-slide-abs { transition: opacity 0.35s ease, transform 0.35s ease; }

        .hero-content { position: relative; padding: 72px 24px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 380px; gap: 48px; align-items: center; }
        .hero-col-text { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
        .hero-h1 { margin: 0; font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; font-size: 44px; line-height: 1.05; font-weight: 700; letter-spacing: -0.02em; color: #ffffff; text-wrap: balance; max-width: 560px; }
        .hero-sub { margin: 0; font-size: 16px; font-weight: 400; line-height: 1.55; color: #E8DAF8; max-width: 460px; }
        .hero-facts { margin: 0; font-size: 13.5px; font-weight: 500; line-height: 1.5; color: rgba(255,255,255,0.72); }
        .hero-facts-dot { margin: 0 8px; opacity: 0.6; }
        .hero-mono { font-family: var(--font-geist-mono), ui-monospace, monospace; font-variant-numeric: tabular-nums; font-weight: 600; color: #ffffff; }
        .hero-cta-row { display: flex; align-items: center; gap: 20px; margin-top: 4px; flex-wrap: wrap; }
        .hero-cta { display: inline-flex; align-items: center; gap: 8px; padding: 14px 26px; border-radius: 10px; background: #F6BD0C; color: #2b0a4e; font-weight: 800; font-size: 15px; text-decoration: none; transition: transform 0.1s; }
        .hero-cta:active { transform: scale(0.98); }
        .hero-cta-secondary { font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; }
        .hero-cta-secondary:hover { text-decoration: underline; }

        .hero-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 4px; }
        .hero-tag i { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .hero-tag-amber { background: rgba(245,158,11,0.16); color: #fbbf6a; }
        .hero-tag-amber i { background: #fbbf6a; }
        .hero-tag-green { background: rgba(22,163,74,0.16); color: #6ee7a0; }
        .hero-tag-green i { background: #6ee7a0; }

        .hero-ficha { background: #ffffff; border: 1px solid #ececec; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
        .hero-ficha-photo { position: relative; aspect-ratio: 4 / 3; background: #fafafa; }
        .hero-ficha-tag { position: absolute; top: 10px; left: 10px; z-index: 2; background: #F6BD0C; color: #2b0a4e; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 4px; }
        .hero-ficha-body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 6px; }
        .hero-ficha-brand { font-size: 11px; font-weight: 800; color: #420E76; }
        .hero-ficha-name { margin: 0; font-size: 15px; font-weight: 600; color: #0a0a0a; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.7em; }
        .hero-ficha-price { font-family: var(--font-geist-mono), ui-monospace, monospace; font-variant-numeric: tabular-nums; font-size: 24px; font-weight: 600; color: #420E76; }
        .hero-ficha-price-strike { font-family: var(--font-geist-mono), ui-monospace, monospace; font-variant-numeric: tabular-nums; font-size: 13px; font-weight: 500; color: #a3a3a3; text-decoration: line-through; }
        .hero-ficha-link { margin-top: 4px; font-size: 13px; font-weight: 700; color: #420E76; text-decoration: none; }
        .hero-ficha-link:hover { text-decoration: underline; }

        @keyframes heroFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hero-fade-in > * { animation: heroFadeUp 0.5s ease-out both; }
        .hero-fade-in > *:nth-child(1) { animation-delay: 0ms; }
        .hero-fade-in > *:nth-child(2) { animation-delay: 80ms; }
        .hero-fade-in > *:nth-child(3) { animation-delay: 160ms; }
        .hero-fade-in > *:nth-child(4) { animation-delay: 240ms; }

        .hero-indicator { position: absolute; left: 24px; bottom: 20px; z-index: 2; display: flex; align-items: center; gap: 10px; }
        .hero-indicator-count { font-size: 12px; color: rgba(255,255,255,0.6); }
        .hero-indicator-ticks { display: flex; gap: 6px; }
        .hero-indicator-ticks span { width: 16px; height: 3px; border-radius: 1px; background: rgba(255,255,255,0.25); transition: background 0.3s; }
        .hero-indicator-ticks span.on { background: #F6BD0C; }

        @media (prefers-reduced-motion: reduce) {
          .hero-slide-abs, .hero-slide-base { transition: none; }
        }

        @media (max-width: 767px) {
          .hero-content { grid-template-columns: 1fr; gap: 24px; padding: 40px 20px; }
          .hero-h1 { font-size: 32px; }
          .hero-sub { font-size: 14px; max-width: 320px; }
          .hero-cta { width: 100%; box-sizing: border-box; justify-content: center; }
          .hero-cta-row { width: 100%; }
          .hero-ficha { flex-direction: row; }
          .hero-ficha-photo { width: 120px; flex-shrink: 0; aspect-ratio: 1 / 1; }
          .hero-ficha-body { padding: 12px; }
          .hero-ficha-name { font-size: 13px; }
          .hero-ficha-price { font-size: 19px; }
          .hero-indicator { display: none; }
        }
      `}</style>
    </section>
  )
}
