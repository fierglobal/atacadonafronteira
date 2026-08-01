type Order = { status: string; total_brl: number; created_at: string }

const PAGOS = new Set(['pago', 'pronto_retirada', 'retirado'])

export type RFM = {
  recencia_dias: number | null
  frequencia: number
  monetario: number
  score: number
  segmento: 'champion' | 'leal' | 'potencial' | 'novo' | 'em_risco' | 'perdido' | 'sem_compra'
}

export function calcRFM(orders: Order[] | null | undefined): RFM {
  const pagos = (orders || []).filter(o => PAGOS.has(o.status))
  const frequencia = pagos.length
  const monetario = pagos.reduce((s, o) => s + (o.total_brl || 0), 0)
  if (frequencia === 0) {
    return { recencia_dias: null, frequencia: 0, monetario: 0, score: 0, segmento: 'sem_compra' }
  }
  const ultimaData = Math.max(...pagos.map(o => new Date(o.created_at).getTime()))
  const recencia_dias = Math.floor((Date.now() - ultimaData) / 86_400_000)

  const r = recencia_dias <= 30 ? 5 : recencia_dias <= 90 ? 4 : recencia_dias <= 180 ? 3 : recencia_dias <= 365 ? 2 : 1
  const f = frequencia >= 10 ? 5 : frequencia >= 5 ? 4 : frequencia >= 3 ? 3 : frequencia >= 2 ? 2 : 1
  const m = monetario >= 10000 ? 5 : monetario >= 5000 ? 4 : monetario >= 2000 ? 3 : monetario >= 500 ? 2 : 1
  const score = +(((r + f + m) / 3)).toFixed(1)

  let segmento: RFM['segmento']
  if (r >= 4 && f >= 4 && m >= 4) segmento = 'champion'
  else if (r >= 4 && f >= 3) segmento = 'leal'
  else if (r >= 4) segmento = 'potencial'
  else if (frequencia === 1 && recencia_dias <= 60) segmento = 'novo'
  else if (r <= 2 && f >= 3) segmento = 'em_risco'
  else segmento = 'perdido'

  return { recencia_dias, frequencia, monetario, score, segmento }
}
