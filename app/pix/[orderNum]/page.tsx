'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import QRCode from 'qrcode'
import { WHATSAPP_ENABLED } from '@/lib/site'
import Logo from '@/components/Logo'

export const dynamic = 'force-dynamic'

const PIX_KEY = '52347525000100'
const PIX_HOLDER = 'FIER GLOBAL'
const PIX_CITY = 'MARINGA'
const WHATSAPP = '595994222774'

function crc16(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}
function gerarPixPayload(amountBRL: number, orderNum: string): string {
  const merchantAccount = tlv('26', tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', PIX_KEY))
  const txid = (orderNum || '***').replace(/\W/g, '').slice(0, 25) || '***'
  const body = [
    tlv('00', '01'), tlv('01', '12'), merchantAccount,
    tlv('52', '0000'), tlv('53', '986'),
    amountBRL > 0 ? tlv('54', amountBRL.toFixed(2)) : '',
    tlv('58', 'BR'), tlv('59', PIX_HOLDER.slice(0, 25)), tlv('60', PIX_CITY.slice(0, 15)),
    tlv('62', tlv('05', txid)), '6304',
  ].join('')
  return body + crc16(body)
}

type PixItem = { product_name: string; quantity: number; unit_usd: number; subtotal_usd: number }
type PixData = {
  orderNum: string
  totalBRL: number
  totalUSD: number
  copyHash: string | null
  pixExpiraEm: string | null
  createdAt: string
  customer: { nome: string; telefone: string } | null
  items: PixItem[]
}

const fmtBRL = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

export default function PedidoPix() {
  const router = useRouter()
  const params = useParams()
  const orderNum = String(params.orderNum || '')

  const [loading, setLoading] = useState(true)
  const [processado, setProcessado] = useState(false)
  const [data, setData] = useState<PixData | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [secsLeft, setSecsLeft] = useState(0)
  const [copied, setCopied] = useState<'key' | 'val' | 'pix' | null>(null)

  useEffect(() => {
    fetch(`/api/pedido/${orderNum}/pix`).then(async r => {
      if (r.status === 410) { setProcessado(true); setLoading(false); return }
      if (!r.ok) { setLoading(false); return }
      const d = await r.json() as PixData
      setData(d)
      const payload = gerarPixPayload(Number(d.totalBRL), d.orderNum)
      QRCode.toDataURL(payload, { width: 240, margin: 2, color: { dark: '#000', light: '#fff' } })
        .then(url => setQrDataUrl(url)).catch(() => {})
      const exp = d.pixExpiraEm ? new Date(d.pixExpiraEm).getTime() : Date.now() + 30 * 60 * 1000
      setSecsLeft(Math.max(0, Math.floor((exp - Date.now()) / 1000)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [orderNum])

  useEffect(() => {
    if (!data) return
    const id = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(id); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [data])

  const copy = async (text: string, which: 'key' | 'val' | 'pix') => {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(which)
    setTimeout(() => setCopied(null), 2500)
  }

  const sendWhatsApp = () => {
    if (!data) return
    const linhas = data.items.map(i => `• ${i.product_name} x${i.quantity}`).join('\n')
    const msg = encodeURIComponent(
      `*PEDIDO ${data.orderNum}*\n\n` +
      (data.customer ? `Nome: ${data.customer.nome}\nTel: ${data.customer.telefone}\n` : '') +
      `*PRODUTOS:*\n${linhas}\n\n` +
      `*TOTAL: ${fmtBRL(Number(data.totalBRL))}*\n\n✅ PIX enviado`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  const Header = () => (
    <header style={{ borderBottom: '1px solid #ececec', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, background: '#ffffff', zIndex: 50 }}>
      <a href="/"><Logo size={26} /></a>
      <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#404040', fontSize: 13, cursor: 'pointer' }}>← Voltar</button>
    </header>
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #ececec', borderTopColor: '#420E76', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (processado) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
        <Header />
        <div style={{ maxWidth: 520, margin: '64px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(66, 14, 118,0.06)', border: '2px solid #420E76', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: '#0a0a0a' }}>Este pedido já foi processado</h1>
          <p style={{ color: '#404040', fontSize: 14, marginBottom: 28 }}>O pedido #{orderNum} não está mais pendente de pagamento.</p>
          <button onClick={() => router.push('/')} style={{ padding: '12px 28px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(66, 14, 118,0.25)' }}>
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
        <Header />
        <div style={{ maxWidth: 520, margin: '64px auto', padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: '#0a0a0a' }}>Pedido não encontrado</h1>
          <button onClick={() => router.push('/')} style={{ marginTop: 24, padding: '12px 28px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(66, 14, 118,0.25)' }}>
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    )
  }

  const totalBRL = Number(data.totalBRL)
  const pixPayloadStr = gerarPixPayload(totalBRL, data.orderNum)
  const totalBRLStr = totalBRL.toFixed(2).replace('.', ',')
  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const expired = secsLeft === 0
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#525252', letterSpacing: '0.08em', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      <Header />

      <div style={{ maxWidth: 520, margin: '48px auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(245,158,11,0.18)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, color: '#0a0a0a' }}>Pagamento pendente</h1>
          <p style={{ color: '#404040', fontSize: 13 }}>
            Pedido <span style={{ color: '#420E76', fontWeight: 700 }}>#{data.orderNum}</span> — aguardando pagamento PIX
          </p>
        </div>

        {/* QR + Timer */}
        {qrDataUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20, padding: '20px', background: '#fafafa', border: '1px solid #ececec', borderRadius: 16 }}>
            <div style={{ padding: 12, background: '#fff', border: '1px solid #ececec', borderRadius: 10, display: 'inline-block' }}>
              <img src={qrDataUrl} alt="QR Code PIX" width={180} height={180} />
            </div>
            <p style={{ fontSize: 12, color: '#525252', margin: 0 }}>Escaneie com o app do banco</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: expired ? 'rgba(239,68,68,0.06)' : 'rgba(66, 14, 118,0.06)', border: `1px solid ${expired ? 'rgba(239,68,68,0.3)' : 'rgba(66, 14, 118,0.3)'}`, borderRadius: 20 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={expired ? '#ef4444' : '#420E76'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: expired ? '#ef4444' : '#420E76', fontFamily: 'monospace' }}>
                {expired ? 'PIX expirado' : `Expira em ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`}
              </span>
            </div>
          </div>
        )}

        {/* PIX Copia e Cola */}
        <div style={{ background: 'linear-gradient(135deg, rgba(66, 14, 118,0.04), rgba(66, 14, 118,0.01))', border: '1px solid rgba(66, 14, 118,0.25)', borderRadius: 16, padding: '24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#420E76', animation: 'pulse 2s ease infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: '#420E76' }}>PIX COPIA E COLA</span>
          </div>
          <p style={{ fontSize: 12, color: '#404040', marginBottom: 14, lineHeight: 1.6 }}>
            No app do banco: <strong style={{ color: '#0a0a0a' }}>Pix → Pagar → Copia e Cola</strong>. Cole o código abaixo.
          </p>
          <div style={{ background: '#f5f5f5', border: '1px solid #ececec', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 9, color: '#525252', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.7, userSelect: 'all' }}>
            {pixPayloadStr}
          </div>
          <button onClick={() => copy(pixPayloadStr, 'pix')}
            style={{ width: '100%', padding: '14px', background: copied === 'pix' ? 'rgba(66, 14, 118,0.08)' : '#A965ED', border: `1px solid ${copied === 'pix' ? 'rgba(66, 14, 118,0.4)' : '#A965ED'}`, borderRadius: 10, color: copied === 'pix' ? '#420E76' : '#000', fontSize: 14, fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', boxShadow: copied === 'pix' ? 'none' : '0 4px 16px rgba(66, 14, 118,0.25)' }}>
            {copied === 'pix' ? '✓ Código Copiado!' : 'Copiar Código PIX'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#ececec' }} />
          <span style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: '0.1em' }}>OU USE A CHAVE MANUAL</span>
          <div style={{ flex: 1, height: 1, background: '#ececec' }} />
        </div>

        <div style={{ background: '#fafafa', border: '1px solid #ececec', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ ...lbl, marginBottom: 8 }}>CHAVE PIX (CNPJ)</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, padding: '11px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, fontSize: 13, color: '#0a0a0a', fontFamily: 'monospace' }}>
                {PIX_KEY}
              </div>
              <button onClick={() => copy(PIX_KEY, 'key')}
                style={{ flexShrink: 0, padding: '0 16px', background: copied === 'key' ? 'rgba(66, 14, 118,0.08)' : '#ffffff', border: `1px solid ${copied === 'key' ? 'rgba(66, 14, 118,0.4)' : '#d4d4d4'}`, borderRadius: 8, color: '#420E76', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied === 'key' ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ ...lbl, marginBottom: 8 }}>VALOR A PAGAR</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, padding: '12px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, fontSize: 20, fontWeight: 900, color: '#420E76', fontFamily: 'monospace' }}>
                R$ {totalBRLStr}
              </div>
              <button onClick={() => copy(totalBRL.toFixed(2), 'val')}
                style={{ flexShrink: 0, padding: '0 16px', background: copied === 'val' ? 'rgba(66, 14, 118,0.08)' : '#ffffff', border: `1px solid ${copied === 'val' ? 'rgba(66, 14, 118,0.4)' : '#d4d4d4'}`, borderRadius: 8, color: '#420E76', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied === 'val' ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid #ececec', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['Beneficiário', PIX_HOLDER], ['Pedido', `#${data.orderNum}`], ['Banco', 'Transferência PIX']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#737373' }}>{k}</span>
                <span style={{ color: '#0a0a0a', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo */}
        <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ ...lbl, marginBottom: 12 }}>RESUMO DO PEDIDO</p>
          {data.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#404040', marginBottom: 8 }}>
              <span style={{ flex: 1, marginRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name} × {item.quantity}</span>
              <span style={{ color: '#0a0a0a', whiteSpace: 'nowrap' }}>{fmtBRL(Number(item.subtotal_usd) * 5.20)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #ececec', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900 }}>
            <span style={{ color: '#0a0a0a' }}>Total</span>
            <span style={{ color: '#420E76' }}>R$ {totalBRLStr}</span>
          </div>
        </div>

        {WHATSAPP_ENABLED && (
          <button onClick={sendWhatsApp}
            style={{ width: '100%', padding: '16px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 16px rgba(37,211,102,0.25)', marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Já paguei — Confirmar pelo WhatsApp
          </button>
        )}
        <button onClick={() => router.push('/')} style={{ width: '100%', padding: '13px', background: 'transparent', color: '#404040', border: '1px solid #d4d4d4', borderRadius: 12, fontSize: 13, cursor: 'pointer' }}>
          Voltar ao Catálogo
        </button>
      </div>
    </div>
  )
}
