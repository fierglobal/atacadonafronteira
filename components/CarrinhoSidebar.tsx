'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCarrinho } from './CarrinhoContext'
import { progressoTier, type Tier } from '@/lib/tier'

// Site trabalha só em R$ — sem seletor de moeda em lugar nenhum da UI hoje
// (ver CategoriaProductCard.tsx). "BRL" como prefixo literal destoava do
// resto do site, que sempre mostra "R$".
const fmtCurrency = (usd: number, rate: number, code: string) => {
  const v = usd * rate
  if (code === 'PYG') return `${code} ${v.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`
  const prefixo = code === 'BRL' ? 'R$' : code
  return `${prefixo} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const dec = (s: string | null) => { try { return s ? atob(s) : null } catch { return s } }

type CrossSellItem = {
  id: string
  name: string | null
  brand: string | null
  usd_price: number
  brl_price?: number | null
  img_url: string | null
}

export function CarrinhoSidebar() {
  const router = useRouter()
  const { itens, currency, brlRate, sidebarAberto, fecharSidebar, remover, atualizar, totalUsd, quantidade, adicionar } = useCarrinho()
  const [pedidoMinimo, setPedidoMinimo] = useState<number | null>(null)
  const [crossSell, setCrossSell] = useState<CrossSellItem[]>([])
  const [tiersByProduct, setTiersByProduct] = useState<Record<string, Tier[]>>({})
  const [limitesByProduct, setLimitesByProduct] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/checkout-config').then(r => r.json()).then(d => {
      if (typeof d.pedido_minimo_brl === 'number') setPedidoMinimo(d.pedido_minimo_brl)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sidebarAberto || itens.length === 0) { queueMicrotask(() => setCrossSell([])); return }
    const productIds = itens.map(i => i.id).filter(Boolean)
    if (!productIds.length) return
    fetch('/api/cross-sell', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    }).then(r => r.json()).then(d => {
      setCrossSell((d.products || []).slice(0, 4))
    }).catch(() => {})
  }, [sidebarAberto, itens])

  useEffect(() => {
    if (!sidebarAberto || itens.length === 0) { queueMicrotask(() => { setTiersByProduct({}); setLimitesByProduct({}) }); return }
    const productIds = itens.map(i => i.id).filter(Boolean)
    if (!productIds.length) return
    fetch('/api/cart/tiers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    }).then(r => r.json()).then(d => {
      setTiersByProduct(d.tiers || {})
      setLimitesByProduct(d.limites || {})
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
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), visibility 0.3s',
        boxShadow: sidebarAberto ? '-8px 0 24px rgba(0,0,0,0.06)' : 'none',
        // Fechada, a gaveta ficava deslocada 100% para fora e o navegador somava
        // isso à largura rolável: 52px de scroll horizontal em toda página no
        // celular. `position: fixed` não é cortado por overflow no body, então a
        // correção tem que ser aqui — visibility tira da conta de overflow e
        // ainda anima junto com o transform.
        visibility: sidebarAberto ? 'visible' : 'hidden',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #ececec', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Carrinho</span>
            {quantidade > 0 && (
              <span style={{ background: '#A965ED', color: '#000', borderRadius: 99, fontSize: 10, fontWeight: 900, padding: '2px 8px' }}>
                {String(quantidade).padStart(2, '0')}
              </span>
            )}
          </div>
          <button
            onClick={fecharSidebar}
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#ffffff', border: '1px solid #ececec', color: '#737373', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* AOV bar */}
        {itens.length > 0 && pedidoMinimo && (
          <div style={{ padding: '14px 24px', background: minOk ? 'rgba(66, 14, 118,0.04)' : '#FFFDF7', borderBottom: '1px solid #ececec', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: minOk ? '#420E76' : '#b45309', letterSpacing: '0.02em' }}>
                {minOk
                  ? '✓ Pedido mínimo atingido'
                  : `Faltam R$ ${faltaBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para o mínimo`}
              </span>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#420E76', letterSpacing: '0.08em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                Min R$ {pedidoMinimo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div style={{ height: 5, background: '#ececec', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: minOk ? '#A965ED' : '#f59e0b', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {itens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 0' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block' }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p style={{ color: '#737373', fontSize: 14, fontWeight: 600 }}>Carrinho vazio</p>
            </div>
          ) : (
            itens.map(item => (
              <div key={item.id} style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: 16, display: 'flex', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

                <div style={{ width: 80, height: 80, background: '#fafafa', borderRadius: 12, overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid #f5f5f5' }}>
                  <Image src={item.img} alt={item.name} fill style={{ objectFit: 'contain', padding: 8 }} />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    {item.brand && (
                      <span style={{ fontSize: 9, color: '#420E76', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.brand}</span>
                    )}
                    <button onClick={() => remover(item.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, display: 'flex', marginLeft: 'auto' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0a0a0a', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#420E76', fontWeight: 900, marginBottom: 12 }}>
                    {fmtCurrency(item.usd, currency.rate, currency.code)}<span style={{ fontSize: 10, color: '#a3a3a3', fontWeight: 500 }}> /un</span>
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d4d4d4', borderRadius: 8, overflow: 'hidden', height: 32 }}>
                      <button onClick={() => atualizar(item.id, item.quantity - 1)}
                        style={{ width: 32, height: '100%', background: 'none', border: 'none', color: '#404040', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#0a0a0a', background: '#fafafa', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.quantity}</span>
                      <button onClick={() => atualizar(item.id, item.quantity + 1)}
                        disabled={!!limitesByProduct[item.id] && item.quantity >= limitesByProduct[item.id]}
                        style={{ width: 32, height: '100%', background: 'none', border: 'none', color: limitesByProduct[item.id] && item.quantity >= limitesByProduct[item.id] ? '#d4d4d4' : '#404040', fontSize: 14, cursor: limitesByProduct[item.id] && item.quantity >= limitesByProduct[item.id] ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>

                    <span style={{ fontWeight: 900, fontSize: 14, color: '#0a0a0a' }}>
                      {fmtCurrency(item.usd * item.quantity, currency.rate, currency.code)}
                    </span>
                  </div>

                  {(() => {
                    const prog = progressoTier(item.quantity, tiersByProduct[item.id])
                    if (!prog) return null
                    return (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f5f5f5' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: prog.atingiu ? '#0f7a3d' : '#420E76', margin: '0 0 5px' }}>
                          {prog.atingiu
                            ? `✓ Melhor preço aplicado: R$ ${prog.precoAlvo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/un`
                            : `Faltam ${prog.faltam} un. pra R$ ${prog.precoAlvo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/un`}
                        </p>
                        <div style={{ height: 4, background: '#ececec', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${prog.pct}%`, height: '100%', background: prog.atingiu ? '#0f7a3d' : '#A965ED', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )
                  })()}
                  {!!limitesByProduct[item.id] && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#b45309', margin: '8px 0 0' }}>
                      Limitado a {limitesByProduct[item.id]} un. por cliente
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cross-sell strip */}
        {itens.length > 0 && crossSell.length > 0 && (
          <div style={{ padding: '0 24px 24px', flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#737373', letterSpacing: '0.2em', margin: '0 0 14px' }}>COMPRE JUNTO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {crossSell.map(p => {
                const name = dec(p.name) || ''
                const brand = dec(p.brand) || ''
                return (
                  <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fafafa', border: '1px solid #ececec', borderRadius: 12, padding: 8 }}>
                    <div style={{ width: 48, height: 48, background: '#ffffff', borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid #ececec' }}>
                      <Image src={p.img_url || '/produto-placeholder.svg'} alt={name} fill style={{ objectFit: 'contain', padding: 4 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: '#0a0a0a', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                      <p style={{ fontSize: 12, color: '#420E76', fontWeight: 900, margin: '2px 0 0' }}>
                        {currency.code === 'BRL' && p.brl_price != null ? `BRL ${p.brl_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : fmtCurrency(p.usd_price, currency.rate, currency.code)}
                      </p>
                    </div>
                    <button onClick={() => adicionar({ id: p.id, name, usd: p.usd_price, img: p.img_url || '/produto-placeholder.svg', brand: brand || undefined })}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(66, 14, 118,0.05)', border: 'none', color: '#420E76', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {itens.length > 0 && (
          <div style={{ padding: 24, borderTop: '1px solid #ececec', flexShrink: 0, background: '#fafafa', boxShadow: '0 -8px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total do Pedido</span>
                <span style={{ fontSize: 10, color: '#a3a3a3', fontWeight: 500 }}>Câmbio: R$ {currency.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <span style={{ fontWeight: 900, fontSize: 28, color: '#420E76', letterSpacing: '-0.02em' }}>
                {fmtCurrency(totalUsd, currency.rate, currency.code)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { if (minOk) { fecharSidebar(); router.push('/checkout') } }}
                disabled={!minOk}
                style={{ width: '100%', height: 56, background: minOk ? '#420E76' : '#f5f5f5', color: minOk ? '#ffffff' : '#a3a3a3', borderRadius: 16, fontWeight: 900, fontSize: 16, border: minOk ? 'none' : '1px solid #ececec', cursor: minOk ? 'pointer' : 'not-allowed', boxShadow: minOk ? '0 8px 20px -4px rgba(66, 14, 118,0.3)' : 'none' }}>
                {minOk ? 'Finalizar Pedido' : 'Adicione mais para finalizar'}
              </button>

              <button onClick={fecharSidebar}
                style={{ width: '100%', height: 48, background: '#ffffff', color: '#404040', borderRadius: 12, fontWeight: 700, fontSize: 13, border: '1px solid #d4d4d4', cursor: 'pointer' }}>
                Continuar comprando
              </button>
            </div>

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
              <span style={{ fontSize: 10, color: '#a3a3a3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ambiente 100% Seguro</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
