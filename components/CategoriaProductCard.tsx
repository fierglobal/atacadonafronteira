'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCarrinho } from '@/components/CarrinhoContext'
import { isPromo, effectiveBadges, isEmBreve, nomeSemMarca, nomeSemSufixoStatus, statusDisponibilidade, ROTULO_EM_BREVE } from '@/lib/produto'

// Site trabalha só em R$ — sem seletor de moeda, sem "≈ USD" em canto nenhum.
const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Mesma paleta usada em app/produtos/[id]/page.tsx (BADGE_COLORS) pra "sob
// encomenda" — o card de categoria não importa dali pra não acoplar aos badges
// de texto livre, mas a cor precisa bater com o que o cliente já viu na PDP.
const STATUS: Record<'pronta_entrega' | 'sob_encomenda' | 'esgotado', { dot: string; texto: string; label: string }> = {
  pronta_entrega: { dot: '#16a34a', texto: '#0f7a3d', label: 'Pronta entrega' },
  sob_encomenda: { dot: '#f59e0b', texto: '#b45309', label: 'Sob encomenda' },
  esgotado: { dot: '#a3a3a3', texto: '#737373', label: 'Esgotado' },
}

export default function CategoriaProductCard({ p, menorPrecoAtacado }: {
  p: { id: string; name: string; brand: string | null; usd_price: number; usd_price_promo: number | null; brl_price: number; brl_price_promo: number | null; img_url: string | null; estoque: number; badges?: string[] | null }
  /** menor brl_price entre os tiers de quantidade do produto, quando existem */
  menorPrecoAtacado?: number | null
}) {
  const { adicionar } = useCarrinho()
  const promo = isPromo(p)
  // Exibição usa brl_price direto (sem multiplicar por brl_rate); o carrinho
  // segue recebendo o valor em USD (usd_price), que é o que o checkout entende.
  const precoBRL = promo ? Number(p.brl_price_promo) : Number(p.brl_price)
  const precoUSD = promo ? Number(p.usd_price_promo) : Number(p.usd_price)
  const emBreve = isEmBreve(p)
  const esgotado = p.estoque === 0 && !emBreve
  const semCompra = p.estoque === 0 || emBreve
  const temBadgePromo = effectiveBadges(p).some(b => b.toLowerCase().includes('promo'))
  const status = STATUS[statusDisponibilidade(p) as keyof typeof STATUS]
  const nome = nomeSemSufixoStatus(nomeSemMarca(p.name, p.brand))
  const temAtacado = menorPrecoAtacado != null && menorPrecoAtacado < precoBRL

  return (
    <Link href={`/produtos/${p.id}`}
      style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#fafafa' }}>
        {temBadgePromo && (
          <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, background: 'rgba(66, 14, 118,0.10)', color: '#420E76', border: '1px solid rgba(66, 14, 118,0.4)', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase' }}>PROMOÇÃO</span>
        )}
        {p.img_url && (
          <Image src={p.img_url} alt={p.name} fill sizes="(max-width: 640px) 50vw, 220px"
            style={{ objectFit: 'contain', padding: 12, filter: esgotado ? 'grayscale(1) opacity(.7)' : undefined }} />
        )}
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        {p.brand && <span style={{ fontSize: 10, fontWeight: 800, color: '#420E76', letterSpacing: '0.08em' }}>{p.brand}</span>}
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.7em' }} title={p.name}>
          {nome}
        </h2>

        {!emBreve && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: status.texto }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
            {status.label}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            {emBreve ? (
              <div style={{ fontSize: 13, fontWeight: 900, color: '#420E76', letterSpacing: '0.04em' }}>{ROTULO_EM_BREVE}</div>
            ) : (
              <>
                {promo && <div style={{ fontSize: 11, color: '#a3a3a3', textDecoration: 'line-through' }}>R$ {fmtBRL(Number(p.brl_price))}</div>}
                {temAtacado ? (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#420E76' }}>R$ {fmtBRL(menorPrecoAtacado as number)}<span style={{ fontSize: 10, fontWeight: 700 }}> /un</span></div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#737373' }}>no atacado · unid. R$ {fmtBRL(precoBRL)}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#420E76' }}>R$ {fmtBRL(precoBRL)}</div>
                )}
              </>
            )}
          </div>
          <button disabled={semCompra} aria-label="Adicionar ao carrinho" className="cat-add-btn"
            onClick={e => { e.preventDefault(); e.stopPropagation(); adicionar({ id: p.id, name: p.name, usd: precoUSD, img: p.img_url ?? '/produto-placeholder.svg', brand: p.brand ?? undefined }) }}
            style={{ flexShrink: 0, borderRadius: 8, background: semCompra ? '#fafafa' : '#420E76', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: semCompra ? 'not-allowed' : 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  )
}
