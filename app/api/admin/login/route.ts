import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, hashPassword } from '@/lib/password'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { Secret, TOTP } from 'otpauth'

function legacyToken() {
  return createHash('sha256').update(`legacy:${process.env.ADMIN_PASSWORD}`).digest('hex')
}

export async function POST(req: Request) {
  const ip = getIp(req)
  const rl = rateLimit(`admin-login:${ip}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Muitas tentativas. Tente em instantes.' }, { status: 429 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const { email, password, totp } = body as { email?: string; password?: string; totp?: string }
  if (!email || !password) return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })

  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('id, nome, role, senha_hash, senha_algo, ativo, totp_enabled, totp_secret')
    .eq('email', email)
    .single()

  if (user && user.ativo) {
    const ok = await verifyPassword(password, user.senha_hash, user.senha_algo)
    if (!ok) return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })

    if (user.totp_enabled) {
      if (!totp) return NextResponse.json({ needs2fa: true }, { status: 200 })
      const t = new TOTP({ secret: Secret.fromBase32(user.totp_secret!), digits: 6, period: 30 })
      const delta = t.validate({ token: String(totp).replace(/\D/g, ''), window: 1 })
      if (delta === null) return NextResponse.json({ error: 'Código 2FA inválido', needs2fa: true }, { status: 401 })
    }

    if (user.senha_algo !== 'bcrypt') {
      const { hash, algo } = await hashPassword(password)
      await supabaseAdmin.from('admin_users').update({ senha_hash: hash, senha_algo: algo }).eq('id', user.id)
    }

    const { data: session } = await supabaseAdmin
      .from('admin_sessions')
      .insert({ user_id: user.id, user_nome: user.nome, user_role: user.role })
      .select('id')
      .single()
    if (!session) return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })

    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id, user_nome: user.nome, action: 'login', entity: 'admin_user', entity_id: user.id, ip,
    })

    const res = NextResponse.json({ ok: true })
    res.cookies.set('admin_token', session.id, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, path: '/',
    })
    return res
  }

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('admin_token', legacyToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, path: '/',
    })
    return res
  }

  return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_token')
  return res
}
