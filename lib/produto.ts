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
