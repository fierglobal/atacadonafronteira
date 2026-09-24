export type Tier = { qty_min: number; qty_max: number | null; brl_price: number }

// Mesma regra usada na PDP para escolher o preço unitário pela quantidade —
// vive aqui para o servidor (checkout, cotação de retirada) usar exatamente a
// mesma lógica que a tela mostrou, em vez de confiar no preço que veio do
// carrinho do navegador.
export function priceForQty(qty: number, basePrice: number, tiers: Tier[] | undefined): number {
  if (!tiers || tiers.length === 0) return basePrice
  const sorted = [...tiers].sort((a, b) => b.qty_min - a.qty_min)
  const t = sorted.find(x => qty >= x.qty_min && (x.qty_max == null || qty <= x.qty_max))
  return t ? Number(t.brl_price) : basePrice
}

// Sem tier cadastrado pro produto, não mostra nada — fallback gracioso.
export function progressoTier(qty: number, tiers: Tier[] | undefined) {
  if (!tiers || tiers.length === 0) return null
  const sorted = [...tiers].sort((a, b) => a.qty_min - b.qty_min)
  const proximo = sorted.find(t => qty < t.qty_min)
  if (!proximo) {
    const ultimo = sorted[sorted.length - 1]
    return { faltam: 0, precoAlvo: Number(ultimo.brl_price), pct: 100, atingiu: true }
  }
  const anterior = [...sorted].reverse().find(t => t.qty_min <= qty)
  const baseQty = anterior ? anterior.qty_min : 0
  const pct = Math.min(100, ((qty - baseQty) / (proximo.qty_min - baseQty)) * 100)
  return { faltam: proximo.qty_min - qty, precoAlvo: Number(proximo.brl_price), pct, atingiu: false }
}
