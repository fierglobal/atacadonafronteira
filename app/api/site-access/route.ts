import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { senha } = await req.json()
  if (!senha || senha !== process.env.PREVIEW_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('site_access', process.env.PREVIEW_PASSWORD!, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
