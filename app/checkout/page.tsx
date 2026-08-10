'use client'
import { useState, useEffect, type ChangeEvent } from 'react'
import QRCode from 'qrcode'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCarrinho, currencies, type CartItem } from '@/components/CarrinhoContext'
import { getSupabaseClient } from '@/lib/supabase-client'
import { WHATSAPP_ENABLED } from '@/lib/site'

const BRL_RATE = currencies.find(c => c.code === 'BRL')!.rate
const PIX_KEY = '52347525000100'
const PIX_HOLDER = 'FIER GLOBAL'
const PIX_CITY = 'MARINGA'
const WHATSAPP = '595994222774'

// ── PIX EMV payload ──────────────────────────────────────────
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
// ────────────────────────────────────────────────────────────

const fmtBRL = (usd: number) => `R$ ${(usd * BRL_RATE).toFixed(2).replace('.', ',')}`

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, x) =>
    x ? `${a}.${b}.${c}-${x}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a)
}
const maskCNPJ = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length > 6) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  if (d.length > 2) return d.replace(/(\d{2})(\d{0,})/, '($1) $2')
  return d
}

const decBase64 = (s: string | null) => {
  if (!s) return ''
  try {
    const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch { return '' }
}

type TipoPessoa = 'PF' | 'PJ'
type Profile = {
  nome: string; cpf: string; email: string; telefone: string; cidade: string; uf: string
}
type Utm = { source: string; medium: string; campaign: string; content: string; term: string }
type GuestForm = {
  nome: string; cpf: string; email: string; telefone: string; cidade: string; uf: string
  tipo_pessoa: TipoPessoa; cnpj: string; razao_social: string
  po_number: string
  honeypot: string
}
type CupomAplicado = { id: string; codigo: string; desconto_pct: number }
type CrossSellItem = { id: string; name: string; brand: string; usd_price: number; img_url: string }
type PageState = 'checking' | 'confirm' | 'form' | 'pix'

const emptyGuest: GuestForm = {
  nome: '', cpf: '', email: '', telefone: '', cidade: '', uf: '',
  tipo_pessoa: 'PF', cnpj: '', razao_social: '',
  po_number: '', honeypot: '',
}

function isProfileComplete(p: Partial<Profile>): boolean {
  return !!(p.nome && p.cpf && p.telefone && p.cidade && p.uf)
}

function PixQrBlock({ qrDataUrl, totalSecs }: { qrDataUrl: string; totalSecs: number }) {
  const [secsLeft, setSecsLeft] = useState(totalSecs)
  useEffect(() => {
    setSecsLeft(totalSecs)
    let remaining = totalSecs
    const id = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) { clearInterval(id); setSecsLeft(0) }
      else setSecsLeft(remaining)
    }, 1000)
    return () => clearInterval(id)
  }, [totalSecs])
  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const expired = secsLeft === 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20, padding: '20px', background: '#fafafa', border: '1px solid #ececec', borderRadius: 16 }}>
      <div style={{ padding: 12, background: '#fff', border: '1px solid #ececec', borderRadius: 10, display: 'inline-block' }}>
        <img src={qrDataUrl} alt="QR Code PIX" width={180} height={180} />
      </div>
      <p style={{ fontSize: 12, color: '#525252', margin: 0 }}>Escaneie com o app do banco</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: expired ? 'rgba(239,68,68,0.06)' : 'rgba(109,40,217,0.06)', border: `1px solid ${expired ? 'rgba(239,68,68,0.3)' : 'rgba(109,40,217,0.3)'}`, borderRadius: 20 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={expired ? '#ef4444' : '#6d28d9'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: expired ? '#ef4444' : '#6d28d9', fontFamily: 'monospace' }}>
          {expired ? 'PIX expirado' : `Expira em ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`}
        </span>
      </div>
    </div>
  )
}

function CuponsList({
  cupons, cupomCodigo, setCupomCodigo, aplicarCupom, removerCupom, cupomLoading, cupomErr,
}: {
  cupons: CupomAplicado[]
  cupomCodigo: string
  setCupomCodigo: (v: string) => void
  aplicarCupom: () => void
  removerCupom: (id: string) => void
  cupomLoading: boolean
  cupomErr: string
}) {
  const [showInput, setShowInput] = useState(cupons.length === 0)
  useEffect(() => { if (cupons.length === 0) setShowInput(true) }, [cupons.length])
  const podeAdicionar = cupons.length < 2
  return (
    <div style={{ marginBottom: 12 }}>
      {cupons.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.4)', borderRadius: 7, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 800, fontFamily: 'monospace' }}>{c.codigo}</span>
            <span style={{ fontSize: 10, color: '#404040' }}>-{c.desconto_pct}%</span>
          </div>
          <button onClick={() => removerCupom(c.id)} style={{ background: 'none', border: 'none', color: '#737373', fontSize: 14, cursor: 'pointer', padding: '0 4px' }} title="Remover cupom">×</button>
        </div>
      ))}
      {showInput && podeAdicionar && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={cupomCodigo} onChange={e => setCupomCodigo(e.target.value.toUpperCase())}
            placeholder="CUPOM DE DESCONTO" maxLength={20}
            style={{ flex: 1, padding: '8px 10px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 7, color: '#0a0a0a', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.06em', outline: 'none' }} />
          <button onClick={aplicarCupom} disabled={cupomLoading}
            style={{ padding: '8px 12px', background: '#ffffff', border: '1px solid rgba(109,40,217,0.4)', borderRadius: 7, color: '#6d28d9', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {cupomLoading ? '...' : 'Aplicar'}
          </button>
        </div>
      )}
      {!showInput && podeAdicionar && (
        <button onClick={() => setShowInput(true)} style={{ background: 'none', border: 'none', color: '#6d28d9', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
          + adicionar outro cupom
        </button>
      )}
      {cupomErr && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{cupomErr}</p>}
    </div>
  )
}

function AovBar({ totalBRL, pedidoMinimo }: { totalBRL: number; pedidoMinimo: number | null }) {
  if (!pedidoMinimo) return null
  const atingiu = totalBRL >= pedidoMinimo
  const faltam = Math.max(0, pedidoMinimo - totalBRL)
  const pct = Math.min(100, Math.round((totalBRL / pedidoMinimo) * 100))
  const cor = atingiu ? '#6d28d9' : '#b45309'
  const barCor = atingiu ? '#8b5cf6' : '#f59e0b'
  const bg = atingiu ? 'rgba(109,40,217,0.06)' : 'rgba(245,158,11,0.06)'
  const border = atingiu ? 'rgba(109,40,217,0.3)' : 'rgba(245,158,11,0.3)'
  return (
    <div style={{ marginBottom: 20, padding: '12px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
        <span style={{ color: cor, fontWeight: 700 }}>
          {atingiu
            ? `✓ Pedido mínimo atingido (R$ ${pedidoMinimo.toFixed(2).replace('.', ',')})`
            : `Faltam R$ ${faltam.toFixed(2).replace('.', ',')} pra atingir o pedido mínimo de R$ ${pedidoMinimo.toFixed(2).replace('.', ',')}`}
        </span>
      </div>
      <div style={{ width: '100%', height: 4, background: '#ececec', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barCor, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function CrossSellStrip({ items, onAdd }: { items: CrossSellItem[]; onAdd: (i: CrossSellItem) => void }) {
  if (!items.length) return null
  return (
    <div style={{ marginTop: 16, marginBottom: 16, padding: '14px 16px', background: '#fafafa', border: '1px solid #ececec', borderRadius: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: '#525252', letterSpacing: '0.1em', margin: '0 0 12px' }}>QUEM COMPROU, LEVOU TAMBÉM</p>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {items.slice(0, 4).map(p => (
          <div key={p.id} style={{ flex: '0 0 140px', background: '#ffffff', border: '1px solid #ececec', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '100%', height: 80, background: '#fafafa', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
              {p.img_url && <Image src={p.img_url} alt={p.name} fill style={{ objectFit: 'cover' }} />}
            </div>
            <p style={{ fontSize: 11, color: '#0a0a0a', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{p.name}</p>
            <p style={{ fontSize: 12, color: '#6d28d9', fontWeight: 800, margin: 0 }}>{fmtBRL(p.usd_price)}</p>
            <button onClick={() => onAdd(p)} style={{ padding: '6px 8px', background: '#ffffff', border: '1px solid rgba(109,40,217,0.4)', borderRadius: 6, color: '#6d28d9', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              + adicionar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Checkout() {
  const router = useRouter()
  const { itens, totalUsd, limpar, adicionar } = useCarrinho()

  const [pageState, setPageState] = useState<PageState>('checking')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  // guest form
  const [form, setForm] = useState<GuestForm>(emptyGuest)
  const [errs, setErrs] = useState<Partial<Record<keyof GuestForm, string>>>({})

  // pix
  const [orderNum, setOrderNum] = useState('')
  const [orderId, setOrderId] = useState('')
  const [pixItens, setPixItens] = useState<CartItem[]>([])
  const [pixTotal, setPixTotal] = useState(0)
  const [pixForm, setPixForm] = useState<Profile | null>(null)
  const [estimatedReadyTime, setEstimatedReadyTime] = useState('')

  // shared
  const [copied, setCopied] = useState<'key' | 'val' | 'pix' | null>(null)
  const [comprovante, setComprovante] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [globalErr, setGlobalErr] = useState('')
  const [mounted, setMounted] = useState(false)
  const [cupomCodigo, setCupomCodigo] = useState('')
  const [cupons, setCupons] = useState<CupomAplicado[]>([])
  const [cupomLoading, setCupomLoading] = useState(false)
  const [cupomErr, setCupomErr] = useState('')
  const [pixDescontoBRL, setPixDescontoBRL] = useState(0)
  const [nomeRetirador, setNomeRetirador] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [pixStartSecs, setPixStartSecs] = useState(0)

  // novos
  const [utm, setUtm] = useState<Utm>({ source: '', medium: '', campaign: '', content: '', term: '' })
  const [config, setConfig] = useState<{ pedido_minimo_brl: number | null; estimated_ready_time: string; pix_expiry_minutes: number } | null>(null)
  const [lookupHit, setLookupHit] = useState(false)
  const [lookupBlocked, setLookupBlocked] = useState(false)
  const [crossSell, setCrossSell] = useState<CrossSellItem[]>([])

  useEffect(() => {
    setMounted(true)
    import('@vercel/analytics').then(({ track }) => {
      track('checkout_started', { items_count: itens.length, total_usd: +totalUsd.toFixed(2) })
    }).catch(() => {})
    try {
      const raw = sessionStorage.getItem('utm')
      if (raw) {
        const u = JSON.parse(raw)
        setUtm({
          source: u.source || '', medium: u.medium || '', campaign: u.campaign || '',
          content: u.content || '', term: u.term || '',
        })
      }
    } catch {}
    // config
    fetch('/api/checkout-config').then(r => r.json()).then(c => setConfig(c)).catch(() => {})

    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) { setPageState('form'); return }
      setUserId(user.id)
      setUserEmail(user.email || '')
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p && isProfileComplete(p)) {
        setProfile({ ...p, email: user.email || '' })
        setPageState('confirm')
      } else {
        setForm({
          ...emptyGuest,
          nome: p?.nome || '',
          cpf: p?.cpf || '',
          email: user.email || '',
          telefone: p?.telefone || '',
          cidade: p?.cidade || '',
          uf: p?.uf || '',
        })
        setPageState('form')
      }
    })
  }, [])

  // cross-sell por carrinho
  useEffect(() => {
    const productIds = itens.map(i => i.id).filter(Boolean) as string[]
    if (!productIds.length) { setCrossSell([]); return }
    let alive = true
    fetch('/api/cross-sell', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    }).then(r => r.json()).then(d => {
      if (!alive) return
      const products = (d.products || []).map((p: any) => ({
        id: p.id, name: decBase64(p.name), brand: decBase64(p.brand),
        usd_price: Number(p.usd_price) || 0, img_url: p.img_url || '',
      }))
      setCrossSell(products)
    }).catch(() => {})
    return () => { alive = false }
  }, [itens.map(i => i.id).join('|')])

  // guest form handlers
  const set = (k: keyof GuestForm) => (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (k === 'cpf') v = maskCPF(v)
    else if (k === 'cnpj') v = maskCNPJ(v)
    else if (k === 'telefone') v = maskPhone(v)
    else if (k === 'uf') v = v.toUpperCase().slice(0, 2)
    setForm(p => ({ ...p, [k]: v }))
    setErrs(p => { const n = { ...p }; delete n[k]; return n })
    if (k === 'cpf') {
      const digits = v.replace(/\D/g, '')
      if (digits.length === 11) lookupByCpf(digits)
      else { setLookupHit(false); setLookupBlocked(false) }
    }
  }

  const setTipoPessoa = (tp: TipoPessoa) => {
    setForm(p => ({ ...p, tipo_pessoa: tp }))
    setErrs(p => { const n = { ...p }; delete n.cnpj; delete n.razao_social; return n })
  }

  const lookupByCpf = async (cpf: string) => {
    try {
      const r = await fetch('/api/customer-lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      })
      const d = await r.json()
      if (d.blocked) { setLookupBlocked(true); setLookupHit(false); return }
      setLookupBlocked(false)
      if (d.found) {
        setLookupHit(true)
        setForm(p => ({
          ...p,
          nome: p.nome || d.nome || '',
          telefone: p.telefone ? p.telefone : (d.telefone ? maskPhone(d.telefone) : ''),
          email: p.email || d.email || '',
          cidade: p.cidade || d.cidade || '',
          uf: p.uf || (d.uf || '').toUpperCase().slice(0, 2),
          razao_social: p.razao_social || d.razao_social || '',
          cnpj: p.cnpj || (d.cnpj ? maskCNPJ(d.cnpj) : ''),
        }))
      } else {
        setLookupHit(false)
      }
    } catch {}
  }

  const validateGuest = () => {
    const e: Partial<Record<keyof GuestForm, string>> = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    if (!form.cpf.replace(/\D/g, '').match(/^\d{11}$/)) e.cpf = 'CPF inválido'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'E-mail inválido'
    if (!form.telefone.replace(/\D/g, '').match(/^\d{10,11}$/)) e.telefone = 'Número inválido'
    if (!form.cidade.trim()) e.cidade = 'Obrigatório'
    if (!form.uf.match(/^[A-Za-z]{2}$/)) e.uf = 'UF inválida'
    if (form.tipo_pessoa === 'PJ') {
      if (!form.cnpj.replace(/\D/g, '').match(/^\d{14}$/)) e.cnpj = 'CNPJ inválido'
      if (!form.razao_social.trim()) e.razao_social = 'Obrigatório'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const aplicarCupom = async () => {
    if (!cupomCodigo.trim()) return
    if (cupons.length >= 2) { setCupomErr('Máximo de 2 cupons'); return }
    const codigo = cupomCodigo.trim().toUpperCase()
    if (cupons.some(c => c.codigo === codigo)) { setCupomErr('Cupom já aplicado'); return }
    setCupomLoading(true)
    setCupomErr('')
    const r = await fetch('/api/cupom', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })
    const d = await r.json()
    if (d.ok) {
      setCupons(prev => [...prev, { id: d.id, codigo, desconto_pct: d.desconto_pct }])
      setCupomCodigo('')
    } else {
      setCupomErr(d.error || 'Cupom inválido')
    }
    setCupomLoading(false)
  }

  const removerCupom = (id: string) => {
    setCupons(prev => prev.filter(c => c.id !== id))
    setCupomErr('')
  }

  const cupomDescontoPct = Math.min(90, cupons.reduce((s, c) => s + c.desconto_pct, 0))

  const placeOrder = async (data: Profile, uid: string | null, retirador?: string) => {
    if (lookupBlocked) {
      setGlobalErr('Não foi possível concluir. Tente novamente em instantes.')
      return
    }
    setSubmitting(true)
    setGlobalErr('')
    const snapshotItens = [...itens]
    const snapshotTotal = totalUsd

    let cartSessionId: string | null = null
    try {
      const csRes = await fetch('/api/cart-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: data.nome, telefone: data.telefone.replace(/\D/g, ''), email: data.email,
          itens: snapshotItens.map(i => ({ name: i.name, qty: i.quantity, usd: i.usd })),
          total_usd: snapshotTotal,
        }),
      })
      const cs = await csRes.json().catch(() => ({}))
      if (cs.id) cartSessionId = cs.id
    } catch {}

    const fullForm: any = {
      nome: data.nome, cpf: data.cpf, email: data.email, telefone: data.telefone,
      cidade: data.cidade, uf: data.uf,
      tipo_pessoa: form.tipo_pessoa,
      cnpj: form.tipo_pessoa === 'PJ' ? form.cnpj : '',
      razao_social: form.tipo_pessoa === 'PJ' ? form.razao_social : '',
      po_number: form.po_number || '',
      utm,
      honeypot: form.honeypot,
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: fullForm,
          itens: snapshotItens,
          userId: uid,
          cupomIds: cupons.map(c => c.id),
          nomeRetirador: retirador?.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if (res.status === 409 && Array.isArray(d.indisponiveis) && d.indisponiveis.length) {
          setGlobalErr('Itens indisponíveis: ' + d.indisponiveis.join('; '))
        } else if (res.status === 422 && d.pedido_minimo) {
          const faltam = (Number(d.pedido_minimo) - Number(d.total_atual || 0)).toFixed(2).replace('.', ',')
          setGlobalErr(`Pedido mínimo R$ ${Number(d.pedido_minimo).toFixed(2).replace('.', ',')}. Faltam R$ ${faltam}.`)
        } else if (res.status === 403) {
          setGlobalErr('Não foi possível concluir. Tente novamente em instantes.')
        } else {
          setGlobalErr(d.error || 'Erro ao registrar pedido. Tente novamente.')
        }
        setSubmitting(false)
        return
      }
      const respJson = await res.json()
      const { orderNum: num, orderId: oid, pixExpiraEm, estimatedReadyTime: ert } = respJson
      if (cartSessionId) {
        fetch('/api/cart-session', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cartSessionId }),
        }).catch(() => {})
      }
      setOrderNum(num)
      setOrderId(oid || '')
      setPixItens(snapshotItens)
      setPixTotal(snapshotTotal)
      setPixForm(data)
      setPixDescontoBRL(cupomDescontoPct > 0 ? (snapshotTotal * BRL_RATE) * cupomDescontoPct / 100 : 0)
      setEstimatedReadyTime(ert || '')
      if (uid) {
        getSupabaseClient().from('profiles').upsert({
          id: uid, nome: data.nome, cpf: data.cpf, telefone: data.telefone,
          cidade: data.cidade, uf: data.uf,
        }).then(() => {})
      }
      limpar()
      setPageState('pix')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      import('@vercel/analytics').then(({ track }) => {
        track('pix_generated', { order_num: num, total_brl: +(snapshotTotal * BRL_RATE).toFixed(2), total_usd: +snapshotTotal.toFixed(2), items_count: snapshotItens.length })
      }).catch(() => {})
      const pixBRL = +(snapshotTotal * BRL_RATE * (1 - cupomDescontoPct / 100)).toFixed(2)
      const payload = gerarPixPayload(pixBRL, num)
      QRCode.toDataURL(payload, { width: 240, margin: 2, color: { dark: '#000', light: '#fff' } })
        .then(url => setQrDataUrl(url)).catch(() => {})
      // timer: usa pixExpiraEm do servidor se disponível
      let secs = (config?.pix_expiry_minutes || 30) * 60
      if (pixExpiraEm) {
        const calc = Math.floor((new Date(pixExpiraEm).getTime() - Date.now()) / 1000)
        if (calc > 0) secs = calc
      }
      setPixStartSecs(secs)
    } catch {
      setGlobalErr('Erro de conexão. Verifique sua internet e tente novamente.')
    }
    setSubmitting(false)
  }

  const copy = async (text: string, which: 'key' | 'val' | 'pix') => {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(which)
    setTimeout(() => setCopied(null), 2500)
  }

  const sendWhatsApp = () => {
    if (!pixForm) return
    const linhas = pixItens.map(i => `• ${i.name} x${i.quantity} — ${fmtBRL(i.usd * i.quantity)}`).join('\n')
    const msg = encodeURIComponent(
      `*PEDIDO ${orderNum}*\n\n` +
      `Nome: ${pixForm.nome}\nCPF: ${pixForm.cpf}\nTel: ${pixForm.telefone}\nEmail: ${pixForm.email}\n` +
      `Cidade: ${pixForm.cidade}/${pixForm.uf}\n\n` +
      `*PRODUTOS:*\n${linhas}\n\n` +
      `*TOTAL: R$ ${(pixTotal * BRL_RATE).toFixed(2).replace('.', ',')}*\n\n✅ PIX enviado`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  const uploadComprovante = async (file: File) => {
    if (!orderId) return
    setComprovante('uploading')
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId || 'guest'}/${orderId}.${ext}`
      const { error: upErr } = await supabase.storage.from('comprovantes').upload(path, file, { upsert: true })
      if (upErr) { setComprovante('error'); return }
      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(path)
      // `orders` só aceita UPDATE de service_role — quem grava é a API.
      const res = await fetch('/api/notify/comprovante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, comprovanteUrl: publicUrl }),
      })
      if (!res.ok) { setComprovante('error'); return }
      setComprovante('done')
    } catch { setComprovante('error') }
  }

  // styles
  const inp = (err?: string) => ({
    width: '100%', padding: '11px 14px',
    background: '#ffffff', border: `1px solid ${err ? '#ef4444' : '#d4d4d4'}`,
    borderRadius: 8, color: '#0a0a0a', fontSize: 14, outline: 'none',
    boxSizing: 'border-box' as const, transition: 'border-color 0.2s',
  })
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#404040', letterSpacing: '0.08em', marginBottom: 6 }
  const errStyle = { fontSize: 10, color: '#ef4444', marginTop: 4 }

  const totalBRL = totalUsd * BRL_RATE
  const descontoBRL = cupomDescontoPct > 0 ? totalBRL * cupomDescontoPct / 100 : 0
  const totalFinal = totalBRL - descontoBRL
  const totalBRLStr = totalBRL.toFixed(2).replace('.', ',')
  const totalFinalStr = totalFinal.toFixed(2).replace('.', ',')
  const pixTotalBRL = pixTotal * BRL_RATE - pixDescontoBRL
  const pixTotalBRLStr = pixTotalBRL.toFixed(2).replace('.', ',')
  const pixPayloadStr = orderNum ? gerarPixPayload(pixTotalBRL, orderNum) : ''

  const pedidoMinimo = config?.pedido_minimo_brl ?? null
  const atingiuMinimo = !pedidoMinimo || totalFinal >= pedidoMinimo
  const podeFinalizar = !submitting && atingiuMinimo && !lookupBlocked

  const adicionarCrossSell = (p: CrossSellItem) => {
    adicionar({ id: p.id, name: p.name, usd: p.usd_price, img: p.img_url, brand: p.brand })
  }

  if (!mounted) return <div style={{ minHeight: '100vh', background: '#ffffff' }} />

  if (itens.length === 0 && pageState !== 'pix' && pageState !== 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p style={{ color: '#737373', fontSize: 15 }}>Seu carrinho está vazio</p>
        <button onClick={() => router.push('/')} style={{ padding: '12px 28px', background: '#8b5cf6', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(109,40,217,0.25)' }}>
          Ver Catálogo
        </button>
      </div>
    )
  }

  /* ─── HEADER COMPARTILHADO ─── */
  const StepIndicator = ({ step }: { step: 1 | 2 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: step > 1 ? 'rgba(109,40,217,0.08)' : '#8b5cf6', border: step > 1 ? '1px solid rgba(109,40,217,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: step > 1 ? '#6d28d9' : '#000' }}>
          {step > 1 ? '✓' : '1'}
        </div>
        <span style={{ fontSize: 11, color: step === 1 ? '#0a0a0a' : '#737373', fontWeight: step === 1 ? 700 : 400 }}>Dados</span>
      </div>
      <span style={{ color: '#a3a3a3' }}>→</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: step === 2 ? '#8b5cf6' : '#ffffff', border: step === 2 ? 'none' : '1px solid #d4d4d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: step === 2 ? '#000' : '#a3a3a3' }}>2</div>
        <span style={{ fontSize: 11, color: step === 2 ? '#0a0a0a' : '#a3a3a3', fontWeight: step === 2 ? 700 : 400 }}>Pagamento</span>
      </div>
    </div>
  )

  const Header = ({ step }: { step?: 1 | 2 }) => (
    <header style={{ borderBottom: '1px solid #ececec', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, background: '#ffffff', zIndex: 50 }}>
      <Image src="/logo-fronteira-mockup.png" alt="Atacado na Fronteira" width={90} height={35} style={{ objectFit: 'contain' }} />
      {step ? <StepIndicator step={step} /> : (
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#404040', fontSize: 13, cursor: 'pointer' }}>
          ← Voltar
        </button>
      )}
    </header>
  )

  /* ─── CHECKING ─── */
  if (pageState === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #ececec', borderTopColor: '#6d28d9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }


  /* ─── PIX SCREEN ─── */
  if (pageState === 'pix') {
    const readyTimeFallback = 'Após a confirmação do PIX, seu pedido fica pronto para retirada em até 24 horas úteis.'
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
        <Header step={2} />

        <div style={{ maxWidth: 520, margin: '48px auto', padding: '0 24px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(109,40,217,0.06)', border: '2px solid #6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(109,40,217,0.18)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, color: '#0a0a0a' }}>Pedido Confirmado!</h1>
            <p style={{ color: '#404040', fontSize: 13 }}>
              Pedido <span style={{ color: '#6d28d9', fontWeight: 700 }}>#{orderNum}</span> — aguardando pagamento PIX
            </p>
          </div>

          {/* Tempo de preparação */}
          <div style={{ marginBottom: 20, padding: '16px 20px', background: '#fafafa', border: '1px solid rgba(109,40,217,0.3)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>📦</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#6d28d9', letterSpacing: '0.1em', margin: '0 0 4px' }}>TEMPO DE PREPARAÇÃO</p>
              <p style={{ fontSize: 13, color: '#404040', margin: 0, lineHeight: 1.5 }}>
                {estimatedReadyTime || readyTimeFallback}
              </p>
            </div>
          </div>

          {/* QR Code + Timer */}
          {qrDataUrl && pixStartSecs > 0 && <PixQrBlock qrDataUrl={qrDataUrl} totalSecs={pixStartSecs} />}

          {/* PIX Copia e Cola */}
          <div style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.04), rgba(109,40,217,0.01))', border: '1px solid rgba(109,40,217,0.25)', borderRadius: 16, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6d28d9', animation: 'pulse 2s ease infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: '#6d28d9' }}>PIX COPIA E COLA</span>
            </div>
            <p style={{ fontSize: 12, color: '#404040', marginBottom: 14, lineHeight: 1.6 }}>
              No app do banco: <strong style={{ color: '#0a0a0a' }}>Pix → Pagar → Copia e Cola</strong>. Cole o código abaixo.
            </p>
            <div style={{ background: '#f5f5f5', border: '1px solid #ececec', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 9, color: '#525252', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.7, userSelect: 'all' }}>
              {pixPayloadStr}
            </div>
            <button onClick={() => copy(pixPayloadStr, 'pix')}
              style={{ width: '100%', padding: '14px', background: copied === 'pix' ? 'rgba(109,40,217,0.08)' : '#8b5cf6', border: `1px solid ${copied === 'pix' ? 'rgba(109,40,217,0.4)' : '#8b5cf6'}`, borderRadius: 10, color: copied === 'pix' ? '#6d28d9' : '#000', fontSize: 14, fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', boxShadow: copied === 'pix' ? 'none' : '0 4px 16px rgba(109,40,217,0.25)' }}>
              {copied === 'pix' ? '✓ Código Copiado!' : 'Copiar Código PIX'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#ececec' }} />
            <span style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: '0.1em' }}>OU USE A CHAVE MANUAL</span>
            <div style={{ flex: 1, height: 1, background: '#ececec' }} />
          </div>

          {/* chave + valor */}
          <div style={{ background: '#fafafa', border: '1px solid #ececec', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ ...lbl, marginBottom: 8 }}>CHAVE PIX (CNPJ)</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '11px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, fontSize: 13, color: '#0a0a0a', fontFamily: 'monospace' }}>
                  {PIX_KEY}
                </div>
                <button onClick={() => copy(PIX_KEY, 'key')}
                  style={{ flexShrink: 0, padding: '0 16px', background: copied === 'key' ? 'rgba(109,40,217,0.08)' : '#ffffff', border: `1px solid ${copied === 'key' ? 'rgba(109,40,217,0.4)' : '#d4d4d4'}`, borderRadius: 8, color: '#6d28d9', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  {copied === 'key' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ ...lbl, marginBottom: 8 }}>VALOR A PAGAR</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '12px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, fontSize: 20, fontWeight: 900, color: '#6d28d9', fontFamily: 'monospace' }}>
                  R$ {pixTotalBRLStr}
                </div>
                <button onClick={() => copy(pixTotalBRL.toFixed(2), 'val')}
                  style={{ flexShrink: 0, padding: '0 16px', background: copied === 'val' ? 'rgba(109,40,217,0.08)' : '#ffffff', border: `1px solid ${copied === 'val' ? 'rgba(109,40,217,0.4)' : '#d4d4d4'}`, borderRadius: 8, color: '#6d28d9', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  {copied === 'val' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid #ececec', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['Beneficiário', PIX_HOLDER], ['Pedido', `#${orderNum}`], ['Banco', 'Transferência PIX']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#737373' }}>{k}</span>
                  <span style={{ color: '#0a0a0a', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* resumo */}
          <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ ...lbl, marginBottom: 12 }}>RESUMO DO PEDIDO</p>
            {pixItens.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#404040', marginBottom: 8 }}>
                <span style={{ flex: 1, marginRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name} × {item.quantity}</span>
                <span style={{ color: '#0a0a0a', whiteSpace: 'nowrap' }}>{fmtBRL(item.usd * item.quantity)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #ececec', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900 }}>
              <span style={{ color: '#0a0a0a' }}>Total</span>
              <span style={{ color: '#6d28d9' }}>R$ {pixTotalBRLStr}</span>
            </div>
          </div>

          {/* comprovante */}
          <div style={{ background: '#ffffff', border: `1px solid ${comprovante === 'done' ? 'rgba(109,40,217,0.4)' : '#ececec'}`, borderRadius: 12, padding: '20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: comprovante === 'done' ? '#6d28d9' : '#525252', letterSpacing: '0.1em', margin: '0 0 10px' }}>ENVIAR COMPROVANTE</p>
            {comprovante === 'done' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6d28d9', fontSize: 13, fontWeight: 700 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Comprovante recebido! Aguarde a confirmação.
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: '#404040', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Após realizar o PIX, envie o comprovante para agilizar a confirmação.
                </p>
                <label style={{ display: 'block', border: '1px dashed #d4d4d4', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: comprovante === 'uploading' ? 'wait' : 'pointer', background: '#fafafa' }}>
                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadComprovante(f) }} />
                  {comprovante === 'uploading'
                    ? <span style={{ fontSize: 13, color: '#404040' }}>Enviando...</span>
                    : comprovante === 'error'
                    ? <span style={{ fontSize: 13, color: '#ef4444' }}>Erro. Tente novamente.</span>
                    : <span style={{ fontSize: 13, color: '#404040' }}><span style={{ display: 'block', fontSize: 24, marginBottom: 6 }}>📎</span>Clique para anexar foto ou PDF</span>}
                </label>
              </>
            )}
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

  /* ─── CONFIRM: logado + perfil completo ─── */
  if (pageState === 'confirm' && profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
        <style>{`
          input:focus { border-color: rgba(109,40,217,0.5) !important; box-shadow: 0 0 0 3px rgba(109,40,217,0.08); outline: none; }
          input::placeholder { color: #a3a3a3; }
          @media (max-width: 768px) {
            .ck-confirm-grid { grid-template-columns: 1fr !important; }
            .ck-confirm-summary { position: static !important; order: -1; }
          }
        `}</style>
        <Header step={1} />

        <div className="ck-confirm-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 32, alignItems: 'start' }}>
          <div>
            {/* saudação */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, color: '#0a0a0a' }}>
                Olá, {profile.nome.split(' ')[0]}!
              </h2>
              <p style={{ fontSize: 13, color: '#404040' }}>Confirme os dados abaixo e finalize sua compra.</p>
            </div>

            <AovBar totalBRL={totalFinal} pedidoMinimo={pedidoMinimo} />

            {/* card dados do cliente */}
            <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#525252', letterSpacing: '0.1em' }}>SEUS DADOS</span>
                <button onClick={() => router.push('/conta/minha-conta')}
                  style={{ fontSize: 11, color: '#6d28d9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  Alterar →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                {[
                  ['Nome', profile.nome],
                  ['CPF', profile.cpf],
                  ['Telefone', profile.telefone],
                  ['E-mail', profile.email],
                  ['Cidade/UF', `${profile.cidade}/${profile.uf}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ fontSize: 10, color: '#737373', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>{k.toUpperCase()}</p>
                    <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* PO number */}
            <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <label style={lbl}>NÚMERO DO SEU PEDIDO <span style={{ color: '#a3a3a3', fontWeight: 400, fontSize: 10 }}>(opcional)</span></label>
              <input value={form.po_number} onChange={e => setForm(p => ({ ...p, po_number: e.target.value }))}
                placeholder="Ex: PO-2026-001"
                style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, color: '#0a0a0a', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
              <p style={{ fontSize: 10, color: '#737373', marginTop: 6 }}>
                Se você usa um sistema interno e quer rastrear este pedido com seu próprio número.
              </p>
            </div>

            {/* Nome do retirador */}
            <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#404040', letterSpacing: '0.08em', marginBottom: 6 }}>NOME DO RETIRADOR</label>
              <input
                value={nomeRetirador} onChange={e => setNomeRetirador(e.target.value)}
                placeholder={`${profile.nome} (deixe em branco para usar seu nome)`}
                style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, color: '#0a0a0a', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
              />
              <p style={{ fontSize: 11, color: '#737373', marginTop: 6 }}>Quem irá retirar o pedido em loja. Pode ser diferente do comprador.</p>
            </div>

            <CrossSellStrip items={crossSell} onAdd={adicionarCrossSell} />

            {globalErr && (
              <p style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                {globalErr}
              </p>
            )}

            {/* botão confirmar */}
            <button
              onClick={() => placeOrder(profile, userId, nomeRetirador)}
              disabled={!podeFinalizar}
              style={{ width: '100%', padding: '18px', background: '#8b5cf6', color: '#000', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: 17, cursor: !podeFinalizar ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', boxShadow: '0 4px 16px rgba(109,40,217,0.25)', transition: 'all 0.2s', opacity: !podeFinalizar ? 0.4 : 1 }}
              onMouseEnter={e => { if (podeFinalizar) { const b = e.currentTarget as HTMLButtonElement; b.style.boxShadow = '0 6px 20px rgba(109,40,217,0.35)'; b.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.boxShadow = '0 4px 16px rgba(109,40,217,0.25)'; b.style.transform = 'none' }}>
              {submitting ? 'Processando...' : 'Confirmar Pedido →'}
            </button>

            <p style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#a3a3a3' }}>
              🔒 Pedido seguro — você receberá a chave PIX após confirmar
            </p>
          </div>

          {/* summary */}
          <div className="ck-confirm-summary" style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #ececec', background: '#fafafa' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#525252', letterSpacing: '0.1em', margin: 0 }}>RESUMO DO PEDIDO</p>
              </div>
              <div style={{ padding: '16px 20px', maxHeight: 380, overflowY: 'auto' }}>
                {itens.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#fafafa' }}>
                      <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#0a0a0a', margin: '0 0 2px', lineHeight: 1.4 }}>{item.name}</p>
                      <p style={{ fontSize: 11, color: '#737373', margin: 0 }}>×{item.quantity}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', whiteSpace: 'nowrap' }}>{fmtBRL(item.usd * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid #ececec' }}>
                <CuponsList cupons={cupons} cupomCodigo={cupomCodigo} setCupomCodigo={setCupomCodigo}
                  aplicarCupom={aplicarCupom} removerCupom={removerCupom} cupomLoading={cupomLoading} cupomErr={cupomErr} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#404040' }}>
                  <span>Subtotal</span><span>R$ {totalBRLStr}</span>
                </div>
                {descontoBRL > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#ef4444' }}>
                    <span>Desconto ({cupomDescontoPct}%)</span><span>-R$ {descontoBRL.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: '#404040' }}>
                  <span>Retirada em loja</span>
                  <span style={{ color: '#6d28d9', fontWeight: 700 }}>Sem custo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #ececec', fontSize: 20, fontWeight: 900 }}>
                  <span style={{ color: '#0a0a0a' }}>Total</span>
                  <span style={{ color: '#6d28d9' }}>R$ {totalFinalStr}</span>
                </div>
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 700 }}>Pagamento via PIX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── FORM: logado com perfil incompleto OU visitante ─── */
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
      <style>{`
        input:focus { border-color: rgba(109,40,217,0.5) !important; box-shadow: 0 0 0 3px rgba(109,40,217,0.08); outline: none; }
        input::placeholder { color: #a3a3a3; }
        @media (max-width: 768px) {
          .ck-guest-grid { grid-template-columns: 1fr !important; }
          .ck-two-col { grid-template-columns: 1fr !important; }
          .ck-cid-uf { grid-template-columns: 1fr !important; }
          .ck-guest-summary { position: static !important; order: -1; }
        }
      `}</style>
      <Header step={1} />

      <div className="ck-guest-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 32, alignItems: 'start' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6, letterSpacing: '-0.01em', color: '#0a0a0a' }}>Finalizar Pedido</h2>

          {/* banner: logado ou visitante */}
          {userId ? (
            <div style={{ padding: '10px 16px', background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.25)', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span style={{ fontSize: 12, color: '#404040' }}>Logado como <strong style={{ color: '#0a0a0a' }}>{userEmail}</strong>. Complete os dados para continuar.</span>
            </div>
          ) : (
            <div style={{ padding: '10px 16px', background: '#fafafa', border: '1px solid #ececec', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#404040' }}>Já tem cadastro?</span>
              <button onClick={() => router.push(`/conta/login?redirect=/checkout`)}
                style={{ fontSize: 12, color: '#6d28d9', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Entrar na minha conta →
              </button>
            </div>
          )}

          {/* trust badges */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' as const }}>
            {[['🔒', 'Compra Segura'], ['🛡️', 'Dados Protegidos'], ['⚡', 'PIX Instantâneo']].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#ffffff', border: '1px solid #ececec', borderRadius: 20, fontSize: 11, color: '#404040' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>

          <AovBar totalBRL={totalFinal} pedidoMinimo={pedidoMinimo} />

          {/* Toggle PF/PJ */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {(['PF', 'PJ'] as TipoPessoa[]).map(tp => {
              const active = form.tipo_pessoa === tp
              return (
                <button key={tp} type="button" onClick={() => setTipoPessoa(tp)}
                  style={{
                    flex: 1, padding: '10px 14px',
                    background: active ? 'rgba(109,40,217,0.08)' : '#ffffff',
                    border: `1px solid ${active ? 'rgba(109,40,217,0.4)' : '#d4d4d4'}`,
                    borderRadius: 10, color: active ? '#6d28d9' : '#404040',
                    fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {tp === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={lbl}>NOME COMPLETO</label>
              <input value={form.nome} onChange={set('nome')} placeholder="Seu nome completo" style={inp(errs.nome)} />
              {errs.nome && <p style={errStyle}>{errs.nome}</p>}
            </div>
            <div className="ck-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>CPF</label>
                <input value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" style={inp(errs.cpf)} />
                {errs.cpf && <p style={errStyle}>{errs.cpf}</p>}
                {lookupHit && !errs.cpf && (
                  <p style={{ fontSize: 10, color: '#6d28d9', marginTop: 4, fontWeight: 700 }}>✓ Cliente recorrente</p>
                )}
                {lookupBlocked && (
                  <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4, fontWeight: 700 }}>
                    Não foi possível identificar. Confira o CPF e tente novamente.
                  </p>
                )}
              </div>
              <div>
                <label style={lbl}>WHATSAPP</label>
                <input value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" style={inp(errs.telefone)} />
                {errs.telefone && <p style={errStyle}>{errs.telefone}</p>}
              </div>
            </div>

            {form.tipo_pessoa === 'PJ' && (
              <div style={{ display: 'grid', gap: 16, padding: 14, background: '#fafafa', border: '1px solid #ececec', borderRadius: 10 }}>
                <div>
                  <label style={lbl}>CNPJ</label>
                  <input value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" style={inp(errs.cnpj)} />
                  {errs.cnpj && <p style={errStyle}>{errs.cnpj}</p>}
                </div>
                <div>
                  <label style={lbl}>RAZÃO SOCIAL</label>
                  <input value={form.razao_social} onChange={set('razao_social')} placeholder="Razão social da empresa" style={inp(errs.razao_social)} />
                  {errs.razao_social && <p style={errStyle}>{errs.razao_social}</p>}
                </div>
              </div>
            )}

            <div>
              <label style={lbl}>E-MAIL</label>
              <input value={form.email} onChange={set('email')} type="email" placeholder="seu@email.com" style={inp(errs.email)} />
              {errs.email && <p style={errStyle}>{errs.email}</p>}
            </div>

            <div>
              <label style={lbl}>NÚMERO DO SEU PEDIDO <span style={{ color: '#a3a3a3', fontWeight: 400, fontSize: 10 }}>(opcional)</span></label>
              <input value={form.po_number} onChange={set('po_number')} placeholder="Ex: PO-2026-001" style={inp()} />
              <p style={{ fontSize: 10, color: '#737373', marginTop: 4 }}>
                Se você usa um sistema interno e quer rastrear este pedido com seu próprio número.
              </p>
            </div>

            <div className="ck-cid-uf" style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 14 }}>
              <div>
                <label style={lbl}>CIDADE</label>
                <input value={form.cidade} onChange={set('cidade')} placeholder="Cidade" style={inp(errs.cidade)} />
                {errs.cidade && <p style={errStyle}>{errs.cidade}</p>}
              </div>
              <div>
                <label style={lbl}>UF</label>
                <input value={form.uf} onChange={set('uf')} placeholder="UF" maxLength={2} style={inp(errs.uf)} />
                {errs.uf && <p style={errStyle}>{errs.uf}</p>}
              </div>
            </div>
            <div>
              <label style={lbl}>NOME DO RETIRADOR <span style={{ color: '#a3a3a3', fontWeight: 400, fontSize: 10 }}>(opcional)</span></label>
              <input value={nomeRetirador} onChange={e => setNomeRetirador(e.target.value)}
                placeholder="Nome de quem irá retirar em loja"
                style={inp()} />
              <p style={{ fontSize: 10, color: '#737373', marginTop: 4 }}>Deixe em branco para usar seu próprio nome.</p>
            </div>

            {/* honeypot */}
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off"
              value={form.honeypot}
              onChange={e => setForm(p => ({ ...p, honeypot: e.target.value }))}
              style={{ position: 'absolute', left: -9999, top: -9999, width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />
          </div>

          <CrossSellStrip items={crossSell} onAdd={adicionarCrossSell} />

          {globalErr && (
            <p style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              {globalErr}
            </p>
          )}

          <button
            onClick={() => {
              if (lookupBlocked) {
                setGlobalErr('Não foi possível concluir. Tente novamente em instantes.')
                return
              }
              if (validateGuest()) placeOrder(form, userId, nomeRetirador)
            }}
            disabled={!podeFinalizar}
            style={{ marginTop: 20, width: '100%', padding: '16px', background: '#8b5cf6', color: '#000', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: !podeFinalizar ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', boxShadow: '0 4px 16px rgba(109,40,217,0.25)', transition: 'all 0.2s', opacity: !podeFinalizar ? 0.4 : 1 }}
            onMouseEnter={e => { if (podeFinalizar) { const b = e.currentTarget as HTMLButtonElement; b.style.boxShadow = '0 6px 20px rgba(109,40,217,0.35)'; b.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.boxShadow = '0 4px 16px rgba(109,40,217,0.25)'; b.style.transform = 'none' }}>
            {submitting ? 'Processando...' : 'Finalizar Pedido →'}
          </button>
          <p style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#a3a3a3' }}>🔒 Seus dados são criptografados e protegidos</p>
        </div>

        {/* summary */}
        <div className="ck-guest-summary" style={{ position: 'sticky', top: 80 }}>
          <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #ececec', background: '#fafafa' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#525252', letterSpacing: '0.1em', margin: 0 }}>RESUMO DO PEDIDO</p>
            </div>
            <div style={{ padding: '16px 20px', maxHeight: 380, overflowY: 'auto' }}>
              {itens.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#fafafa' }}>
                    <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: '#0a0a0a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ fontSize: 11, color: '#737373', margin: 0 }}>×{item.quantity}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', whiteSpace: 'nowrap' }}>{fmtBRL(item.usd * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #ececec' }}>
              <CuponsList cupons={cupons} cupomCodigo={cupomCodigo} setCupomCodigo={setCupomCodigo}
                aplicarCupom={aplicarCupom} removerCupom={removerCupom} cupomLoading={cupomLoading} cupomErr={cupomErr} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#404040' }}>
                <span>Subtotal</span><span>R$ {totalBRLStr}</span>
              </div>
              {descontoBRL > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#ef4444' }}>
                  <span>Desconto ({cupomDescontoPct}%)</span><span>-R$ {descontoBRL.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: '#404040' }}>
                <span>Retirada em loja</span>
                <span style={{ color: '#6d28d9', fontWeight: 700 }}>Sem custo</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #ececec', fontSize: 20, fontWeight: 900 }}>
                <span style={{ color: '#0a0a0a' }}>Total</span>
                <span style={{ color: '#6d28d9' }}>R$ {totalFinalStr}</span>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 700 }}>Pagamento via PIX</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
