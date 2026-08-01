import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import { dispatchWebhook } from '@/lib/webhooks'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('webhooks', 'rw')
  if (auth) return auth
  const { id } = await params
  const { data: hook } = await supabaseAdmin
    .from('webhooks')
    .select('id, url, secret, events, ativo, nome')
    .eq('id', id)
    .single()
  if (!hook) return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
  if (!hook.ativo) return NextResponse.json({ error: 'Webhook inativo' }, { status: 400 })

  const originalEvents = Array.isArray(hook.events) ? hook.events : []
  const needsPatch = !originalEvents.includes('order.created')
  if (needsPatch) {
    await supabaseAdmin.from('webhooks').update({ events: [...originalEvents, 'order.created'] }).eq('id', id)
  }
  try {
    await dispatchWebhook('order.created' as never, { test: true, webhook_id: id, ts: new Date().toISOString() })
  } finally {
    if (needsPatch) {
      await supabaseAdmin.from('webhooks').update({ events: originalEvents }).eq('id', id)
    }
  }
  await logAudit({ action: 'test', entity: 'webhook', entity_id: id })
  return NextResponse.json({ ok: true })
}
