'use client'
import { useState, useEffect, Fragment } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { getSupabaseClient } from '@/lib/supabase-client'
import { useCarrinho } from '@/components/CarrinhoContext'
import { gerarPixPayload, PIX_KEY_FALLBACK, PIX_HOLDER_FALLBACK } from '@/lib/pix'
import { ENTREGA_LABEL, ehEntregaTipo, type EntregaTipo } from '@/lib/entrega'
import { SOB_ENCOMENDA_BADGE, SOB_ENCOMENDA_TEXTO } from '@/lib/site'

type OrderItem = { id: string; product_id: string | null; product_name: string; product_brand: string | null; unit_usd: number; unit_brl: number | null; quantity: number; subtotal_usd: number; subtotal_brl: number | null; products: { categorias: { nome: string } | null; badges: string[] | null } | null }
type Order = {
  id: string; order_num: string; status: string; total_brl: number; total_usd: number; created_at: string
  notas: string | null; comprovante_url: string | null; nome_retirador: string | null
  entrega_tipo: string | null; entrega_endereco: string | null
  frete_brl: number | null; seguro_brl: number | null; seguro_recusado: boolean | null
  codigo_rastreio: string | null
  order_items: OrderItem[]
}

// Rótulos por modalidade — "Pronto p/ Retirada"/"Retirado" só fazem sentido pra quem
// retira; envio_brasil usa o mesmo status internamente (histórico do admin não muda),
// então o rótulo pro cliente é traduzido aqui, não no banco.
const STATUS_STEPS = ['pendente_pagamento', 'pago', 'pronto_retirada', 'retirado']
function statusLabel(status: string, entregaTipo: EntregaTipo): string {
  const envio = entregaTipo === 'envio_brasil'
  const base: Record<string, string> = {
    pendente_pagamento: 'Aguardando PIX',
    pago: 'Pago',
    pronto_retirada: envio ? 'Enviado' : 'Pronto p/ Retirada',
    retirado: envio ? 'Entregue' : 'Retirado',
    cancelado: 'Cancelado',
  }
  return base[status] || status
}

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

