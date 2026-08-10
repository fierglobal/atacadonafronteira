import { supabaseAdmin } from '@/lib/supabase'

export type WebhookEvent =
  | 'order.created'
  | 'order.status_changed'
  | 'order.comprovante_uploaded'
  | 'product.created'
  | 'product.updated'
  | 'customer.created'

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function dispatchWebhook(event: WebhookEvent, data: Record<string, unknown>) {
  const { data: hooks } = await supabaseAdmin
    .from('webhooks')
    .select('id, url, secret, events, ativo')
    .eq('ativo', true)
  if (!hooks?.length) return

  const matched = hooks.filter(h => Array.isArray(h.events) && h.events.includes(event))
  const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data })

  await Promise.all(matched.map(async (h) => {
    const sig = await hmacSha256(h.secret, payload)
    let status = 0, body = '', err: string | null = null
    try {
      const res = await fetch(h.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': sig,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      })
      status = res.status
      body = (await res.text()).slice(0, 2000)
    } catch (e) {
      err = e instanceof Error ? e.message : 'unknown'
    }
    await supabaseAdmin.from('webhook_deliveries').insert({
      webhook_id: h.id, event, payload: JSON.parse(payload),
      status_code: status, response_body: body, error: err,
      delivered_at: err ? null : new Date().toISOString(),
    })
  }))
}
