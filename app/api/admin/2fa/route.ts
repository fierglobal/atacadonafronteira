import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession, logAudit } from '@/lib/admin-auth'
import { Secret, TOTP } from 'otpauth'
import QRCode from 'qrcode'

// GET: status do 2FA do próprio usuário
export async function GET() {
  const sess = await getAdminSession()
  if (!sess || sess.user_id === 'legacy') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('totp_enabled, email')
    .eq('id', sess.user_id)
    .single()
  return NextResponse.json({ enabled: data?.totp_enabled || false, email: data?.email || '' })
}

// POST: gera secret novo + QR code (não ativa ainda)
export async function POST() {
  const sess = await getAdminSession()
  if (!sess || sess.user_id === 'legacy') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('email')
    .eq('id', sess.user_id)
    .single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const secret = new Secret({ size: 20 })
  const secretB32 = secret.base32
  const totp = new TOTP({ issuer: 'Atacado na Fronteira', label: user.email, secret, digits: 6, period: 30 })
  const otpauthUrl = totp.toString()
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 240, margin: 1 })

  await supabaseAdmin.from('admin_users').update({ totp_secret: secretB32, totp_enabled: false }).eq('id', sess.user_id)

  return NextResponse.json({ secret: secretB32, qr: qrDataUrl })
}

// PATCH: confirma código TOTP e ativa
export async function PATCH(req: Request) {
  const sess = await getAdminSession()
  if (!sess || sess.user_id === 'legacy') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })

  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('totp_secret')
    .eq('id', sess.user_id)
    .single()
  if (!user?.totp_secret) return NextResponse.json({ error: 'Setup não iniciado' }, { status: 400 })

  const totp = new TOTP({ secret: Secret.fromBase32(user.totp_secret), digits: 6, period: 30 })
  const delta = totp.validate({ token: String(token).replace(/\D/g, ''), window: 1 })
  if (delta === null) return NextResponse.json({ error: 'Código inválido' }, { status: 401 })

  await supabaseAdmin.from('admin_users').update({ totp_enabled: true }).eq('id', sess.user_id)
  await logAudit({ action: '2fa_enabled', entity: 'admin_user', entity_id: sess.user_id })
  return NextResponse.json({ ok: true })
}

// DELETE: desativa 2FA (exige código)
export async function DELETE(req: Request) {
  const sess = await getAdminSession()
  if (!sess || sess.user_id === 'legacy') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token } = await req.json()
  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('totp_secret, totp_enabled')
    .eq('id', sess.user_id)
    .single()
  if (!user?.totp_enabled) return NextResponse.json({ ok: true })

  const totp = new TOTP({ secret: Secret.fromBase32(user.totp_secret!), digits: 6, period: 30 })
  const delta = totp.validate({ token: String(token).replace(/\D/g, ''), window: 1 })
  if (delta === null) return NextResponse.json({ error: 'Código inválido' }, { status: 401 })

  await supabaseAdmin.from('admin_users').update({ totp_enabled: false, totp_secret: null }).eq('id', sess.user_id)
  await logAudit({ action: '2fa_disabled', entity: 'admin_user', entity_id: sess.user_id })
  return NextResponse.json({ ok: true })
}
