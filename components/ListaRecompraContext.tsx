'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

export type ItemSalvo = {
  id: string // product_id
  name: string
  brand?: string
  img: string
  brlPrice: number
}

type ListaRecompraCtx = {
  itens: ItemSalvo[]
  carregando: boolean
  logado: boolean
  estaSalvo: (productId: string) => boolean
  salvar: (item: ItemSalvo) => void
  remover: (productId: string) => void
}

const Ctx = createContext<ListaRecompraCtx | null>(null)
const STORAGE_KEY = 'apnovo_recompra'

function lerLocal(): ItemSalvo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function gravarLocal(itens: ItemSalvo[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(itens)) } catch {}
}

export function ListaRecompraProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemSalvo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const syncedRef = useRef(false)

  // Visitante: lê a lista salva localmente assim que a página monta.
  useEffect(() => {
    queueMicrotask(() => { setItens(lerLocal()); setCarregando(false) })
  }, [])

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      setUserId(user?.id || null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt: AuthChangeEvent, session: Session | null) => {
      setUserId(session?.user?.id || null)
      if (!session?.user) syncedRef.current = false
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Ao logar: sobe pro banco o que estava só local (upsert ignora duplicata via
  // unique(user_id, product_id)), limpa o local e recarrega sempre do banco —
  // único jeito de o preço/nome exibidos nunca ficarem desatualizados.
  useEffect(() => {
    if (!userId || syncedRef.current) return
    syncedRef.current = true
    const supabase = getSupabaseClient()
    setCarregando(true)
    ;(async () => {
      const pendentesLocais = lerLocal()
      if (pendentesLocais.length) {
        await supabase.from('produtos_salvos')
          .upsert(pendentesLocais.map(i => ({ user_id: userId, product_id: i.id })), { onConflict: 'user_id,product_id', ignoreDuplicates: true })
        gravarLocal([])
      }
      const { data } = await supabase
        .from('produtos_salvos')
        .select('product_id, products(id, name, brand, img_url, brl_price)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      type Row = { product_id: string; products: { id: string; name: string; brand: string | null; img_url: string | null; brl_price: number } | null }
      const remoto: ItemSalvo[] = ((data || []) as unknown as Row[])
        .filter(r => r.products)
        .map(r => ({ id: r.products!.id, name: r.products!.name, brand: r.products!.brand || undefined, img: r.products!.img_url || '/produto-placeholder.svg', brlPrice: Number(r.products!.brl_price) }))
      setItens(remoto)
      setCarregando(false)
    })()
  }, [userId])

  const estaSalvo = (productId: string) => itens.some(i => i.id === productId)

  const salvar = (item: ItemSalvo) => {
    if (estaSalvo(item.id)) return
    setItens(prev => [item, ...prev])
    if (userId) {
      const supabase = getSupabaseClient()
      supabase.from('produtos_salvos').upsert({ user_id: userId, product_id: item.id }, { onConflict: 'user_id,product_id', ignoreDuplicates: true }).then(() => {})
    } else {
      gravarLocal([item, ...lerLocal().filter(i => i.id !== item.id)])
    }
  }

  const remover = (productId: string) => {
    setItens(prev => prev.filter(i => i.id !== productId))
    if (userId) {
      const supabase = getSupabaseClient()
      supabase.from('produtos_salvos').delete().eq('user_id', userId).eq('product_id', productId).then(() => {})
    } else {
      gravarLocal(lerLocal().filter(i => i.id !== productId))
    }
  }

  return (
    <Ctx.Provider value={{ itens, carregando, logado: !!userId, estaSalvo, salvar, remover }}>
      {children}
    </Ctx.Provider>
  )
}

export function useListaRecompra() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useListaRecompra fora do ListaRecompraProvider')
  return ctx
}
