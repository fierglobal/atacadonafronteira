// R$ é sempre derivado do usd_price × câmbio vivo (configuracoes.brl_rate),
// nunca lido de uma coluna brl_price gravada — ela existe no banco por motivo
// histórico/de schema, mas fica dessincronizada toda vez que o USD muda sem
// alguém re-salvar o R$ na mesma hora. Pedido explícito do Guilherme
// (12/10/2026): mudar o câmbio geral tem que atualizar a vitrine inteira
// sozinho, sem precisar re-tocar produto por produto. Ponto único de verdade:
// toda tela que mostra preço em R$ do catálogo (nunca pedido já fechado,
// que fica congelado pra sempre) deve passar por aqui.
export const brlFromUsd = (usd: number, rate: number): number => Math.round(Number(usd) * rate * 100) / 100

// Recarimba brl_price/brl_price_promo de um produto já buscado no banco com o
// valor ao vivo — usar logo após toda query a `products` que alimenta tela de
// catálogo (nunca em pedido já fechado, onde o preço fica congelado pra sempre
// em order_items/orders).
export function comBrlAoVivo<T extends { usd_price: number; usd_price_promo?: number | null }>(
  p: T, rate: number,
): T & { brl_price: number; brl_price_promo: number | null } {
  return {
    ...p,
    brl_price: brlFromUsd(p.usd_price, rate),
    brl_price_promo: p.usd_price_promo != null ? brlFromUsd(p.usd_price_promo, rate) : null,
  }
}

// Mesma ideia, pro tier de quantidade (product_price_tiers) — só tem usd_price
// + brl_price, sem campo promo.
export function tierComBrlAoVivo<T extends { usd_price: number }>(t: T, rate: number): T & { brl_price: number } {
  return { ...t, brl_price: brlFromUsd(t.usd_price, rate) }
}

export type ProdutoPromo = { usd_price: number; usd_price_promo?: number | null; badges?: string[] | null }

export const isPromo = (p: ProdutoPromo) =>
  p.usd_price_promo != null && Number(p.usd_price_promo) < Number(p.usd_price)

// Badge "promoção" some automático quando usd_price_promo tá ativo, em vez de
// depender de alguém lembrar de marcar o produto manualmente — usado na home,
// PDP e categoria pra não ter promo sem badge em nenhuma tela.
export function effectiveBadges(p: ProdutoPromo): string[] {
  const base = (p.badges ?? []).slice()
  if (isPromo(p) && !base.some(b => b.toLowerCase().includes('promo'))) base.unshift('promoção')
  return base
}

// Produto de pré-venda que ainda não foi lançado: entra na vitrine só como chamada, sem preço e
// sem compra. Anunciar preço ou deixar adicionar ao carrinho prometeria algo que não dá pra
// entregar — o aparelho não existe.
//
// Ponto único de verdade de propósito: no Expresso Paraguai a mesma mudança foi feita tirando o
// preço da página do produto e do card, e ele continuou aparecendo em mais quatro lugares (bloco
// da home, megamenu, "mais procurados" e o JSON-LD que ia pro Google). Aqui o preço é renderizado
// em seis telas — toda uma delas deve perguntar por esta função, nunca checar o badge na mão.
export const isEmBreve = (p: ProdutoPromo) =>
  (p.badges ?? []).some(b => {
    const s = b.toLowerCase()
    return s.includes('pré-venda') || s.includes('pre-venda') || s.includes('em breve')
  })

export const ROTULO_EM_BREVE = 'EM BREVE'

export function nomeSemMarca(name: string, brand?: string | null): string {
  if (!brand) return name
  const b = brand.trim()
  return name.toLowerCase().startsWith(b.toLowerCase() + ' ') ? name.slice(b.length).trim() : name
}

// "- PRÉ-VENDA"/"- EM BREVE" cru no nome duplica o que a badge/status já diz — e
// nos produtos "sob encomenda" (compráveis, só com prazo maior) o sufixo é
// literalmente enganoso, porque não bloqueiam compra como isEmBreve bloqueia.
export function nomeSemSufixoStatus(name: string): string {
  return name.replace(/\s*-\s*(PR[ÉE]-VENDA|EM BREVE)\s*$/i, '').trim()
}

export type AtributosIphone = { modelo: string; linha: 'Pro Max' | 'Pro' | null }

// Deriva modelo (14/15/16/17/17e/18) e linha (Pro/Pro Max) direto do nome —
// os dois esquemas de nome em uso ("Apple iPhone 18 Pro Max 512GB Black" e
// "iPhone 17 Pro 256GB Silver (EUA) Celular") sempre têm "iPhone <dígitos>[e]"
// logo no início do modelo, então não precisa de um atributo manual no banco
// pra funcionar como filtro — confirmado contra os nomes reais em produção.
const IPHONE_MODELO_RE = /iPhone\s+(1[4-8])(e)?\b/i

export function extrairAtributosIphone(nome: string): AtributosIphone | null {
  const m = nome.match(IPHONE_MODELO_RE)
  if (!m) return null
  const modelo = m[1] + (m[2] ? 'e' : '')
  const linha = /pro\s*max/i.test(nome) ? 'Pro Max' : /\bpro\b/i.test(nome) ? 'Pro' : null
  return { modelo, linha }
}

export type StatusDisponibilidade = 'em_breve' | 'sob_encomenda' | 'esgotado' | 'pronta_entrega'

export function statusDisponibilidade(p: ProdutoPromo & { estoque: number }): StatusDisponibilidade {
  if (isEmBreve(p)) return 'em_breve'
  if ((p.badges ?? []).some(b => b.trim().toLowerCase() === 'sob encomenda')) return 'sob_encomenda'
  if (p.estoque === 0) return 'esgotado'
  return 'pronta_entrega'
}
