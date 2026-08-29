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
