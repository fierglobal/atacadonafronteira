import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

type Event = { tipo: 'pedido' | 'nota' | 'audit' | 'carrinho'; data: string; titulo: string; detalhe?: string; ref_id?: string; meta?: Record<string, unknown> }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('clientes', 'r')
  if (auth) return auth
  const { id } = await params

  const { data: customer } = await supabaseAdmin.from('customers').select('email, telefone').eq('id', id).single()

  const [ordersR, notasR, auditR, carrinhosR] = await Promise.all([
    supabaseAdmin.from('orders').select('id, order_num, status, total_brl, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('customer_notes').select('id, texto, autor, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('audit_logs').select('action, user_nome, entity, entity_id, diff, created_at').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
    customer?.telefone
      ? supabaseAdmin.from('cart_sessions').select('id, itens, total_usd, contatado, created_at').eq('telefone', customer.telefone.replace(/\D/g, '')).order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ])

  const events: Event[] = []

  for (const o of (ordersR.data || [])) {
    events.push({ tipo: 'pedido', data: o.created_at, titulo: `Pedido ${o.order_num}`, detalhe: `${o.status} · R$ ${(o.total_brl || 0).toFixed(2).replace('.', ',')}`, ref_id: o.id, meta: { status: o.status } })
  }
  for (const n of (notasR.data || [])) {
    events.push({ tipo: 'nota', data: n.created_at, titulo: n.autor || 'Admin', detalhe: n.texto, ref_id: n.id })
  }
  for (const a of (auditR.data || [])) {
    events.push({ tipo: 'audit', data: a.created_at, titulo: `${a.user_nome || 'sistema'} · ${a.action}`, detalhe: a.entity, meta: { diff: a.diff } })
  }
  for (const c of (carrinhosR.data || [])) {
    const itens = Array.isArray(c.itens) ? c.itens.length : 0
    events.push({ tipo: 'carrinho', data: c.created_at, titulo: `Carrinho ${c.contatado ? '(contatado)' : 'abandonado'}`, detalhe: `${itens} item(ns) · USD ${(c.total_usd || 0).toFixed(2)}`, ref_id: c.id })
  }

  events.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  return NextResponse.json({ events: events.slice(0, 120) })
}
