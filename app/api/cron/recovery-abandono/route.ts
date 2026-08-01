import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Atacado na Fronteira <noreply@atacadonafronteira.app>'

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    return res.ok
  } catch { return false }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await getConfig()
  const minMinutes = config.recovery_abandono_min || 120
  const cutoff = new Date(Date.now() - minMinutes * 60_000).toISOString()
  const recentLimit = new Date(Date.now() - 24 * 60 * 60_000).toISOString()

  const { data: abandonos } = await supabaseAdmin
    .from('cart_sessions')
    .select('id, nome, telefone, email, itens, total_usd, created_at, contatado, convertido')
    .lt('created_at', cutoff)
    .gt('created_at', recentLimit)
    .is('convertido', null)
    .is('contatado', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!abandonos?.length) return NextResponse.json({ ok: true, processados: 0 })

  let enviados = 0
  for (const cart of abandonos) {
    const itensArr = Array.isArray(cart.itens) ? cart.itens : []
    const linhas = itensArr.slice(0, 5).map((i: { name?: string; qty?: number }) =>
      `<tr><td style="padding:6px 0;font-size:13px;color:#555">${i.name || ''} ×${i.qty || 1}</td></tr>`).join('')
    const totalBrl = (cart.total_usd || 0) * config.brl_rate

    if (cart.email) {
      const html = config.recovery_template || `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px"><tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="background:#0e0e0e;padding:32px;border-radius:12px;border:1px solid #1a1a1a">
        <h2 style="margin:0 0 8px;font-size:20px;color:#fff">Você esqueceu seu carrinho 🛒</h2>
        <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px">${cart.nome || 'Olá'}, seus itens ainda estão te esperando:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:10px;padding:16px;margin-bottom:20px">${linhas}</table>
        <p style="font-size:16px;color:#8b5cf6;font-weight:900;margin:0 0 24px">Total: R$ ${totalBrl.toFixed(2).replace('.', ',')}</p>
        <a href="https://atacadonafronteira.app/" style="display:inline-block;background:#8b5cf6;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">Finalizar Compra →</a>
        <p style="font-size:11px;color:#444;margin-top:24px">Atacado na Fronteira · WhatsApp ${config.whatsapp}</p>
        </td></tr></table></td></tr></table></body></html>`
      const ok = await sendEmail(cart.email, `${cart.nome || 'Olá'}, você esqueceu seu carrinho 🛒`, html)
      if (ok) enviados++
    }

    await supabaseAdmin.from('cart_sessions').update({ contatado: true }).eq('id', cart.id)
  }

  return NextResponse.json({ ok: true, processados: abandonos.length, enviados })
}
