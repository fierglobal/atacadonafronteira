import { Fragment } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

const STATUS_LABEL: Record<string, string> = {
  pendente_pagamento: 'Pendente PIX',
  pago: 'Pago',
  pronto_retirada: 'Pronto p/ Retirada',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
}

type OrderItem = { product_name: string; product_brand: string | null; unit_usd: number; quantity: number; subtotal_usd: number }
type OrderRow = {
  id: string; order_num: string; status: string; total_brl: number; total_usd: number; created_at: string
  customers: { nome: string } | null
  order_items: OrderItem[]
}

export default async function RelatorioPedidos({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams
  const idList = (ids || '').split(',').map(s => s.trim()).filter(Boolean)
  if (idList.length === 0) return notFound()

  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, order_num, status, total_brl, total_usd, created_at, customers(nome), order_items(product_name, product_brand, unit_usd, quantity, subtotal_usd)')
    .in('id', idList)
    .order('created_at', { ascending: true })

  const orders = ((data as unknown as OrderRow[]) || [])
  if (orders.length === 0) return notFound()

  const totalItens = orders.reduce((s, o) => s + o.order_items.reduce((si, i) => si + i.quantity, 0), 0)
  const totalBrl = orders.reduce((s, o) => s + o.total_brl, 0)
  const dataHoje = new Date().toLocaleDateString('pt-BR')
  const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

  return (
    <html lang="pt-BR">
      <head>
        <title>Relatório de Pedidos — Atacado na Fronteira</title>
        <style>{`
          @page { margin: 14mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 28px; max-width: 900px; margin: 0 auto; font-size: 12.5px; line-height: 1.5; }
          h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
          .subtitle { color: #666; font-size: 12px; margin: 0 0 16px; }
          .rule { height: 3px; background: #A965ED; border: none; margin: 0 0 16px; }
          .criterio { background: #FBF4FE; border: 1px solid #E9D2F9; border-radius: 8px; padding: 10px 14px; font-size: 11.5px; color: #444; margin-bottom: 20px; }
          .cards { display: flex; gap: 12px; margin-bottom: 22px; }
          .card { flex: 1; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; }
          .card-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #888; text-transform: uppercase; margin: 0 0 4px; }
          .card-value { font-size: 19px; font-weight: 800; margin: 0; }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #999; }
          td { padding: 7px 10px; vertical-align: top; }
          tr.grupo { break-inside: avoid; }
          tr.cabecalho { break-after: avoid-page; }
          .muted { color: #888; font-size: 10.5px; }
          .totalrow td { border-top: 2px solid #333; padding-top: 10px; font-weight: 800; font-size: 13px; }
          .footer-note { margin-top: 24px; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
          @media print { .no-print { display: none } }
        `}</style>
      </head>
      <body>
        <h1>Relatório de Pedidos</h1>
        <p className="subtitle">Atacado na Fronteira · {orders.length} pedido{orders.length !== 1 ? 's' : ''} selecionado{orders.length !== 1 ? 's' : ''} · gerado em {dataHoje}</p>
        <hr className="rule" />

        <div className="criterio">
          <strong>Critério:</strong> pedidos selecionados manualmente no admin do Atacado na Fronteira. Valores dos produtos em reais (BRL), na taxa aplicada no momento de cada pedido.
        </div>

        <div className="cards">
          <div className="card">
            <p className="card-label">Pedidos</p>
            <p className="card-value">{orders.length}</p>
          </div>
          <div className="card">
            <p className="card-label">Itens (un.)</p>
            <p className="card-value">{totalItens}</p>
          </div>
          <div className="card">
            <p className="card-label">Valor total</p>
            <p className="card-value">{brl(totalBrl)}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Produto</th>
              <th style={{ textAlign: 'right' }}>Qtd</th>
              <th style={{ textAlign: 'right' }}>Unitário</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, idx) => {
              const taxa = o.total_usd > 0 ? o.total_brl / o.total_usd : 0
              const shade = idx % 2 === 0 ? '#fff' : '#FAF7FD'
              return (
                <Fragment key={o.id}>
                  <tr className="grupo cabecalho" style={{ background: shade }}>
                    <td style={{ fontWeight: 800, color: '#A965ED' }}>#{o.order_num}</td>
                    <td style={{ fontWeight: 700 }}>
                      {o.customers?.nome || '—'}
                      <span style={{ marginLeft: 8 }} className="muted">{STATUS_LABEL[o.status] || o.status}</span>
                    </td>
                    <td></td>
                    <td style={{ textAlign: 'right' }} className="muted">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{brl(o.total_brl)}</td>
                  </tr>
                  {o.order_items.map((it, i) => (
                    <tr key={i} className="grupo" style={{ background: shade }}>
                      <td></td>
                      <td>
                        {it.product_name}
                        {it.product_brand && <div className="muted">{it.product_brand}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{brl(it.unit_usd * taxa)}</td>
                      <td style={{ textAlign: 'right' }}>{brl(it.subtotal_usd * taxa)}</td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="totalrow">
              <td colSpan={2}>Total — {orders.length} pedido{orders.length !== 1 ? 's' : ''}</td>
              <td style={{ textAlign: 'right' }}>{totalItens} un.</td>
              <td></td>
              <td style={{ textAlign: 'right' }}>{brl(totalBrl)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="footer-note">Atacado na Fronteira · gerado em {dataHoje} · valores em reais</p>

        <PrintButton />
      </body>
    </html>
  )
}
