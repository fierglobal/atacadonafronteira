'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import Logo from '@/components/Logo'

export default function Login() {
  const router = useRouter()
  const [redirect, setRedirect] = useState('/checkout')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirect(params.get('redirect') || '/')

    getSupabaseClient().auth.getUser().then(({ data: { user } }: any) => {
      if (user) router.replace(params.get('redirect') || '/')
      else setChecking(false)
    })
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password: pw })
    if (error) {
      setErr('E-mail ou senha incorretos')
      setLoading(false)
    } else {
      router.push(redirect)
      router.refresh()
    }
  }

  const loginGoogle = async () => {
    setErr('')
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    })
    if (error) setErr('Erro ao iniciar login com Google')
  }

  if (checking) return <div style={{ minHeight: '100vh', background: '#fafafa' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`
        input:focus { border-color: rgba(109,40,217,0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(109,40,217,0.08); }
        input::placeholder { color: #a3a3a3; }
      `}</style>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <a href="/"><Logo size={32} /></a>
          <h1 style={{ fontSize: 18, fontWeight: 900, marginTop: 20, marginBottom: 4, color: '#0a0a0a' }}>Entrar na sua conta</h1>
          <p style={{ color: '#404040', fontSize: 13 }}>Para finalizar sua compra, faça login</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: '28px 28px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#404040', letterSpacing: '0.08em', marginBottom: 6 }}>E-MAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="seu@email.com"
                style={{ width: '100%', padding: '12px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, color: '#0a0a0a', fontSize: 14, boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#404040', letterSpacing: '0.08em', marginBottom: 6 }}>SENHA</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} required
                placeholder="Sua senha"
                style={{ width: '100%', padding: '12px 14px', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 8, color: '#0a0a0a', fontSize: 14, boxSizing: 'border-box' as const }} />
            </div>

            {err && <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', margin: 0 }}>{err}</p>}

            <button type="submit" disabled={loading}
              style={{ padding: '14px', background: '#8b5cf6', color: '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(109,40,217,0.25)' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: '#ececec' }} />
            <span style={{ fontSize: 11, color: '#a3a3a3', fontWeight: 600 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: '#ececec' }} />
          </div>

          <button type="button" onClick={loginGoogle}
            style={{ width: '100%', padding: '13px', background: '#fff', color: '#404040', border: '1px solid #d4d4d4', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Continuar com Google
          </button>

          <div style={{ borderTop: '1px solid #ececec', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#404040' }}>
              Não tem conta?{' '}
              <a href={`/conta/cadastro?redirect=${encodeURIComponent(redirect)}`}
                style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>
                Criar conta grátis
              </a>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ color: '#737373', fontSize: 12, textDecoration: 'none' }}>← Voltar ao catálogo</a>
        </p>
      </div>
    </div>
  )
}
