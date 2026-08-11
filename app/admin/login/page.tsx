'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [totp, setTotp] = useState('')
  const [needs2fa, setNeeds2fa] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw, totp: needs2fa ? totp : undefined }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.ok) {
      router.push('/admin')
      return
    }
    if (d.needs2fa) {
      setNeeds2fa(true)
      setErr(d.error || '')
      setLoading(false)
      return
    }
    setErr(d.error || 'Email ou senha incorretos')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`input:focus { border-color: rgba(139,92,246,0.5) !important; outline: none; }`}</style>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Logo size={34} dark />
          <p style={{ color: '#444', fontSize: 12, marginTop: 12, letterSpacing: '0.1em' }}>PAINEL ADMINISTRATIVO</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoFocus required
            disabled={needs2fa}
            style={{ padding: '14px 16px', background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', fontSize: 15, width: '100%', boxSizing: 'border-box' as const, opacity: needs2fa ? 0.5 : 1 }}
          />
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Senha" required
            disabled={needs2fa}
            style={{ padding: '14px 16px', background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', fontSize: 15, width: '100%', boxSizing: 'border-box' as const, opacity: needs2fa ? 0.5 : 1 }}
          />
          {needs2fa && (
            <input
              type="text" inputMode="numeric" value={totp} onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código 2FA (6 dígitos)" maxLength={6} autoFocus
              style={{ padding: '14px 16px', background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', fontSize: 18, width: '100%', boxSizing: 'border-box' as const, textAlign: 'center', letterSpacing: '0.3em' }}
            />
          )}
          {err && <p style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>{err}</p>}
          <button type="submit" disabled={loading || (needs2fa && totp.length !== 6)}
            style={{ padding: '14px', background: '#8b5cf6', color: '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading || (needs2fa && totp.length !== 6) ? 0.5 : 1 }}>
            {loading ? 'Entrando...' : needs2fa ? 'Verificar Código' : 'Entrar'}
          </button>
          {needs2fa && (
            <button type="button" onClick={() => { setNeeds2fa(false); setTotp(''); setErr('') }}
              style={{ padding: '8px', background: 'transparent', color: '#666', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              ← Voltar
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
