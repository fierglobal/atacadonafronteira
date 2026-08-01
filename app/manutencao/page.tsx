'use client'
import Image from 'next/image'
import { useState } from 'react'

const WA_LINK = 'https://wa.me/595994222774?text=' + encodeURIComponent('Olá! Vi que o site está em manutenção. Pode me atender?')

export default function ManutencaoPage() {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await fetch('/api/site-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })
      if (res.ok) {
        window.location.href = '/'
      } else {
        setErro('Senha incorreta. Tente novamente.')
      }
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 60%, #f0fdf0 100%)',
      color: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <Image src="/logo-fronteira-mockup.png" alt="Atacado na Fronteira" width={220} height={86} priority style={{ objectFit: 'contain' }} />
        </div>

        <div style={{ padding: '40px 36px', background: '#ffffff', border: '1px solid #ececec', borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.06)', marginBottom: 28 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.3)',
            borderRadius: 99, color: '#6d28d9', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px rgba(109,40,217,0.6)' }} />
            EM BREVE
          </span>

          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 38px)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 12px',
            color: '#0a0a0a',
          }}>
            ATACADO <span style={{ color: '#6d28d9' }}>PARAGUAI</span>
          </h1>
          <p style={{ fontSize: 15, color: '#737373', lineHeight: 1.6, margin: '0 0 32px' }}>
            Nosso site está passando por melhorias. Voltaremos em breve.
          </p>

          <div style={{ borderTop: '1px solid #ececec', paddingTop: 28, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#525252', marginBottom: 14, textTransform: 'uppercase' }}>
              Acesso antecipado
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Digite a senha"
                required
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: 8,
                  border: erro ? '1px solid #ef4444' : '1px solid #d4d4d4',
                  fontSize: 14, outline: 'none', color: '#0a0a0a',
                  background: '#fafafa',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '11px 20px', borderRadius: 8,
                  background: loading ? '#a3a3a3' : '#6d28d9',
                  color: '#ffffff', border: 'none',
                  fontSize: 13, fontWeight: 800, letterSpacing: '0.06em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? '...' : 'ENTRAR'}
              </button>
            </form>
            {erro && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#ef4444', textAlign: 'left' }}>{erro}</p>
            )}
          </div>

          <a href={WA_LINK} target="_blank" rel="noopener"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '12px 24px', background: '#25d366', color: '#ffffff',
              borderRadius: 10, textDecoration: 'none',
              fontSize: 13, fontWeight: 900, letterSpacing: '0.04em',
              boxShadow: '0 8px 24px rgba(37,211,102,0.25)',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            FALAR NO WHATSAPP
          </a>
        </div>

        <p style={{ fontSize: 11, color: '#a3a3a3', letterSpacing: '0.05em', margin: 0 }}>
          © 2026 ATACADO NA FRONTEIRA · Cd. del Este, Paraguai
        </p>
      </div>
    </div>
  )
}
