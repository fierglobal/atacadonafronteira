'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const STATUS_COLOR: Record<string, string> = {
  pendente_pagamento: '#f59e0b', pago: '#3b82f6',
  pronto_retirada: '#A965ED', retirado: '#555', cancelado: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  pendente_pagamento: 'Pend. PIX', pago: 'Pago',
  pronto_retirada: 'Pronto', retirado: 'Retirado', cancelado: 'Cancelado',
}

function BuscaConteudo() {
  const params = useSearchParams()
  const q = params.get('q') || ''
  const [results, setResults] = useState<{ orders: any[]; customers: any[]; products: any[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const buscar = useCallback(async (termo: string) => {
    if (!termo.trim()) return
    setLoading(true)
    const r = await fetch(`/api/admin/busca?q=${encodeURIComponent(termo)}`).then(r => r.json()).catch(() => ({ orders: [], customers: [], products: [] }))
    setResults(r)
    setLoading(false)
  }, [])

  useEffect(() => { if (q) buscar(q) }, [q, buscar])

  const total = (results?.orders.length || 0) + (results?.customers.length || 0) + (results?.products.length || 0)

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Busca Global</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>
          {loading ? 'Buscando...' : q ? `${total} resultado${total !== 1 ? 's' : ''} para "${q}"` : 'Digite algo na barra de busca'}
        </p>
      </div>

      {results && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Pedidos */}
          {results.orders.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--a-text3)', letterSpacing: '0.1em', marginBottom: 10 }}>PEDIDOS ({results.orders.length})</p>
              <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden' }}>
                {results.orders.map((o: any, i: number) => (
                  <a key={o.id} href="/admin/pedidos"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < results.orders.length - 1 ? '1px solid var(--a-border)' : 'none', textDecoration: 'none', color: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-border)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#A965ED', minWidth: 80 }}>{o.order_num}</span>
                    <span style={{ fontSize: 12, color: 'var(--a-text)', flex: 1 }}>{o.customers?.nome || '—'}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-text)' }}>R$ {o.total_brl?.toFixed(2).replace('.', ',')}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[o.status], background: `${STATUS_COLOR[o.status]}15`, padding: '2px 8px', borderRadius: 4 }}>{STATUS_LABEL[o.status] || o.status}</span>
                    <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Clientes */}
          {results.customers.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--a-text3)', letterSpacing: '0.1em', marginBottom: 10 }}>CLIENTES ({results.customers.length})</p>
              <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden' }}>
                {results.customers.map((c: any, i: number) => (
                  <a key={c.id} href="/admin/clientes"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < results.customers.length - 1 ? '1px solid var(--a-border)' : 'none', textDecoration: 'none', color: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-border)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(169, 101, 237,0.15)', border: '1px solid rgba(169, 101, 237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#A965ED', flexShrink: 0 }}>
                      {(c.nome || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', flex: 1 }}>{c.nome}</span>
                    <span style={{ fontSize: 12, color: 'var(--a-text2)' }}>{c.telefone}</span>
                    <span style={{ fontSize: 12, color: 'var(--a-text3)' }}>{c.email}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Produtos */}
          {results.products.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--a-text3)', letterSpacing: '0.1em', marginBottom: 10 }}>PRODUTOS ({results.products.length})</p>
              <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden' }}>
                {results.products.map((p: any, i: number) => (
                  <a key={p.id} href="/admin/produtos"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < results.products.length - 1 ? '1px solid var(--a-border)' : 'none', textDecoration: 'none', color: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-border)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--a-text3)' }}>{p.brand}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#A965ED' }}>USD {p.usd_price?.toFixed(2)}</span>
                    {p.estoque !== null && (
                      <span style={{ fontSize: 10, color: p.estoque === 0 ? '#ef4444' : p.estoque <= 5 ? '#f59e0b' : '#A965ED', fontWeight: 700 }}>{p.estoque} un.</span>
                    )}
                    <span style={{ fontSize: 10, color: p.ativo ? '#A965ED' : '#ef4444' }}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--a-text3)' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>Nenhum resultado encontrado</p>
              <p style={{ fontSize: 13 }}>Tente buscar por nome, número do pedido, CPF ou telefone</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Busca() {
  return (
    <Suspense>
      <BuscaConteudo />
    </Suspense>
  )
}
