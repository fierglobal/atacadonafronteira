import { Fragment } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

type OrderItem = { product_name: string; product_brand: string | null; unit_usd: number; quantity: number; subtotal_usd: number; categoriaNome: string }
type OrderItemRaw = { product_id: string | null; product_name: string; product_brand: string | null; unit_usd: number; quantity: number; subtotal_usd: number; products: { categoria_id: string | null } | null }
type Customer = { nome: string; cpf: string; email: string; telefone: string; cidade: string; uf: string }

export default async function PedidoCopia({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_num, total_usd, total_brl, status, created_at, notas, customer_id')
    .eq('copy_hash', hash)
    .single()
  if (!order) return notFound()

  const [{ data: customer }, { data: items }, config] = await Promise.all([
    supabaseAdmin.from('customers').select('nome, cpf, email, telefone, cidade, uf').eq('id', order.customer_id).single(),
    supabaseAdmin.from('order_items').select('product_id, product_name, product_brand, unit_usd, quantity, subtotal_usd, products(categoria_id)').eq('order_id', order.id),
    getConfig(),
  ])

  const c = (customer as Customer) || { nome: '', cpf: '', email: '', telefone: '', cidade: '', uf: '' }
  const raw = (items as unknown as OrderItemRaw[]) || []

  // products.categoria_id não tem FK formal para categorias — PostgREST recusa o
  // embed aninhado products(categorias(nome)) com PGRST200, resolvido à mão aqui.
  const catIds = [...new Set(raw.map(i => i.products?.categoria_id).filter(Boolean))] as string[]
  const catMap = new Map<string, string>()
  if (catIds.length) {
    const { data: cats } = await supabaseAdmin.from('categorias').select('id, nome').in('id', catIds)
    ;(cats || []).forEach(cat => catMap.set(cat.id, cat.nome))
  }
  const xs: OrderItem[] = raw.map(i => ({
    product_name: i.product_name, product_brand: i.product_brand, unit_usd: i.unit_usd,
    quantity: i.quantity, subtotal_usd: i.subtotal_usd,
    categoriaNome: (i.products?.categoria_id && catMap.get(i.products.categoria_id)) || 'Outros',
  }))
  const totalBRL = order.total_brl || order.total_usd * config.brl_rate
  const dt = new Date(order.created_at).toLocaleString('pt-BR')

  return (
    <html lang="pt-BR">
      <head>
        <title>Pedido {order.order_num} — Atacado na Fronteira</title>
        <style>{`
          @page { margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 24px; max-width: 720px; margin: 0 auto; font-size: 13px; line-height: 1.5; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          h2 { font-size: 13px; text-transform: uppercase; color: #555; margin: 24px 0 8px; letter-spacing: 0.06em; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; padding: 8px 4px; border-bottom: 1px solid #999; }
          td { padding: 8px 4px; border-bottom: 1px solid #eee; vertical-align: top; }
          .right { text-align: right; }
          .muted { color: #888; font-size: 11px; }
          .total { font-size: 18px; font-weight: 700; }
          .badge { display: inline-block; padding: 3px 10px; background: #111; color: #fff; border-radius: 4px; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
          .btn { display: inline-block; padding: 10px 18px; background: #111; color: #fff; border-radius: 4px; text-decoration: none; font-size: 13px; }
          @media print { .no-print { display: none } }
        `}</style>
      </head>
      <body>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1>Atacado na Fronteira</h1>
            <p className="muted">Cópia do pedido</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, margin: 0 }}>Pedido</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>#{order.order_num}</p>
            <p className="muted" style={{ margin: '4px 0 0' }}>{dt}</p>
          </div>
        </div>

        <span className="badge">{order.status}</span>

        <h2>Cliente</h2>
        <table>
          <tbody>
            <tr><td style={{ width: 100, color: '#666' }}>Nome</td><td>{c.nome}</td></tr>
            <tr><td style={{ color: '#666' }}>CPF</td><td>{c.cpf}</td></tr>
            <tr><td style={{ color: '#666' }}>Telefone</td><td>{c.telefone}</td></tr>
            <tr><td style={{ color: '#666' }}>E-mail</td><td>{c.email}</td></tr>
            <tr><td style={{ color: '#666' }}>Cidade</td><td>{c.cidade}/{c.uf}</td></tr>
          </tbody>
        </table>

        <h2>Itens</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="right">Qtd</th>
              <th className="right">Unit. (USD)</th>
              <th className="right">Subtotal (USD)</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const grupos = xs.reduce((acc, it) => {
                ;(acc[it.categoriaNome] ||= []).push(it)
                return acc
              }, {} as Record<string, OrderItem[]>)
              const categorias = Object.keys(grupos).sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b))
              const mostrarGrupos = categorias.length > 1
              return categorias.map(cat => (
                <Fragment key={cat}>
                  {mostrarGrupos && (
                    <tr><td colSpan={4} style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 10 }}>{cat}</td></tr>
                  )}
                  {grupos[cat].map((it, i) => (
                    <tr key={i}>
                      <td>
                        {it.product_name}
                        {it.product_brand && <div className="muted">{it.product_brand}</div>}
                      </td>
                      <td className="right">{it.quantity}</td>
                      <td className="right">${it.unit_usd.toFixed(2)}</td>
                      <td className="right">${it.subtotal_usd.toFixed(2)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))
            })()}
          </tbody>
        </table>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="muted">Total geral</span>
          <span className="total">R$ {totalBRL.toFixed(2).replace('.', ',')}</span>
        </div>
        <p className="muted" style={{ textAlign: 'right', margin: '4px 0 0' }}>USD ${order.total_usd.toFixed(2)} · taxa {config.brl_rate}</p>

        {order.notas && <><h2>Observações</h2><p style={{ whiteSpace: 'pre-wrap' }}>{order.notas}</p></>}

        <PrintButton />

        <p style={{ marginTop: 40, textAlign: 'center', fontSize: 10, color: '#aaa' }}>
          atacadonafronteira.com · documento gerado automaticamente
        </p>
      </body>
    </html>
  )
}
