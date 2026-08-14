'use client'
import { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { BRL_RATE_FALLBACK } from '@/lib/site'

export type Currency = { code: string; label: string; flag: string; rate: number }

// A taxa do real vem de configuracoes.brl_rate. Antes era 5.20 fixo aqui, enquanto
// o checkout já cobrava pela taxa do banco: a vitrine anunciava um preço e o cliente
// pagava outro. O guarani segue fixo porque não existe campo no banco para ele.
export function montarCurrencies(brlRate: number): Currency[] {
  return [
    { code: 'USD', label: 'Dólar', flag: 'https://flagcdn.com/w40/us.png', rate: 1 },
    { code: 'BRL', label: 'Real', flag: 'https://flagcdn.com/w40/br.png', rate: brlRate },
    { code: 'PYG', label: 'Guarani', flag: 'https://flagcdn.com/w40/py.png', rate: 7680 },
  ]
}

export type CartItem = {
  id: string
  name: string
  usd: number
  img: string
  brand?: string
  quantity: number
}

type CarrinhoCtx = {
  itens: CartItem[]
  currency: Currency
  currencies: Currency[]
  brlRate: number
  setCurrency: (c: Currency) => void
  sidebarAberto: boolean
  abrirSidebar: () => void
  fecharSidebar: () => void
  adicionar: (item: Omit<CartItem, 'quantity'>) => void
  remover: (id: string) => void
  atualizar: (id: string, qty: number) => void
  limpar: () => void
  totalUsd: number
  quantidade: number
}

const Ctx = createContext<CarrinhoCtx | null>(null)

function mergeCarts(local: CartItem[], remote: CartItem[], preferRemote: boolean): CartItem[] {
  const map = new Map<string, CartItem>()
  const first = preferRemote ? local : remote
  const second = preferRemote ? remote : local
  for (const i of first) if (i?.id) map.set(i.id, i)
  for (const i of second) {
    if (!i?.id) continue
    const existing = map.get(i.id)
    if (existing) map.set(i.id, { ...existing, quantity: Math.max(existing.quantity, i.quantity) })
    else map.set(i.id, i)
  }
  return Array.from(map.values())
}

export function CarrinhoProvider({ brlRate: brlRateInicial, children }: { brlRate?: number; children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>([])
  const [brlRate, setBrlRate] = useState(brlRateInicial ?? BRL_RATE_FALLBACK)
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [sidebarAberto, setSidebarAberto] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const remoteLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextSaveRef = useRef(true)

  const currencies = useMemo(() => montarCurrencies(brlRate), [brlRate])
  const currency = currencies.find(c => c.code === currencyCode) ?? currencies[0]

  // A home e o /checkout são páginas estáticas (○ no build): o brlRate que o layout
  // injeta fica congelado na geração e não acompanha a troca no admin. Uma leitura
  // no mount corrige. Começa com o valor do servidor pra não piscar preço no caso
  // normal, em que a taxa não mudou desde o último build.
  useEffect(() => {
    let vivo = true
    fetch('/api/config/loja')
      .then(r => r.json())
      .then((d: { brl_rate?: number }) => {
        if (vivo && typeof d?.brl_rate === 'number' && d.brl_rate > 0) setBrlRate(d.brl_rate)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('apnovo_cart')
      if (saved) setItens(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('apnovo_cart', JSON.stringify(itens))
  }, [itens])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      setUserId(user?.id || null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt: any, session: any) => {
      setUserId(session?.user?.id || null)
      if (!session?.user) remoteLoadedRef.current = false
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId || remoteLoadedRef.current) return
    remoteLoadedRef.current = true
    fetch('/api/cart/load').then(r => r.json()).then((d: { itens: CartItem[]; updatedAt: string | null }) => {
      const remote = Array.isArray(d.itens) ? d.itens : []
      if (!remote.length) return
      const localTs = Number(localStorage.getItem('apnovo_cart_ts') || 0)
      const remoteTs = d.updatedAt ? new Date(d.updatedAt).getTime() : 0
      const preferRemote = remoteTs >= localTs
      setItens(prev => {
        const merged = mergeCarts(prev, remote, preferRemote)
        skipNextSaveRef.current = true
        return merged
      })
    }).catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!userId) return
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const total_usd = itens.reduce((acc, i) => acc + i.usd * i.quantity, 0)
      fetch('/api/cart/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens, total_usd }),
      }).catch(() => {})
      try { localStorage.setItem('apnovo_cart_ts', String(Date.now())) } catch {}
    }, 2000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [itens, userId])

  const adicionar = (item: Omit<CartItem, 'quantity'>) => {
    setItens(prev => {
      const exists = prev.find(i => i.id === item.id)
      if (exists) {
        setToast('Quantidade atualizada')
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      setToast('Produto adicionado ao carrinho')
      return [...prev, { ...item, quantity: 1 }]
    })
    setSidebarAberto(true)
    import('@vercel/analytics').then(({ track }) => {
      track('add_to_cart', { product_id: item.id || '', product_name: item.name, brand: item.brand || '', usd: item.usd })
    }).catch(() => {})
  }

  const remover = (id: string) => setItens(prev => prev.filter(i => i.id !== id))

  const atualizar = (id: string, qty: number) => {
    if (qty <= 0) return remover(id)
    setItens(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }

  const limpar = () => setItens([])
  const totalUsd = itens.reduce((acc, i) => acc + i.usd * i.quantity, 0)
  const quantidade = itens.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <Ctx.Provider value={{ itens, currency, currencies, brlRate, setCurrency: (c: Currency) => setCurrencyCode(c.code), sidebarAberto, abrirSidebar: () => setSidebarAberto(true), fecharSidebar: () => setSidebarAberto(false), adicionar, remover, atualizar, limpar, totalUsd, quantidade }}>
      {children}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#A965ED', color: '#000', borderRadius: 99, padding: '10px 22px', fontSize: 13, fontWeight: 700, zIndex: 99999, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(169, 101, 237,0.3)' }}>
          {toast}
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useCarrinho() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCarrinho fora do CarrinhoProvider')
  return ctx
}
