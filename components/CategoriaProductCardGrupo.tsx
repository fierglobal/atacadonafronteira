import Link from 'next/link'
import Image from 'next/image'
import { isPromo, isEmBreve } from '@/lib/produto'

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export type MembroGrupo = {
  id: string; capacidade: string
  usd_price: number; usd_price_promo: number | null
  brl_price: number; brl_price_promo: number | null
  estoque: number; badges?: string[] | null
}

// Variações de capacidade/cor do mesmo modelo compartilham a MESMA foto no
// banco (product_variants nunca foi populada — ver app/categoria/[slug]/page.tsx).
// Em vez de 4 cards visualmente idênticos lado a lado, isso vira 1 card com uma
// linha de preço por capacidade — cada linha continua um <Link> real pra PDP,
// então SEO e JSON-LD não perdem nenhum dos produtos individuais.
export default function CategoriaProductCardGrupo({ brand, base, img, membros }: {
  brand: string; base: string; img: string; membros: MembroGrupo[]
}) {
  const visiveis = membros.slice(0, 4)
  const resto = membros.length - visiveis.length

  return (
    <div style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Link href={`/produtos/${membros[0].id}`} style={{ position: 'relative', aspectRatio: '1 / 1', background: '#fafafa', display: 'block' }}>
        <Image src={img} alt={base} fill sizes="(max-width: 640px) 50vw, 220px" style={{ objectFit: 'contain', padding: 12 }} />
      </Link>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#420E76', letterSpacing: '0.08em' }}>{brand}</span>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.3 }} title={base}>{base}</h2>
        <div style={{ marginTop: 4, borderTop: '1px solid #f5f5f5' }}>
          {visiveis.map(m => {
            const promo = isPromo(m)
            const preco = promo ? Number(m.brl_price_promo) : Number(m.brl_price)
            const emBreve = isEmBreve(m)
            return (
              <Link key={m.id} href={`/produtos/${m.id}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '7px 0', borderBottom: '1px solid #f5f5f5', textDecoration: 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#404040' }}>{m.capacidade}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: emBreve ? 600 : 800, color: emBreve ? '#a3a3a3' : '#420E76' }}>
                    {emBreve ? 'Em breve' : `R$ ${fmtBRL(preco)}`}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </span>
              </Link>
            )
          })}
        </div>
        {resto > 0 && (
          <Link href={`/produtos/${membros[0].id}`} style={{ fontSize: 11.5, fontWeight: 700, color: '#420E76', textDecoration: 'none', paddingTop: 4 }}>
            ver todas as {membros.length} opções →
          </Link>
        )}
      </div>
    </div>
  )
}
