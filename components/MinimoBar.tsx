'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCarrinho } from './CarrinhoContext'

// Barra fixa de progresso até o pedido mínimo. O sidebar do carrinho já mostra
// a mesma informação, mas só quando está aberto — quem navega o catálogo com o
// carrinho fechado não descobre que existe um mínimo até tentar finalizar.
export function MinimoBar() {
  const pathname = usePathname()
  const { itens, totalUsd, sidebarAberto, abrirSidebar } = useCarrinho()
  const [pedidoMinimo, setPedidoMinimo] = useState<number | null>(null)
  const [brlRate, setBrlRate] = useState(5.2)

  useEffect(() => {
    fetch('/api/checkout-config').then(r => r.json()).then(d => {
      if (typeof d.pedido_minimo_brl === 'number') setPedidoMinimo(d.pedido_minimo_brl)
      if (typeof d.brl_rate === 'number') setBrlRate(d.brl_rate)
    }).catch(() => {})
  }, [])

  // Fora do admin e do checkout, que têm o seu próprio indicador.
  const escondido = pathname.startsWith('/admin') || pathname === '/checkout' || pathname.startsWith('/pix/')
  const totalBRL = totalUsd * brlRate
  const visivel = !escondido && !sidebarAberto && !!pedidoMinimo && itens.length > 0 && totalBRL < pedidoMinimo

  // O cookie banner também é fixo no rodapé e cobriria esta barra. Ele lê esta
  // variável para subir enquanto a barra estiver na tela.
  useEffect(() => {
    document.body.style.setProperty('--minimo-bar-h', visivel ? '70px' : '0px')
    return () => { document.body.style.setProperty('--minimo-bar-h', '0px') }
  }, [visivel])

  if (!visivel || !pedidoMinimo) return null

  const faltam = pedidoMinimo - totalBRL
  const pct = Math.min(100, (totalBRL / pedidoMinimo) * 100)
  const brl = (n: number) => n.toFixed(2).replace('.', ',')

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, background: '#ffffff', borderTop: '1px solid #ececec', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <p style={{ margin: '0 0 7px', fontSize: 12, fontWeight: 700, color: '#b45309' }}>
            Faltam R$ {brl(faltam)} para o pedido mínimo de R$ {brl(pedidoMinimo)}
          </p>
          <div style={{ width: '100%', height: 6, background: '#ececec', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 6, transition: 'width 0.3s' }} />
          </div>
        </div>
        <button onClick={abrirSidebar}
          style={{ flexShrink: 0, padding: '11px 22px', background: '#420E76', color: '#ffffff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', cursor: 'pointer' }}>
          VER CARRINHO · R$ {brl(totalBRL)}
        </button>
      </div>
    </div>
  )
}
