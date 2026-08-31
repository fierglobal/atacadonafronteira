import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import { getConfig } from '@/lib/config'
import { emailProntoRetirada } from '@/lib/email'
import { WILSON_ORDER_IDS, WILSON_PRODUCT_LISTA } from '@/lib/wilson-pedido-listas'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('pedidos', 'r')
  if (auth) return auth
  const { id } = await params

  const [{ data: order }, { data: statusHistory }, { data: acoes }, { data: items }] = await Promise.all([
    supabaseAdmin.from('orders').select('*, customers(*), order_items(*, products(img_url, categoria_id))').eq('id', id).single(),
    supabaseAdmin
      .from('order_status_history')
      .select('status, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    // Histórico de ações (tag/notas/etc) — mesma tabela de auditoria usada no
    // resto do admin, filtrada pra esse pedido.
    supabaseAdmin
      .from('audit_logs')
      .select('action, diff, user_nome, created_at')
      .eq('entity', 'pedido').eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('order_items')
      .select('product_name')
      .eq('order_id', id),
  ])

  // products.categoria_id não tem FK formal para categorias (schema sem a constraint),
  // então o PostgREST recusa o embed aninhado products(categorias(nome)) com PGRST200 —
  // resolvido à mão numa segunda query, reconstruindo os itens (sem mutar o embed original).
  if (order?.order_items?.length) {
    const itens = order.order_items as any[]
    const catIds = [...new Set(itens.map(i => i.products?.categoria_id).filter(Boolean))]
    const catMap = new Map<string, string>()
    if (catIds.length) {
      const { data: cats } = await supabaseAdmin.from('categorias').select('id, nome').in('id', catIds)
      ;(cats || []).forEach((c: any) => catMap.set(c.id, c.nome))
    }
    const isWilson = WILSON_ORDER_IDS.has(id)
    ;(order as any).order_items = itens.map(i => {
      const nome = isWilson
        ? (WILSON_PRODUCT_LISTA[i.product_id] || 'Outros')
        : (i.products && catMap.has(i.products.categoria_id) ? catMap.get(i.products.categoria_id) : null)
      return { ...i, products: i.products ? { ...i.products, categorias: nome ? { nome } : null } : null }
    })
  }

  const names = (items || []).map((i: any) => i.product_name)
  let stockMap: Record<string, number | null> = {}
  if (names.length > 0) {
    const { data: prods } = await supabaseAdmin
      .from('products')
      .select('name, estoque')
      .in('name', names)
    ;(prods || []).forEach((p: any) => { stockMap[p.name] = p.estoque })
  }

  const timeline = [
    ...(statusHistory || []).map(h => ({ tipo: 'status' as const, status: h.status, created_at: h.created_at })),
    ...(acoes || []).map(a => ({ tipo: 'acao' as const, action: a.action, diff: a.diff, user_nome: a.user_nome, created_at: a.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ order: order || null, history: statusHistory || [], timeline, stockMap })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('pedidos', 'rw')
  if (auth) return auth

  const { id } = await params
  const body = await req.json()

  if (body.status) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('status, order_num, total_brl, customers(nome, email)')
      .eq('id', id)
      .single()

    if (order && order.status !== body.status) {
      await supabaseAdmin.from('order_status_history').insert({ order_id: id, status: body.status })

      if (body.status === 'pronto_retirada') {
        const config = await getConfig()
        const customer = (order as any).customers
        if (customer?.email) {
          emailProntoRetirada(customer.email, customer.nome, order.order_num, order.total_brl).catch(() => {})
        }
        void config
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Status já vira linha própria em order_status_history — não duplica aqui.
  // Ação específica pra render melhor no histórico quando é só 1 campo.
  const campos = Object.keys(body)
  if (!(campos.length === 1 && campos[0] === 'status')) {
    const action = campos.length === 1 && campos[0] === 'tags' ? 'tags'
      : campos.length === 1 && campos[0] === 'notas' ? 'notas'
      : 'update'
    await logAudit({ action, entity: 'pedido', entity_id: id, diff: body })
  }
  return NextResponse.json({ ok: true })
}
