'use client'
import Link from 'next/link'
import { WHATSAPP_HREF, WHATSAPP_DISPLAY, WHATSAPP_ENABLED } from '@/lib/site'
import CategoriaProductCard from '@/components/CategoriaProductCard'

// Seções estáticas da home. Vivem fora do HomeClient para não misturar copy de
// conversão com a máquina de filtro/carrossel, mas continuam sendo renderizadas
// no servidor — é daqui que sai quase todo o texto plano que o Google lê, já que
// nome de produto sai ofuscado em base64.

const GOLD_TEXT = '#9D7133'
const DARK = '#111111'
const MONO = 'var(--font-geist-mono), ui-monospace, monospace'

export type DestaqueProduto = {
  id: string; name: string; brand: string | null; sku?: string | null; usd_price: number; usd_price_promo: number | null
  brl_price: number; brl_price_promo: number | null; img_url: string | null; estoque: number
  badges?: string[] | null; menorPrecoAtacado?: number | null
}
export type DeptCard = {
  nome: string
  slug: string
  total: number
  descricao: string
  marcas: { nome: string; qtd: number }[]
  miniaturas: { id: string; img: string | null }[]
}
const secao: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' }
const h2: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: '-0.01em', color: '#0a0a0a' }
const sub: React.CSSProperties = { margin: '8px 0 0', color: '#737373', fontSize: 15 }
const mono: React.CSSProperties = { fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }

// Paleta "loja física + online" (conceito 03 aprovado em 11/10/2026, ver
// artifact de referência) — verde de confiança + terracota pro "em breve",
// ao lado do dourado da marca (Logo.tsx), não no lugar dele.
const L_GREEN = '#2f6f4e'
const L_TERRA = '#bd6a3c'
const L_BG = '#f4f6f1'
const L_LINE = '#e1e7dc'

// Faixa "loja física + online": o Guilherme vai abrir loja física também e
// quer o site comunicando isso — endereço/horário sempre visíveis, mais as 4
// linhas de negócio (perfumes, eletrônicos, medicamentos, cosméticos) com peso
// IGUAL na tela, não 2 reais + 2 de rodapé. Honesto em vez de inventar
// produto: Farmácia e Cosméticos (categoria "Estética") estão em ZERO
// produtos ativos agora (conferido no banco em 11/10/2026) — aparecem como
// "Abrindo em breve", tracejado, sem link pra vitrine vazia.
const DEPARTAMENTOS_LOJA = [
  { nome: 'Perfumes', href: '/categoria/perfumes-de-nicho', totalKey: 'perfumes' as const },
  { nome: 'Eletrônicos', href: '/categoria/apple', totalKey: 'eletronicos' as const },
  { nome: 'Medicamentos', href: null, totalKey: null },
  { nome: 'Cosméticos', href: null, totalKey: null },
] as const

