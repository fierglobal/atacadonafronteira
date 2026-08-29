'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCarrinho } from '@/components/CarrinhoContext'
import { isPromo, effectiveBadges } from '@/lib/produto'

const fmtBrl = (n: number, rate: number) => (n * rate).toFixed(2).replace('.', ',')

export default function CategoriaProductCard({ p }: {
  p: { id: string; name: string; brand: string | null; usd_price: number; usd_price_promo: number | null; img_url: string | null; estoque: number; badges?: string[] | null }
}) {
  const { brlRate, adicionar } = useCarrinho()
  const promo = isPromo(p)
  const preco = promo ? Number(p.usd_price_promo) : Number(p.usd_price)
  const temBadgePromo = effectiveBadges(p).some(b => b.toLowerCase().includes('promo'))

  return (
    <Link href={`/produtos/${p.id}`}
      style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column', opacity: p.estoque === 0 ? 0.55 : 1 }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#fafafa' }}>
        {temBadgePromo && (
          <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, background: 'rgba(66, 14, 118,0.10)', color: '#420E76', border: '1px solid rgba(66, 14, 118,0.4)', fontSize: 8, fontWeight: 900, padding: '3px 8px', borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase' }}>PROMOÇÃO</span>
        )}
        {p.img_url && (
          <Image src={p.img_url} alt={p.name} fill sizes="(max-width: 640px) 50vw, 190px" style={{ objectFit: 'contain', padding: 12 }} />
        )}
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        {p.brand && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em' }}>{p.brand}</span>}
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.35 }}>{p.name}</h2>
        <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#420E76' }}>USD {preco.toFixed(2)}</div>
            <div style={{ fontSize: 9, color: '#a3a3a3', marginTop: 2, fontWeight: 500 }}>≈ R$ {fmtBrl(preco, brlRate)}</div>
          </div>
          <button disabled={p.estoque === 0} aria-label="Adicionar ao carrinho"
            onClick={e => { e.preventDefault(); e.stopPropagation(); adicionar({ id: p.id, name: p.name, usd: preco, img: p.img_url ?? '/produto-placeholder.svg', brand: p.brand ?? undefined }) }}
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: p.estoque === 0 ? '#fafafa' : '#420E76', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: p.estoque === 0 ? 'not-allowed' : 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  )
}
