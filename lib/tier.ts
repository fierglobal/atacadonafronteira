export type Tier = { qty_min: number; qty_max: number | null; brl_price: number }

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
