'use client'
import Link from 'next/link'
import { WHATSAPP_HREF, WHATSAPP_GRUPO_HREF, WHATSAPP_DISPLAY } from '@/lib/site'

// Seções estáticas da home. Vivem fora do HomeClient para não misturar copy de
// conversão com a máquina de filtro/carrossel, mas continuam sendo renderizadas
// no servidor — é daqui que sai quase todo o texto plano que o Google lê, já que
// nome de produto sai ofuscado em base64.

const ROXO = '#420E76'
const AMARELO = '#F6BD0C'

export type DeptCard = {
  nome: string
  slug: string
  total: number
  descricao: string
  marcas: { nome: string; qtd: number }[]
}
export type CatLink = { nome: string; slug: string; total: number; img: string | null }

const secao: React.CSSProperties = { maxWidth: 1280, margin: '0 auto', padding: '0 24px' }
const h2: React.CSSProperties = { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#0a0a0a' }
const sub: React.CSSProperties = { margin: '6px 0 0', color: '#737373', fontSize: 14 }

export function Hero({ eletronicos, farmacia, total }: { eletronicos: number; farmacia: number; total: number }) {
  return (
    <section className="home-only sec-hero" style={{ background: '#fff', borderBottom: '1px solid #ececec', padding: '56px 0 48px' }}>
      <div style={{ ...secao, maxWidth: 900, textAlign: 'center' }}>
        {/* O h1 É a manchete. Antes existia um parágrafo de palavras-chave
            ocupando a dobra e falando com o Google enquanto o comprador olhava:
            agora é um texto só, servindo aos dois. */}
        <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.08, fontWeight: 900, letterSpacing: '-0.03em', color: ROXO }}>
          Atacado de importados direto do Paraguai
        </h1>
        <p style={{ margin: '18px auto 0', maxWidth: 660, fontSize: 16.5, lineHeight: 1.6, color: '#404040' }}>
          Eletrônicos e linha de farmácia com preço de fronteira, para lojistas, revendedores e
          profissionais da saúde em todo o Brasil. {total} produtos em estoque, pedido mínimo de R$ 1.000.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
          <Link href="/categoria/eletronicos" style={{ padding: '15px 30px', borderRadius: 10, background: AMARELO, color: '#2b0a4e', fontWeight: 900, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 16px rgba(246,189,12,0.3)' }}>
            Ver eletrônicos ({eletronicos})
          </Link>
          <Link href="/categoria/farmacia" style={{ padding: '15px 30px', borderRadius: 10, background: '#fff', color: ROXO, border: `1.5px solid ${ROXO}`, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
            Ver farmácia ({farmacia})
          </Link>
        </div>
        {/* As provas que rolavam no ticker viram texto parado: o mesmo conteúdo,
            legível, sem competir com o CTA por atenção. */}
        <p style={{ margin: '26px 0 0', fontSize: 12.5, color: '#737373', letterSpacing: '0.02em' }}>
          PIX confirmado em menos de 30 min · Resposta no WhatsApp em até 12 min · Atendimento 100% em português
        </p>
      </div>
    </section>
  )
}

const PASSOS = [
  ['Monte seu pedido', 'Preços em dólar, com o total em real na cotação do dia. Pedido mínimo de R$ 1.000.'],
  ['Pague via PIX', 'Pagamento à vista. Confirmamos em menos de 30 minutos e seu pedido entra na fila de separação.'],
  ['Separação em até 24h úteis', 'Seu pedido é conferido e embalado na fronteira. Avisamos quando estiver pronto.'],
  ['Retire ou receba', 'Grátis em Ciudad del Este, R$ 50 por unidade em Foz do Iguaçu (grátis acima de 20) ou envio para todo o Brasil.'],
]

export function ComoComprar() {
  return (
    <section id="como-comprar" className="home-only sec-como" style={{ background: '#fafafa', borderBottom: '1px solid #ececec', padding: '48px 0' }}>
      <div style={secao}>
        <h2 style={h2}>Como comprar no atacado</h2>
        <p style={sub}>Quatro passos, do carrinho à retirada.</p>
        <ol style={{ listStyle: 'none', margin: '28px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
          {PASSOS.map(([titulo, texto], i) => (
            <li key={titulo} style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, padding: '20px 18px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: ROXO, color: '#fff', fontSize: 12.5, fontWeight: 900, marginBottom: 12 }}>{i + 1}</span>
              <h3 style={{ margin: '0 0 6px', fontSize: 14.5, fontWeight: 800, color: '#0a0a0a' }}>{titulo}</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#525252' }}>{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function Departamentos({ cards }: { cards: DeptCard[] }) {
  if (!cards.length) return null
  return (
    <section className="home-only sec-dept" style={{ background: '#fff', borderBottom: '1px solid #ececec', padding: '48px 0' }}>
      <div style={{ ...secao, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        {cards.map(d => (
          <div key={d.slug} style={{ border: '1px solid #ececec', borderRadius: 14, padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: ROXO }}>
                {d.nome} <span style={{ color: '#a3a3a3', fontSize: 14, fontWeight: 600 }}>{d.total} produtos</span>
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: '#525252' }}>{d.descricao}</p>
            </div>
            {/* As marcas que ocupavam uma seção inteira de cartões vazios viram
                chips aqui dentro, cada um filtrando de verdade. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {d.marcas.map(m => (
                <a key={m.nome} href={`/?marca=${encodeURIComponent(m.nome)}#catalogo`}
                  style={{ fontSize: 12, fontWeight: 700, color: '#404040', background: '#fafafa', border: '1px solid #ececec', borderRadius: 99, padding: '5px 11px', textDecoration: 'none' }}>
                  {m.nome} <span style={{ color: '#a3a3a3', fontWeight: 600 }}>{m.qtd}</span>
                </a>
              ))}
            </div>
            <Link href={`/categoria/${d.slug}`} style={{ marginTop: 'auto', alignSelf: 'flex-start', fontSize: 13.5, fontWeight: 800, color: ROXO, textDecoration: 'none' }}>
              Ver {d.nome.toLowerCase()} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Categorias({ cats }: { cats: CatLink[] }) {
  if (!cats.length) return null
  return (
    <section className="home-only sec-cats" style={{ background: '#fafafa', borderBottom: '1px solid #ececec', padding: '48px 0' }}>
      <div style={secao}>
        <h2 style={h2}>Compre por categoria</h2>
        <p style={sub}>{cats.length} categorias · clique para ver o catálogo completo.</p>
        <div className="cats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 24 }}>
          {cats.map(c => (
            <Link key={c.slug} href={`/categoria/${c.slug}`}
              className="cat-card"
              style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#fafafa', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.img
                  ? <img src={c.img} alt="" width={110} height={110} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                  : <span aria-hidden="true" style={{ fontSize: 22, color: '#d4d4d4' }}>▦</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 750, color: '#0a0a0a', lineHeight: 1.3 }}>{c.nome}</span>
              <span style={{ fontSize: 11.5, color: '#a3a3a3', fontWeight: 600 }}>{c.total} produtos</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

const ENTREGAS = [
  ['Retirada em Ciudad del Este', 'Grátis', 'Retire direto na nossa loja, no Paraguai. Leve documento com foto.'],
  ['Retirada em Foz do Iguaçu', 'R$ 50 por unidade', 'Grátis para pedidos acima de 20 unidades.'],
  ['Envio para todo o Brasil', 'Frete calculado no pedido', 'Com seguro opcional: se extraviar no caminho, enviamos outro sem custo.'],
]

export function Entrega() {
  return (
    <section className="home-only sec-entrega" style={{ background: '#fff', borderBottom: '1px solid #ececec', padding: '48px 0' }}>
      <div style={secao}>
        <h2 style={h2}>Entrega e retirada</h2>
        <p style={sub}>Você escolhe no checkout, com o valor já calculado para o seu carrinho.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 24 }}>
          {ENTREGAS.map(([titulo, preco, texto]) => (
            <div key={titulo} style={{ border: '1px solid #ececec', borderRadius: 12, padding: '20px 18px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 800, color: '#0a0a0a' }}>{titulo}</h3>
              <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 800, color: preco === 'Grátis' ? '#0f7a3d' : ROXO }}>{preco}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#525252' }}>{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// O telefone oficial e o grupo saíram do rodízio do hero e viraram bloco fixo:
// continuam na página, sem depender de o cliente esperar o slide certo aparecer.
export function Contato() {
  return (
    <section className="home-only sec-contato" style={{ background: 'linear-gradient(135deg, #2b0a4e 0%, #420E76 55%, #5a1798 100%)', padding: '44px 0' }}>
      <div style={{ ...secao, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 850, color: '#fff', letterSpacing: '-0.02em' }}>
            Prefere fechar pelo WhatsApp?
          </h2>
          <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)', maxWidth: 460 }}>
            Fale com um atendente em português — resposta em até 12 minutos. Tire dúvidas de pedido,
            frete e pagamento antes de fechar.
          </p>
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
            Nosso único número é o {WHATSAPP_DISPLAY}. Desconfie de outros.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href={WHATSAPP_HREF} target="_blank" rel="noopener"
            style={{ padding: '15px 24px', borderRadius: 10, background: '#25d366', color: '#06301c', fontWeight: 900, fontSize: 15, textDecoration: 'none', textAlign: 'center' }}>
            Chamar no WhatsApp · {WHATSAPP_DISPLAY}
          </a>
          <a href={WHATSAPP_GRUPO_HREF} target="_blank" rel="noopener"
            style={{ padding: '13px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
            Entrar no grupo oficial de ofertas
          </a>
        </div>
      </div>
    </section>
  )
}
