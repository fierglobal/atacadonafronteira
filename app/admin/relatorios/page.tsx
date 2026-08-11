import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`
const fmtK = (n: number) => n >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : fmt(n)

async function getData(period: number) {
  const since = new Date()
  since.setDate(since.getDate() - period)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, total_brl, created_at')
    .neq('status', 'cancelado')
    .gte('created_at', period < 9999 ? since.toISOString() : '2000-01-01')

  const orderIds = (orders || []).map(o => o.id)
  if (!orderIds.length) return { items: [], totalBrl: 0, totalOrders: 0 }

  const { data: rawItems } = await supabaseAdmin
    .from('order_items')
    .select('product_name, product_brand, quantity, subtotal_usd, order_id')
    .in('order_id', orderIds)

  const BRL_RATE = 5.20
  const prodMap: Record<string, { name: string; brand: string; qty: number; brl: number; orders: Set<string> }> = {}
  ;(rawItems || []).forEach(i => {
    if (!prodMap[i.product_name]) prodMap[i.product_name] = { name: i.product_name, brand: i.product_brand || '', qty: 0, brl: 0, orders: new Set() }
    prodMap[i.product_name].qty += i.quantity
    prodMap[i.product_name].brl += (i.subtotal_usd || 0) * BRL_RATE
    prodMap[i.product_name].orders.add(i.order_id)
  })

  const items = Object.values(prodMap)
    .map(p => ({ ...p, orders: p.orders.size }))
    .sort((a, b) => b.brl - a.brl)

  const totalBrl = (orders || []).reduce((s, o) => s + o.total_brl, 0)
  return { items, totalBrl, totalOrders: orderIds.length }
}

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams
  const period = parseInt(sp.period || '30')
  const { items, totalBrl, totalOrders } = await getData(period)
  const maxBrl = items[0]?.brl || 1

  const periods = [
    { val: '7', label: '7 dias' },
    { val: '30', label: '30 dias' },
    { val: '90', label: '90 dias' },
    { val: '9999', label: 'Tudo' },
  ]

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Relatório de Produtos</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>{totalOrders} pedidos · receita {fmtK(totalBrl)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {periods.map(p => (
            <a key={p.val} href={`/admin/relatorios?period=${p.val}`}
              style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${period === +p.val ? '#A965ED' : 'var(--a-border)'}`, background: period === +p.val ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: period === +p.val ? '#A965ED' : 'var(--a-text3)', textDecoration: 'none', transition: 'all 0.15s' }}>
              {p.label}
            </a>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--a-text3)' }}>
          <p>Sem vendas no período selecionado</p>
        </div>
      ) : (
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                {['#', 'Produto', 'Marca', 'Qtd', 'Pedidos', 'Receita', 'Share'].map(h => (
                  <th key={h} style={{ padding: '11px 18px', textAlign: h === '#' ? 'center' : 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((p, i) => {
                const pct = totalBrl > 0 ? (p.brl / totalBrl * 100) : 0
                return (
                  <tr key={p.name} style={{ borderBottom: '1px solid var(--a-border)' }}>
                    <td style={{ padding: '13px 18px', textAlign: 'center', fontSize: 11, fontWeight: 900, color: i === 0 ? '#A965ED' : 'var(--a-text3)' }}>#{i + 1}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', margin: 0, maxWidth: 260 }}>{p.name}</p>
                      <div style={{ marginTop: 5, height: 3, background: 'var(--a-border)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${(p.brl / maxBrl) * 100}%`, background: i === 0 ? '#A965ED' : '#3b82f6', borderRadius: 99, opacity: i === 0 ? 1 : 0.6 }} />
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--a-text3)' }}>{p.brand || '—'}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: 'var(--a-text)' }}>{p.qty}</td>
                    <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--a-text3)' }}>{p.orders}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: '#A965ED' }}>{fmtK(p.brl)}</td>
                    <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--a-text3)', whiteSpace: 'nowrap' }}>{pct.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
