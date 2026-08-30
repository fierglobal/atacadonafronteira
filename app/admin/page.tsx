import { supabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`
const fmtK = (n: number) => n >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : fmt(n)

const STATUS_LABEL: Record<string, string> = {
  pendente_pagamento: 'Pend. PIX', pago: 'Pago',
  pronto_retirada: 'Pronto p/ Ret.', retirado: 'Retirado', cancelado: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  pendente_pagamento: '#f59e0b', pago: '#3b82f6',
  pronto_retirada: '#A965ED', retirado: '#555', cancelado: '#ef4444',
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 80, H = 28
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * W},${H - (v / max) * H}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  )
}

function AreaChart({ data, labels }: { data: number[]; labels: string[] }) {
  const W = 900, H = 160, PT = 12, PB = 28
  const ah = H - PT - PB
  const max = Math.max(...data, 1)

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: PT + ah - (v / max) * ah,
  }))

  const linePath = pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    const prev = pts[i - 1]
    const cx = ((prev.x + p.x) / 2).toFixed(1)
    return `C ${cx} ${prev.y.toFixed(1)} ${cx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }).join(' ')

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${PT + ah} L 0 ${PT + ah} Z`

  const gridYs = [0.25, 0.5, 0.75, 1].map(t => ({ y: (PT + ah - t * ah).toFixed(1), val: fmtK(max * t) }))

  const labelStep = Math.ceil(data.length / 6)
  const xLabels = labels.filter((_, i) => i % labelStep === 0 || i === labels.length - 1)
    .map((l, i, arr) => ({ label: l, x: ((arr.indexOf(l) === arr.length - 1 ? labels.length - 1 : labels.indexOf(l)) / (data.length - 1)) * W }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A965ED" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#A965ED" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridYs.map(g => (
        <line key={g.y} x1="0" y1={g.y} x2={W} y2={g.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <path d={areaPath} fill="url(#areag)" />
      <path d={linePath} fill="none" stroke="#A965ED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 6} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.28)" fontFamily="system-ui">
          {l.label}
        </text>
      ))}
    </svg>
  )
}

async function getData() {
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [{ data: allOrders }, { data: customers }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, status, total_brl, total_usd, created_at, customers(nome), order_items(product_name, quantity, subtotal_usd)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('customers').select('id, created_at'),
  ])

  const orders = allOrders || []
  const custs = customers || []

  const active = orders.filter(o => o.status !== 'cancelado')
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today)
  const todayActive = active.filter(o => new Date(o.created_at) >= today)
  const yesterdayActive = active.filter(o => new Date(o.created_at) >= yesterday && new Date(o.created_at) < today)
  const todayNewCusts = custs.filter(c => new Date(c.created_at) >= today).length

  const todayRevenue = todayActive.reduce((s, o) => s + o.total_brl, 0)
  const yesterdayRevenue = yesterdayActive.reduce((s, o) => s + o.total_brl, 0)
  const todayOrderCount = todayOrders.length
  const yesterdayOrderCount = orders.filter(o => new Date(o.created_at) >= yesterday && new Date(o.created_at) < today).length

  // Revenue by day (last 30)
  const dayMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    dayMap[d.toISOString().slice(0, 10)] = 0
  }
  active.filter(o => new Date(o.created_at) >= thirtyDaysAgo).forEach(o => {
    const day = new Date(o.created_at).toISOString().slice(0, 10)
    if (day in dayMap) dayMap[day] = (dayMap[day] || 0) + o.total_brl
  })
  const revenueByDay = Object.entries(dayMap).map(([day, value]) => ({
    day: new Date(day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    value,
  }))
  const sparkline30 = Object.values(dayMap)

  // Last 7 days for sparklines
  const spark7 = (fn: (o: typeof orders[0]) => boolean) => {
    const r: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      r.push(orders.filter(o => fn(o) && new Date(o.created_at) >= d && new Date(o.created_at) < next).length)
    }
    return r
  }
  const revenueSparkline = (() => {
    const r: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      r.push(active.filter(o => new Date(o.created_at) >= d && new Date(o.created_at) < next).reduce((s, o) => s + o.total_brl, 0))
    }
    return r
  })()

  // Status breakdown
  const statusCount: Record<string, number> = {}
  orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1 })

  // Top products (from non-cancelled orders)
  const prodMap: Record<string, { name: string; brl: number; qty: number }> = {}
  active.forEach(o => {
    // Taxa travada neste pedido, não uma constante: assim o ranking soma exatamente
    // o totalRevenue (que já vem de total_brl) e um pedido antigo não é reavaliado
    // pelo câmbio de hoje. Era 5.20 fixo, então o ranking ficava abaixo do total.
    const taxa = o.total_usd > 0 ? o.total_brl / o.total_usd : 0
    ;(o.order_items || []).forEach((item: any) => {
      const k = item.product_name
      if (!prodMap[k]) prodMap[k] = { name: k, brl: 0, qty: 0 }
      prodMap[k].brl += (item.subtotal_usd || 0) * taxa
      prodMap[k].qty += item.quantity || 0
    })
  })
  const topProducts = Object.values(prodMap).sort((a, b) => b.brl - a.brl).slice(0, 5)

  return {
    todayRevenue, yesterdayRevenue, todayOrderCount, yesterdayOrderCount,
    pendingPIX: orders.filter(o => o.status === 'pendente_pagamento').length,
    totalCustomers: custs.length, todayNewCusts,
    totalRevenue: active.reduce((s, o) => s + o.total_brl, 0),
    revenueByDay, sparkline30, revenueSparkline,
    orderSparkline: spark7(o => true),
    statusCount,
    topProducts,
    recentOrders: orders.slice(0, 6),
  }
}

function delta(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? { pct: 100, up: true } : null
  const pct = ((curr - prev) / prev) * 100
  return { pct: Math.abs(pct), up: pct >= 0 }
}

export default async function AdminDashboard() {
  const d = await getData()
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const revDelta = delta(d.todayRevenue, d.yesterdayRevenue)
  const ordDelta = delta(d.todayOrderCount, d.yesterdayOrderCount)

  const statusOrder = ['pendente_pagamento', 'pago', 'pronto_retirada', 'retirado', 'cancelado']
  const totalOrders = Object.values(d.statusCount).reduce((s, n) => s + n, 0)
  const topProdMax = d.topProducts[0]?.brl || 1

  return (
    <div className="dash-page" style={{ padding: '28px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 900px) {
          .dash-page { padding: 16px !important; }
          .dash-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-charts, .dash-bottom { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .dash-kpis { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 12, marginTop: 4, textTransform: 'capitalize' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/admin/pedidos" style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: '1px solid var(--a-border)', background: 'transparent', color: 'var(--a-text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
            Ver Pedidos
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dash-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>

        {/* Receita Hoje */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 12px' }}>RECEITA HOJE</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#A965ED', margin: 0 }}>{fmtK(d.todayRevenue)}</p>
            {revDelta && (
              <span style={{ fontSize: 11, fontWeight: 800, color: revDelta.up ? '#A965ED' : '#ef4444', background: revDelta.up ? 'rgba(169, 101, 237,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                {revDelta.up ? '↑' : '↓'} {revDelta.pct.toFixed(0)}%
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '0 0 10px' }}>ontem {fmtK(d.yesterdayRevenue)}</p>
          <Sparkline data={d.revenueSparkline} color="#A965ED" />
        </div>

        {/* Pedidos Hoje */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 12px' }}>PEDIDOS HOJE</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: '#A965ED', margin: 0 }}>{d.todayOrderCount}</p>
            {ordDelta && (
              <span style={{ fontSize: 11, fontWeight: 800, color: ordDelta.up ? '#A965ED' : '#ef4444', background: ordDelta.up ? 'rgba(169, 101, 237,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                {ordDelta.up ? '↑' : '↓'} {ordDelta.pct.toFixed(0)}%
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '0 0 10px' }}>ontem {d.yesterdayOrderCount} pedidos</p>
          <Sparkline data={d.orderSparkline} color="#A965ED" />
        </div>

        {/* PIX Pendente */}
        <div style={{ border: `1px solid ${d.pendingPIX > 0 ? 'rgba(245,158,11,0.4)' : 'var(--a-border)'}`, borderRadius: 12, padding: '18px 20px', background: d.pendingPIX > 0 ? 'rgba(245,158,11,0.04)' : 'var(--a-surface)' } as any}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 12px' }}>AGUARDANDO PIX</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: d.pendingPIX > 0 ? '#f59e0b' : 'var(--a-text3)', margin: 0 }}>{d.pendingPIX}</p>
            {d.pendingPIX > 0 && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b', flexShrink: 0 }} />
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0 }}>
            {d.pendingPIX > 0 ? `${d.pendingPIX} pedido${d.pendingPIX !== 1 ? 's' : ''} aguardando confirmação` : 'Nenhum pendente'}
          </p>
          <a href="/admin/pedidos" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f59e0b', textDecoration: 'none', fontWeight: 700, marginTop: 12 }}>
            Ver pedidos →
          </a>
        </div>

        {/* Clientes */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 12px' }}>CLIENTES</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#A965ED', margin: '0 0 8px' }}>{d.totalCustomers}</p>
          <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: 0 }}>
            {d.todayNewCusts > 0
              ? <span style={{ color: '#A965ED', fontWeight: 700 }}>+{d.todayNewCusts} hoje</span>
              : 'cadastrados'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--a-text3)', marginTop: 10 }}>
            Receita total: <span style={{ color: 'var(--a-text2)', fontWeight: 700 }}>{fmtK(d.totalRevenue)}</span>
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="dash-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>

        {/* Area chart */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Receita</p>
              <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '2px 0 0' }}>Últimos 30 dias</p>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#A965ED' }}>{fmtK(d.sparkline30.reduce((a, b) => a + b, 0))}</span>
          </div>
          <div style={{ padding: '0 0 0 0' }}>
            <AreaChart data={d.revenueByDay.map(r => r.value)} labels={d.revenueByDay.map(r => r.day)} />
          </div>
        </div>

        {/* Status breakdown */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Por status</p>
          <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '0 0 18px' }}>{totalOrders} pedidos total</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {statusOrder.filter(s => (d.statusCount[s] || 0) > 0).map(s => {
              const count = d.statusCount[s] || 0
              const pct = totalOrders > 0 ? (count / totalOrders * 100) : 0
              const color = STATUS_COLOR[s] || '#555'
              return (
                <div key={s}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--a-text2)', fontWeight: 600 }}>{STATUS_LABEL[s]}</span>
                    <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{count} · {pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--a-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease', boxShadow: `0 0 6px ${color}60` }} />
                  </div>
                </div>
              )
            })}
            {totalOrders === 0 && <p style={{ fontSize: 13, color: 'var(--a-text3)', textAlign: 'center', margin: '20px 0' }}>Sem pedidos ainda</p>}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="dash-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Top produtos */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Top Produtos</p>
            <a href="/admin/produtos" style={{ fontSize: 11, color: '#A965ED', textDecoration: 'none', fontWeight: 700 }}>Ver todos →</a>
          </div>
          {d.topProducts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--a-text3)', textAlign: 'center', margin: '20px 0' }}>Sem vendas ainda</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {d.topProducts.map((p, i) => (
                <div key={p.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: i === 0 ? '#A965ED' : 'var(--a-text3)', minWidth: 16 }}>#{i + 1}</span>
                    <span style={{ fontSize: 12, color: 'var(--a-text)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#A965ED', whiteSpace: 'nowrap' }}>{fmtK(p.brl)}</span>
                    <span style={{ fontSize: 10, color: 'var(--a-text3)', minWidth: 28, textAlign: 'right' }}>×{p.qty}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--a-border)', borderRadius: 99, marginLeft: 26 }}>
                    <div style={{ height: '100%', width: `${(p.brl / topProdMax) * 100}%`, background: i === 0 ? '#A965ED' : 'var(--a-text3)', borderRadius: 99, opacity: i === 0 ? 1 : 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos recentes */}
        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--a-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Pedidos Recentes</p>
            <a href="/admin/pedidos" style={{ fontSize: 11, color: '#A965ED', textDecoration: 'none', fontWeight: 700 }}>Ver todos →</a>
          </div>
          {d.recentOrders.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--a-text3)', textAlign: 'center', padding: '32px 20px' }}>Nenhum pedido ainda</p>
          ) : (
            <div>
              {d.recentOrders.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < d.recentOrders.length - 1 ? '1px solid var(--a-border)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#A965ED' }}>{(o as any).order_num}</span>
                      <span style={{ fontSize: 11, color: 'var(--a-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(o as any).customers?.nome || '—'}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--a-text3)' }}>
                      {new Date(o.created_at).toLocaleDateString('pt-BR')} · {new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-text)', margin: '0 0 3px' }}>{fmt(o.total_brl)}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[o.status] || '#888', background: `${STATUS_COLOR[o.status] || '#888'}15`, padding: '2px 7px', borderRadius: 4, border: `1px solid ${STATUS_COLOR[o.status] || '#888'}25`, whiteSpace: 'nowrap' }}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
