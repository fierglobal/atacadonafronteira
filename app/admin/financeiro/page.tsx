import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`
const fmtUSD = (n: number) => `USD ${n.toFixed(2)}`

async function getData() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('status, total_brl, total_usd, created_at')
    .order('created_at', { ascending: false })
  return orders || []
}

export default async function Financeiro() {
  const orders = await getData()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const mesAtual = orders.filter(o => new Date(o.created_at) >= startOfMonth)
  const mesAnterior = orders.filter(o => {
    const d = new Date(o.created_at)
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return d >= start && d < end
  })

  const confirmados = (list: typeof orders) => list.filter(o => ['pago', 'pronto_retirada', 'retirado'].includes(o.status))
  const pendentes = (list: typeof orders) => list.filter(o => o.status === 'pendente_pagamento')
  const cancelados = (list: typeof orders) => list.filter(o => o.status === 'cancelado')

  const sumBRL = (list: typeof orders) => list.reduce((s, o) => s + o.total_brl, 0)
  const sumUSD = (list: typeof orders) => list.reduce((s, o) => s + o.total_usd, 0)

  const cards = [
    { label: 'Confirmado — Mês Atual', brl: sumBRL(confirmados(mesAtual)), usd: sumUSD(confirmados(mesAtual)), color: '#A965ED' },
    { label: 'Pendente PIX — Mês Atual', brl: sumBRL(pendentes(mesAtual)), usd: sumUSD(pendentes(mesAtual)), color: '#f59e0b' },
    { label: 'Confirmado — Mês Anterior', brl: sumBRL(confirmados(mesAnterior)), usd: sumUSD(confirmados(mesAnterior)), color: '#A965ED' },
    { label: 'Cancelado — Mês Atual', brl: sumBRL(cancelados(mesAtual)), usd: sumUSD(cancelados(mesAtual)), color: '#ef4444' },
  ]

  // Daily breakdown (last 14 days)
  const days: Record<string, { confirmado: number; pendente: number }> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    days[key] = { confirmado: 0, pendente: 0 }
  }
  orders.forEach(o => {
    const key = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    if (!days[key]) return
    if (['pago', 'pronto_retirada', 'retirado'].includes(o.status)) days[key].confirmado += o.total_brl
    else if (o.status === 'pendente_pagamento') days[key].pendente += o.total_brl
  })

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Financeiro</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>Pagamentos PIX</p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: '20px 24px' }}>
            <p style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 12 }}>{c.label.toUpperCase()}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: c.color, margin: '0 0 4px' }}>{fmt(c.brl)}</p>
            <p style={{ fontSize: 12, color: 'var(--a-text3)', margin: 0 }}>{fmtUSD(c.usd)}</p>
          </div>
        ))}
      </div>

      {/* Daily table */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--a-border)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Últimos 14 dias</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Data', 'Confirmado (BRL)', 'Pendente (BRL)'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(days).reverse().map(([day, vals]) => (
              <tr key={day} style={{ borderBottom: '1px solid var(--a-surface)' }}>
                <td style={{ padding: '11px 20px', fontSize: 12, color: 'var(--a-text2)' }}>{day}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: vals.confirmado > 0 ? 700 : 400, color: vals.confirmado > 0 ? '#A965ED' : 'var(--a-text3)' }}>
                  {vals.confirmado > 0 ? fmt(vals.confirmado) : '—'}
                </td>
                <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: vals.pendente > 0 ? 700 : 400, color: vals.pendente > 0 ? '#f59e0b' : 'var(--a-text3)' }}>
                  {vals.pendente > 0 ? fmt(vals.pendente) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
