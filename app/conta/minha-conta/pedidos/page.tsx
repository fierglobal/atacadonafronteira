'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase-client'

type Order = { id: string; order_num: string; status: string; total_brl: number; created_at: string }

const STATUS_LABEL: Record<string, string> = {
  pendente_pagamento: 'Aguardando PIX',
  pago: 'Pago',
  pronto_retirada: 'Pronto p/ Retirada',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  pendente_pagamento: '#f59e0b', pago: '#3b82f6', pronto_retirada: '#9D7133', retirado: '#737373', cancelado: '#ef4444',
}
const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function MeusPedidos() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) { router.replace('/conta/login'); return }
      const { data } = await supabase
        .from('orders')
        .select('id, order_num, status, total_brl, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    })
  }, [router])

  if (loading) return <div style={{ minHeight: 200 }} />

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8, marginTop: 0, color: '#0a0a0a', textTransform: 'uppercase' }}>Meus Pedidos</h1>
      <p style={{ fontSize: 14, color: '#737373', marginBottom: 40 }}>Acompanhe o status dos seus pedidos.</p>

      {orders.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 24, padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ color: '#737373', fontSize: 14, marginBottom: 16 }}>Nenhum pedido ainda.</p>
          <Link href="/" style={{ color: '#9D7133', fontWeight: 900, fontSize: 13, textDecoration: 'none' }}>Ver catálogo →</Link>
        </div>
      ) : (
        <>
          <style>{`
            @media (max-width: 600px) {
              .pedidos-table-wrap { display: none !important; }
              .pedidos-cards { display: flex !important; }
            }
            .pedidos-cards { display: none; }
          `}</style>
          {/* Table — desktop */}
          <div className="pedidos-table-wrap" style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ececec', background: '#fafafa' }}>
                  {['Pedido', 'Total', 'Status', 'Data', ''].map((h, i) => (
                    <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: 10, color: '#737373', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}
                    onClick={() => router.push(`/conta/minha-conta/pedidos/${o.id}`)}
                    style={{ borderBottom: '1px solid #ececec', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '16px 24px', fontSize: 13, color: '#9D7133', fontWeight: 900 }}>{o.order_num}</td>
                    <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 900, color: '#0a0a0a' }}>{fmt(o.total_brl)}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: STATUS_COLOR[o.status] || '#737373', background: `${STATUS_COLOR[o.status] || '#737373'}14`, padding: '4px 10px', borderRadius: 6, border: `1px solid ${STATUS_COLOR[o.status] || '#737373'}30` }}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 12, color: '#737373' }}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '16px 24px', fontSize: 13, color: '#a3a3a3' }}>→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards — mobile */}
          <div className="pedidos-cards" style={{ flexDirection: 'column', gap: 12 }}>
            {orders.map(o => (
              <div key={o.id}
                onClick={() => router.push(`/conta/minha-conta/pedidos/${o.id}`)}
                style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: 18, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#9D7133' }}>{o.order_num}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#0a0a0a' }}>{fmt(o.total_brl)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: STATUS_COLOR[o.status] || '#737373', background: `${STATUS_COLOR[o.status] || '#737373'}14`, padding: '4px 10px', borderRadius: 6, border: `1px solid ${STATUS_COLOR[o.status] || '#737373'}30` }}>
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                  <span style={{ fontSize: 11, color: '#737373' }}>{new Date(o.created_at).toLocaleDateString('pt-BR')} →</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
