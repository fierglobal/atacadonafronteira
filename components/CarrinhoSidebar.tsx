'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCarrinho } from './CarrinhoContext'

const fmtCurrency = (usd: number, rate: number, code: string) => {
  const v = usd * rate
  if (code === 'PYG') return `${code} ${v.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`
  return `${code} ${v.toFixed(2).replace('.', ',')}`
}

const dec = (s: string | null) => { try { return s ? atob(s) : null } catch { return s } }

type CrossSellItem = {
  id: string
  name: string | null
  brand: string | null
  usd_price: number
  img_url: string | null
}

export function CarrinhoSidebar() {
  const router = useRouter()
  const { itens, currency, brlRate, sidebarAberto, fecharSidebar, remover, atualizar, totalUsd, quantidade, adicionar } = useCarrinho()
  const [pedidoMinimo, setPedidoMinimo] = useState<number | null>(null)
  const [crossSell, setCrossSell] = useState<CrossSellItem[]>([])

  useEffect(() => {
    fetch('/api/checkout-config').then(r => r.json()).then(d => {
      if (typeof d.pedido_minimo_brl === 'number') setPedidoMinimo(d.pedido_minimo_brl)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sidebarAberto || itens.length === 0) { setCrossSell([]); return }
    const productIds = itens.map(i => i.id).filter(Boolean)
    if (!productIds.length) return
    fetch('/api/cross-sell', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    }).then(r => r.json()).then(d => {
      setCrossSell((d.products || []).slice(0, 4))
    }).catch(() => {})
  }, [sidebarAberto, itens])

  const totalBRL = totalUsd * brlRate
  const faltaBRL = pedidoMinimo && totalBRL < pedidoMinimo ? pedidoMinimo - totalBRL : 0
  const minOk = !pedidoMinimo || totalBRL >= pedidoMinimo
  const progressPct = pedidoMinimo ? Math.min(100, (totalBRL / pedidoMinimo) * 100) : 100

  return (
    <>
      {sidebarAberto && (
        <div
          onClick={fecharSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, backdropFilter: 'blur(3px)' }}
        />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100dvh', width: 400, maxWidth: '100vw',
        background: '#ffffff', borderLeft: '1px solid #ececec',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        transform: sidebarAberto ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: sidebarAberto ? '-8px 0 24px rgba(0,0,0,0.06)' : 'none',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #ececec', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0a0a0a' }}>Carrinho</span>
            {quantidade > 0 && (
              <span style={{ background: '#A965ED', color: '#000', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '2px 8px' }}>
                {quantidade}
              </span>
            )}
          </div>
          <button
            onClick={fecharSidebar}
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#fafafa', border: '1px solid #ececec', color: '#404040', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* AOV bar */}
        {itens.length > 0 && pedidoMinimo && (
          <div style={{ padding: '12px 16px', background: minOk ? 'rgba(66, 14, 118,0.06)' : 'rgba(245,158,11,0.08)', borderBottom: '1px solid #ececec', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: minOk ? '#420E76' : '#b45309', letterSpacing: '0.04em' }}>
                {minOk
                  ? '✓ Pedido mínimo atingido'
                  : `Faltam R$ ${faltaBRL.toFixed(2).replace('.', ',')} pra atingir o pedido mínimo`}
              </span>
            </div>
            <div style={{ height: 4, background: '#ececec', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: minOk ? '#A965ED' : '#f59e0b', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {itens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 0' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block' }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p style={{ color: '#737373', fontSize: 14, fontWeight: 600 }}>Carrinho vazio</p>
            </div>
          ) : (
            itens.map(item => (
              <div key={item.id} style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, padding: '12px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

                <div style={{ width: 54, height: 54, background: '#fafafa', borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {item.brand && (
                    <p style={{ fontSize: 10, color: '#420E76', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.brand}</p>
                  )}
                  <p style={{ fontWeight: 600, fontSize: 12, color: '#0a0a0a', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#420E76', fontWeight: 700, marginBottom: 10 }}>
                    {fmtCurrency(item.usd, currency.rate, currency.code)}/un.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, overflow: 'hidden' }}>
                      <button onClick={() => atualizar(item.id, item.quantity - 1)}
                        style={{ width: 30, height: 30, background: 'none', border: 'none', color: '#404040', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ width: 34, textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#0a0a0a' }}>{item.quantity}</span>
                      <button onClick={() => atualizar(item.id, item.quantity + 1)}
                        style={{ width: 30, height: 30, background: 'none', border: 'none', color: '#404040', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#0a0a0a' }}>
                        {fmtCurrency(item.usd * item.quantity, currency.rate, currency.code)}
                      </span>
                      <button onClick={() => remover(item.id)}
                        style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cross-sell strip */}
        {itens.length > 0 && crossSell.length > 0 && (
          <div style={{ borderTop: '1px solid #ececec', padding: '12px 16px', flexShrink: 0, background: '#fafafa' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#525252', letterSpacing: '0.1em', margin: '0 0 10px' }}>COMPRE JUNTO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crossSell.map(p => {
                const name = dec(p.name) || ''
                const brand = dec(p.brand) || ''
                return (
                  <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#ffffff', border: '1px solid #ececec', borderRadius: 8, padding: '8px' }}>
                    <div style={{ width: 44, height: 44, background: '#fafafa', borderRadius: 6, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      <Image src={p.img_url || '/produto-placeholder.svg'} alt={name} fill style={{ objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#0a0a0a', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                      <p style={{ fontSize: 11, color: '#420E76', fontWeight: 700, margin: '2px 0 0' }}>
                        {fmtCurrency(p.usd_price, currency.rate, currency.code)}
                      </p>
                    </div>
                    <button onClick={() => adicionar({ id: p.id, name, usd: p.usd_price, img: p.img_url || '/produto-placeholder.svg', brand: brand || undefined })}
                      style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(66, 14, 118,0.08)', border: '1px solid rgba(66, 14, 118,0.4)', color: '#420E76', fontSize: 18, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      +
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {itens.length > 0 && (
          <div style={{ padding: '16px 18px', borderTop: '1px solid #ececec', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 14, color: '#404040' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: '#420E76' }}>
                {fmtCurrency(totalUsd, currency.rate, currency.code)}
              </span>
            </div>

            <button onClick={() => { if (minOk) { fecharSidebar(); router.push('/checkout') } }}
              disabled={!minOk}
              style={{ width: '100%', height: 50, background: minOk ? '#A965ED' : '#f5f5f5', color: minOk ? '#000' : '#a3a3a3', borderRadius: 12, fontWeight: 700, fontSize: 15, border: minOk ? 'none' : '1px solid #ececec', cursor: minOk ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: minOk ? '0 4px 16px rgba(66, 14, 118,0.25)' : 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {minOk ? 'Finalizar Pedido' : 'Adicione mais para finalizar'}
            </button>

            <button onClick={fecharSidebar}
              style={{ width: '100%', height: 40, background: 'transparent', color: '#404040', borderRadius: 12, fontWeight: 500, fontSize: 13, border: '1px solid #d4d4d4', cursor: 'pointer' }}>
              Continuar comprando
            </button>
          </div>
        )}
      </div>
    </>
  )
}