export default function PedidoDetalhe() {
  const router = useRouter()
  const params = useParams()
  const { adicionar } = useCarrinho()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [copied, setCopied] = useState<'key' | 'valor' | null>(null)
  const [comprovante, setComprovante] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [reordering, setReordering] = useState(false)
  const [config, setConfig] = useState<{ pix_key?: string; pix_holder?: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const pixKey = config?.pix_key || PIX_KEY_FALLBACK
  const pixHolder = config?.pix_holder || PIX_HOLDER_FALLBACK

  const reorder = async () => {
    if (!order) return
    setReordering(true)
    try {
      const r = await fetch(`/api/conta/reorder/${order.id}`)
      const d = await r.json() as { items?: { name: string; brand: string | null; usd: number; quantity: number }[] }
      if (d.items?.length) {
        d.items.forEach(i => {
          adicionar({ id: `reorder-${i.name}-${i.usd}`, name: i.name, usd: Number(i.usd), img: '/produto-placeholder.svg', brand: i.brand || undefined })
        })
        router.push('/checkout')
      }
    } catch {}
    setReordering(false)
  }

  useEffect(() => {
    fetch('/api/checkout-config').then(r => r.json()).then(c => setConfig(c)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!order || order.status !== 'pendente_pagamento') return
    const payload = gerarPixPayload(order.total_brl, order.order_num, pixKey, pixHolder)
    QRCode.toDataURL(payload, { width: 180, margin: 2, color: { dark: '#000', light: '#fff' } })
      .then(setQrDataUrl).catch(() => {})
  }, [order, pixKey, pixHolder])

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) { router.replace('/conta/login'); return }
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, products(categoria_id, badges))')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()
      if (!data) { router.replace('/conta/minha-conta/pedidos'); return }

      // products.categoria_id não tem FK formal para categorias — PostgREST recusa o
      // embed aninhado products(categorias(nome)) com PGRST200, resolvido à mão aqui
      // (reconstruindo os itens, sem mutar o embed original).
      type RawItem = Record<string, unknown> & { products: { categoria_id: string | null; badges: string[] | null } | null }
      const itens = (data.order_items || []) as RawItem[]
      const catIds = [...new Set(itens.map(i => i.products?.categoria_id).filter(Boolean))]
      const catMap = new Map<string, string>()
      if (catIds.length) {
        const { data: cats } = await supabase.from('categorias').select('id, nome').in('id', catIds)
        ;(cats || []).forEach((cat: { id: string; nome: string }) => catMap.set(cat.id, cat.nome))
      }
      data.order_items = itens.map(i => {
        const catId = i.products?.categoria_id
        const nome = catId && catMap.has(catId) ? catMap.get(catId) : null
        return { ...i, products: i.products ? { ...i.products, categorias: nome ? { nome } : null } : null }
      })

      setOrder(data)
      setLoading(false)
    })
  }, [router, params.id])

  const copy = (text: string, type: 'key' | 'valor') => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const uploadComprovante = async (file: File) => {
    if (!order) return
    setComprovante('uploading')
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setComprovante('error'); return }
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${order.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('comprovantes').upload(path, file, { upsert: true })
      if (upErr) { setComprovante('error'); return }
      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(path)
      // `orders` só aceita UPDATE de service_role — quem grava é a API.
      const res = await fetch('/api/notify/comprovante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, comprovanteUrl: publicUrl }),
      })
      if (!res.ok) { setComprovante('error'); return }
      setOrder(o => o ? { ...o, comprovante_url: publicUrl } : o)
      setComprovante('done')
    } catch {
      setComprovante('error')
    }
  }

  if (loading) return <div style={{ minHeight: 200 }} />
  if (!order) return null

  const stepIndex = STATUS_STEPS.indexOf(order.status)
  const isCanceled = order.status === 'cancelado'
  const entregaTipo: EntregaTipo = ehEntregaTipo(order.entrega_tipo) ? order.entrega_tipo : 'retirada_cde'
  const envio = entregaTipo === 'envio_brasil'
  // Taxa travada neste pedido (não a do câmbio de hoje) — usada só pra preencher
  // unit_brl/subtotal_brl de pedidos antigos, salvos antes da coluna existir.
  const taxa = order.total_usd > 0 ? order.total_brl / order.total_usd : 0
  const temSobEncomenda = order.order_items.some(i =>
    (i.products?.badges || []).some(b => b.trim().toLowerCase() === SOB_ENCOMENDA_BADGE))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/conta/minha-conta/pedidos')} style={{ background: 'transparent', border: '1px solid #d4d4d4', borderRadius: 8, color: '#404040', padding: '7px 14px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>← Pedidos</button>
        <div style={{ flex: 1, minWidth: 120 }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.order_num}</h1>
          <p style={{ fontSize: 11, color: '#737373', margin: 0 }}>
            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={reorder} disabled={reordering}
          style={{ background: '#ffffff', border: '1px solid rgba(66, 14, 118,0.4)', borderRadius: 8, color: '#420E76', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: reordering ? 'wait' : 'pointer', opacity: reordering ? 0.6 : 1, flexShrink: 0 }}>
          {reordering ? 'Adicionando...' : '🔄 Repetir pedido'}
        </button>
      </div>

      {/* Sob encomenda — bem visível, logo após o cabeçalho */}
      {temSobEncomenda && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '2px solid rgba(245,158,11,0.4)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>📦</span>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#b45309', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pedido com item sob encomenda</p>
          </div>
          <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5 }}>{SOB_ENCOMENDA_TEXTO}</p>
        </div>
      )}

      {/* Status timeline */}
      {!isCanceled ? (
        <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, padding: '24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em', margin: '0 0 24px' }}>STATUS DO PEDIDO</p>
          <div style={{ display: 'flex' }}>
            {STATUS_STEPS.map((step, i) => {
              const done = i <= stepIndex
              const current = i === stepIndex
              return (
                <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 13, left: '50%', width: '100%', height: 2,
                      background: i < stepIndex ? '#420E76' : '#ececec', zIndex: 0,
                    }} />
                  )}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: `2px solid ${done ? '#420E76' : '#d4d4d4'}`,
                    background: current ? '#A965ED' : done ? 'rgba(66, 14, 118,0.08)' : '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1, position: 'relative',
                    boxShadow: current ? '0 4px 12px rgba(66, 14, 118,0.18)' : 'none',
                  }}>
                    {done && !current && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <p style={{ fontSize: 9, fontWeight: current ? 800 : 600, color: current ? '#420E76' : done ? '#525252' : '#a3a3a3', marginTop: 8, textAlign: 'center', letterSpacing: '0.03em', lineHeight: 1.3 }}>
                    {statusLabel(step, entregaTipo)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, margin: 0 }}>Pedido cancelado</p>
        </div>
      )}

      {/* PIX info — só quando pendente */}
      {order.status === 'pendente_pagamento' && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', margin: '0 0 14px' }}>PAGAMENTO VIA PIX</p>
          <p style={{ fontSize: 13, color: '#404040', marginBottom: 18, lineHeight: 1.5 }}>
            Transfira o valor exato abaixo para a chave PIX e aguarde a confirmação.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {qrDataUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 12, background: '#ffffff', border: '1px solid #ececec', borderRadius: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada em runtime (QRCode.toDataURL), não é asset pra otimizar */}
                <img src={qrDataUrl} alt="QR Code PIX" width={160} height={160} />
              </div>
            )}
            <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, color: '#737373', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.08em' }}>CHAVE PIX (CNPJ)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', flex: 1, color: '#0a0a0a' }}>{pixKey}</span>
                <button onClick={() => copy(pixKey, 'key')} style={{ padding: '6px 14px', background: copied === 'key' ? 'rgba(66, 14, 118,0.08)' : '#fafafa', border: `1px solid ${copied === 'key' ? 'rgba(66, 14, 118,0.4)' : '#d4d4d4'}`, borderRadius: 6, color: copied === 'key' ? '#420E76' : '#404040', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  {copied === 'key' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#737373', margin: '8px 0 0' }}>Beneficiário: {pixHolder}</p>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, color: '#737373', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.08em' }}>VALOR A TRANSFERIR</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 900, flex: 1, color: '#0a0a0a' }}>{fmt(order.total_brl)}</span>
                <button onClick={() => copy(order.total_brl.toFixed(2), 'valor')} style={{ padding: '6px 14px', background: copied === 'valor' ? 'rgba(66, 14, 118,0.08)' : '#fafafa', border: `1px solid ${copied === 'valor' ? 'rgba(66, 14, 118,0.4)' : '#d4d4d4'}`, borderRadius: 6, color: copied === 'valor' ? '#420E76' : '#404040', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  {copied === 'valor' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprovante — sempre visível */}
      {(() => {
        const enviado = comprovante === 'done' || !!order.comprovante_url
        const emAnalise = enviado && order.status === 'pendente_pagamento'
        const cor = emAnalise ? '#f59e0b' : '#420E76'
        return (
      <div style={{ background: '#ffffff', border: `1px solid ${enviado ? `${cor}4d` : '#ececec'}`, borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: enviado ? cor : '#525252', letterSpacing: '0.1em', margin: '0 0 12px' }}>COMPROVANTE DE PAGAMENTO</p>
        {enviado ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: cor, fontSize: 13, fontWeight: 700 }}>
              {emAnalise ? (
                <span style={{ fontSize: 15 }}>🔍</span>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              {emAnalise ? 'Comprovante recebido — em análise da equipe' : 'Comprovante enviado'}
            </div>
            {order.comprovante_url && (
              <a href={order.comprovante_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: cor, fontWeight: 700, textDecoration: 'none', border: `1px solid ${cor}66`, borderRadius: 6, padding: '4px 10px' }}>
                Ver →
              </a>
            )}
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#404040', margin: '0 0 12px', lineHeight: 1.5 }}>
              Envie o comprovante do PIX para agilizar a confirmação do seu pedido.
            </p>
            <label style={{ display: 'block', border: '1px dashed #d4d4d4', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: comprovante === 'uploading' ? 'wait' : 'pointer', background: '#fafafa' }}>
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadComprovante(f) }} />
              {comprovante === 'uploading' ? (
                <span style={{ fontSize: 13, color: '#404040' }}>Enviando...</span>
              ) : comprovante === 'error' ? (
                <span style={{ fontSize: 13, color: '#ef4444' }}>Erro ao enviar. Tente novamente.</span>
              ) : (
                <span style={{ fontSize: 13, color: '#404040' }}>📎 Clique para anexar foto ou PDF</span>
              )}
            </label>
          </>
        )}
      </div>
        )
      })()}

      {/* Items */}
      <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #ececec', background: '#fafafa' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em', margin: 0 }}>ITENS DO PEDIDO</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ececec' }}>
              {['Produto', 'Qtd', 'Unit.', 'Subtotal'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, color: '#525252', fontWeight: 700, letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const grupos = order.order_items.reduce((acc, item) => {
                const cat = item.products?.categorias?.nome || 'Outros'
                ;(acc[cat] ||= []).push(item)
                return acc
              }, {} as Record<string, OrderItem[]>)
              const categorias = Object.keys(grupos).sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b))
              const mostrarGrupos = categorias.length > 1
              return categorias.map(cat => (
                <Fragment key={cat}>
                  {mostrarGrupos && (
                    <tr key={`h-${cat}`}>
                      <td colSpan={4} style={{ padding: '8px 20px 4px', fontSize: 10, fontWeight: 800, color: '#420E76', letterSpacing: '0.08em', background: '#fafafa' }}>{cat}</td>
                    </tr>
                  )}
                  {grupos[cat].map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #ececec' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#0a0a0a' }}>{item.product_name}</p>
                        {item.product_brand && <p style={{ fontSize: 10, color: '#737373', margin: '2px 0 0' }}>{item.product_brand}</p>}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: '#404040' }}>{item.quantity}x</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: '#404040' }}>{fmt(item.unit_brl ?? item.unit_usd * taxa)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{fmt(item.subtotal_brl ?? item.subtotal_usd * taxa)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))
            })()}
          </tbody>
        </table>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #ececec', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <span style={{ fontSize: 11, color: '#525252', fontWeight: 700, letterSpacing: '0.06em' }}>TOTAL</span>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#0a0a0a' }}>{fmt(order.total_brl)}</p>
          </div>
        </div>
      </div>

      {/* Entrega — endereço/retirada, frete, seguro e rastreio, condicionados à modalidade real do pedido */}
      <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#420E76', letterSpacing: '0.1em', margin: '0 0 14px' }}>ENTREGA — {ENTREGA_LABEL[entregaTipo].toUpperCase()}</p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: (order.frete_brl || order.seguro_brl) ? 16 : 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <div style={{ minWidth: 0 }}>
            {envio ? (
              <>
                <p style={{ fontSize: 12, color: '#404040', margin: 0, lineHeight: 1.6 }}>
                  Seu pedido será enviado para o endereço abaixo após a confirmação do pagamento.
                </p>
                {order.entrega_endereco && (
                  <p style={{ fontSize: 13, color: '#0a0a0a', fontWeight: 600, margin: '8px 0 0', lineHeight: 1.5 }}>
                    {order.entrega_endereco}
                  </p>
                )}
                {order.codigo_rastreio ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 12px', background: 'rgba(66, 14, 118,0.05)', border: '1px solid rgba(66, 14, 118,0.2)', borderRadius: 8 }}>
                    <span style={{ fontSize: 14 }}>🚚</span>
                    <div>
                      <p style={{ fontSize: 9, color: '#737373', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>CÓDIGO DE RASTREIO</p>
                      <p style={{ fontSize: 13, color: '#420E76', fontWeight: 800, fontFamily: 'monospace', margin: 0 }}>{order.codigo_rastreio}</p>
                    </div>
                  </div>
                ) : (stepIndex >= STATUS_STEPS.indexOf('pronto_retirada')) && (
                  <p style={{ fontSize: 12, color: '#737373', margin: '10px 0 0' }}>Enviado — o código de rastreio é adicionado em breve.</p>
                )}
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: '#404040', margin: 0, lineHeight: 1.6 }}>
                  Seu pedido ficará disponível para retirada em {ENTREGA_LABEL[entregaTipo].replace('Retirada em ', '')} após a confirmação do pagamento. Você receberá um aviso quando estiver pronto.
                </p>
                {order.nome_retirador && (
                  <p style={{ fontSize: 12, color: '#737373', margin: '6px 0 0' }}>
                    Retirador: <strong style={{ color: '#0a0a0a' }}>{order.nome_retirador}</strong>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {(Number(order.frete_brl || 0) > 0 || Number(order.seguro_brl || 0) > 0 || (envio && order.seguro_recusado)) && (
          <div style={{ borderTop: '1px solid #ececec', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Number(order.frete_brl || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#404040' }}>
                <span>Frete</span><span style={{ fontWeight: 700, color: '#0a0a0a' }}>{fmt(Number(order.frete_brl))}</span>
              </div>
            )}
            {Number(order.seguro_brl || 0) > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#404040' }}>
                <span>Seguro de carga</span><span style={{ fontWeight: 700, color: '#0a0a0a' }}>{fmt(Number(order.seguro_brl))}</span>
              </div>
            ) : envio && order.seguro_recusado && (
              <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, margin: 0 }}>
                ⚠ Você optou por não incluir o seguro de carga — em caso de extravio, o reenvio não está incluso.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