export function FaixaLojaFisica({ totalPerfumes, totalEletronicos }: { totalPerfumes: number; totalEletronicos: number }) {
  const totais: Record<string, number> = { perfumes: totalPerfumes, eletronicos: totalEletronicos }
  return (
    <section className="home-only sec-loja-fisica" style={{ background: L_BG, borderBottom: `1px solid ${L_LINE}`, padding: '40px 0 48px' }}>
      <div style={secao}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: L_GREEN, background: 'rgba(47,111,78,0.1)', borderRadius: 99, padding: '8px 16px' }}>
            Compre online, retire na loja
          </div>
          <Link href="/onde-retirar" style={{ fontSize: 13, color: '#525252', textDecoration: 'none', fontWeight: 600 }}>
            Shopping Internacional, loja 17 · Seg–Sáb 07h–16h →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {DEPARTAMENTOS_LOJA.map(d => {
            const disponivel = d.href !== null
            const total = d.totalKey ? totais[d.totalKey] : null
            const conteudo = (
              <>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0a0a0a' }}>{d.nome}</h3>
                <span style={{ ...mono, fontSize: 12.5, color: disponivel ? '#737373' : L_TERRA, fontWeight: 700 }}>
                  {disponivel ? `${total} produtos` : 'Abrindo em breve'}
                </span>
              </>
            )
            return disponivel ? (
              <a key={d.nome} href={d.href} style={{ background: '#fff', border: `1px solid ${L_LINE}`, borderRadius: 14, padding: '20px', textDecoration: 'none' }}>{conteudo}</a>
            ) : (
              <div key={d.nome} style={{ border: `1.5px dashed ${L_LINE}`, borderRadius: 14, padding: '20px' }}>{conteudo}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// Vitrine por departamento — substitui o grid genérico "Destaques" que
// misturava perfume com celular na mesma grade sem contexto nenhum. Reusa o
// card já redesenhado da página de categoria, não inventa card novo só pra
// home; usada 2x (Perfumes e Eletrônicos) com os mesmos 8 produtos reais que
// já alimentam as miniaturas do Catálogo.
export function VitrineDepartamento({ titulo, subtitulo, href, hrefLabel, produtos }: {
  titulo: string; subtitulo: string; href: string; hrefLabel: string; produtos: DestaqueProduto[]
}) {
  if (!produtos.length) return null
  return (
    <section className="home-only sec-vitrine" style={{ background: '#fff', borderBottom: '1px solid #ececec', padding: '56px 0' }}>
      <div style={secao}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 28 }}>
          <div>
            <h2 style={h2}>{titulo}</h2>
            <p style={sub}>{subtitulo}</p>
          </div>
          <Link href={href} style={{ fontSize: 13.5, fontWeight: 800, color: L_GREEN, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {hrefLabel} →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {produtos.map(p => <CategoriaProductCard key={p.id} p={p} menorPrecoAtacado={p.menorPrecoAtacado ?? null} />)}
        </div>
      </div>
    </section>
  )
}

// Carrossel textual de marcas (fallback (b) do redesign Ponte de Fronteira):
// auditoria no banco em 11/10/2026 não achou NENHUMA imagem de marca em
// nenhuma tabela — nem products.brand (texto livre, 111 marcas distintas
// entre os 661 produtos ativos), nem a tabela `marcas` (34 linhas, só
// id/nome/created_at, sem coluna de logo). Construir um carrossel de <img>
// com placeholder genérico pra essas marcas repetiria o carrossel "capenga"
// do projeto irmão. Nome + contagem real é honesto com o que o banco tem
// hoje; a imagem entra depois, se/quando existir campo pra ela.
export function MarcasCarrossel({ marcas }: { marcas: { nome: string; total: number }[] }) {
  if (marcas.length < 2) return null
  const destaque = marcas.slice(0, 30)
  return (
    <section className="home-only sec-marcas" style={{ background: '#fff', borderBottom: '1px solid #ececec', padding: '40px 0' }}>
      <div style={secao}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ ...h2, fontSize: 20 }}>Marcas</h2>
            <p style={{ ...sub, marginTop: 4 }}>Mais de {marcas.length} marcas disponíveis, direto da importadora.</p>
          </div>
          <Link href="/produtos" style={{ fontSize: 13, fontWeight: 800, color: GOLD_TEXT, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Ver todas as marcas →
          </Link>
        </div>
        <div className="marcas-scroll" style={{ display: 'flex', gap: 8, marginTop: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {destaque.map(m => (
            <a key={m.nome} href={`/produtos?marca=${encodeURIComponent(m.nome)}`} className="marca-pill"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#404040', background: '#fafafa', border: '1px solid #ececec', borderRadius: 99, padding: '9px 16px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {m.nome} <span style={{ color: '#a3a3a3', fontWeight: 600 }}>{m.total}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// Substitui "Compre por categoria" + "Departamentos", que mostravam a mesma
// taxonomia duas vezes. Vira linha de documento comercial, não card de landing:
// nome+contagem, descrição, marcas, miniaturas reais do estoque e o link.
// Ordem por tamanho REAL do catálogo (Perfumes é o maior, de longe) — tratar
// os 3 departamentos como iguais seria hierarquia falsa.
export function Catalogo({ cards }: { cards: DeptCard[] }) {
  if (!cards.length) return null
  return (
    <section className="home-only sec-catalogo" style={{ background: '#fafafa', borderBottom: '1px solid #ececec', padding: '64px 0' }}>
      <div style={secao}>
        <h2 style={h2}>Catálogo</h2>
        <p style={sub}>Linhas comerciais diretas da importadora.</p>
        <div style={{ marginTop: 32, borderTop: '1px solid #ececec' }}>
          {cards.map(d => (
            <div key={d.slug} style={{ borderBottom: '1px solid #ececec', padding: '28px 0', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: '#0a0a0a', display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  {d.nome} <span style={{ ...mono, fontWeight: 500, fontSize: 14, color: '#a3a3a3' }}>{d.total}</span>
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#525252', lineHeight: 1.5, maxWidth: 480 }}>{d.descricao}</p>
                {d.marcas.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {d.marcas.map(m => (
                      <a key={m.nome} href={`/produtos?marca=${encodeURIComponent(m.nome)}`}
                        style={{ fontSize: 12, fontWeight: 700, color: '#404040', background: '#fff', border: '1px solid #ececec', borderRadius: 99, padding: '5px 11px', textDecoration: 'none' }}>
                        {m.nome} <span style={{ color: '#a3a3a3', fontWeight: 600 }}>{m.qtd}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: '0 0 auto' }}>
                {d.miniaturas.length > 0 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {d.miniaturas.slice(0, 6).map(m => (
                      <div key={m.id} style={{ width: 52, height: 52, borderRadius: 8, background: '#fff', border: '1px solid #ececec', overflow: 'hidden', flexShrink: 0 }}>
                        {m.img && (
                          // eslint-disable-next-line @next/next/no-img-element -- miniatura 52px, next/image exigiria position:relative extra num container já bem pequeno
                          <img src={m.img} alt="" width={52} height={52} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/categoria/${d.slug}`} style={{ fontSize: 13.5, fontWeight: 800, color: GOLD_TEXT, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Ver todos →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const PASSOS = [
  ['Monte seu pedido', 'Preços em R$. Pedido mínimo de R$ 3.000.'],
  ['Pague via PIX', 'Pagamento à vista. Confirmamos em menos de 30 minutos e seu pedido entra na fila de separação.'],
  ['Separação em até 24h úteis', 'Seu pedido é conferido e embalado na fronteira. Avisamos quando estiver pronto.'],
] as const

// Substitui "Como comprar" + "Entrega e retirada" — eram duas seções contando
// a mesma jornada em pedaços. O passo 4 já embute as duas opções de retirada.
// Numeral mono flush-left no lugar da bolinha roxa numerada: lê como condição
// comercial, não como onboarding de app.
export function ComoFunciona() {
  return (
    <section id="como-funciona" className="home-only sec-como-funciona" style={{ background: '#fff', padding: '64px 0' }}>
      <div style={secao}>
        <h2 style={h2}>Como funciona</h2>
        <p style={sub}>Do pedido à retirada, sem intermediário.</p>
        <div className="como-final-grid" style={{ marginTop: 32, paddingTop: 28, borderTop: '1px solid #ececec', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          {PASSOS.map(([titulo, texto], i) => (
            <div key={titulo}>
              <span style={{ ...mono, fontSize: 26, fontWeight: 600, color: GOLD_TEXT }}>{String(i + 1).padStart(2, '0')}</span>
              <h3 style={{ margin: '10px 0 6px', fontSize: 15, fontWeight: 600, color: '#0a0a0a' }}>{titulo}</h3>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: '#525252' }}>{texto}</p>
            </div>
          ))}
          <div>
            <span style={{ ...mono, fontSize: 26, fontWeight: 600, color: GOLD_TEXT }}>04</span>
            <h3 style={{ margin: '10px 0 6px', fontSize: 15, fontWeight: 600, color: '#0a0a0a' }}>Retire seu pedido</h3>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: '#525252' }}>Retire na nossa loja, em Ciudad del Este — sem custo.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Fecha a página sozinha: era CTA solto + banner de WhatsApp, duas chamadas
// competindo. Uma banda só, dark chapado (sem gradiente), a ação de fechar
// (WhatsApp) e a de continuar navegando (catálogo).
export function BandaFinal({ total }: { total?: number }) {
  return (
    <section className="home-only sec-banda-final" style={{ background: DARK, padding: '48px 0' }}>
      <div style={{ ...secao, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 650, color: '#fff', letterSpacing: '-0.01em' }}>
            Negocie direto com o balcão comercial
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.55, color: '#E8D9C0', maxWidth: 440 }}>
            Fale com um atendente em português — resposta em até 12 minutos. Nosso único número é o {WHATSAPP_DISPLAY}.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          {WHATSAPP_ENABLED && (
            <a href={WHATSAPP_HREF} target="_blank" rel="noopener"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 10, background: '#25d366', color: '#06301c', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#06301c"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
              Chamar no WhatsApp
            </a>
          )}
          <Link href="/produtos" style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            Ver catálogo completo{total != null ? ` (${total})` : ''} →
          </Link>
        </div>
      </div>
    </section>
  )
}
