'use client'
import { useEffect, useState } from 'react'

export default function Seguranca() {
  const [status, setStatus] = useState<{ enabled: boolean; email: string } | null>(null)
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null)
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const r = await fetch('/api/admin/2fa')
    if (r.ok) setStatus(await r.json())
  }
  useEffect(() => { load() }, [])

  const startSetup = async () => {
    setBusy(true); setMsg('')
    const r = await fetch('/api/admin/2fa', { method: 'POST' })
    if (r.ok) setSetup(await r.json())
    else setMsg('Erro ao iniciar setup')
    setBusy(false)
  }

  const confirmTotp = async () => {
    setBusy(true); setMsg('')
    const r = await fetch('/api/admin/2fa', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const d = await r.json()
    if (r.ok) { setMsg('✓ 2FA ativado'); setSetup(null); setToken(''); load() }
    else setMsg(d.error || 'Código inválido')
    setBusy(false)
  }

  const disable = async () => {
    const t = prompt('Digite o código do app para desativar:')
    if (!t) return
    setBusy(true); setMsg('')
    const r = await fetch('/api/admin/2fa', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    })
    const d = await r.json()
    if (r.ok) { setMsg('2FA desativado'); load() }
    else setMsg(d.error || 'Código inválido')
    setBusy(false)
  }

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Segurança</h1>
      <p style={{ color: 'var(--a-text3)', fontSize: 13, marginBottom: 24 }}>Autenticação em dois fatores (TOTP)</p>

      {!status && <p>Carregando...</p>}

      {status && status.enabled && !setup && (
        <div style={{ padding: 20, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12 }}>
          <p style={{ color: '#A965ED', fontWeight: 700, marginBottom: 12 }}>✓ 2FA ativo</p>
          <p style={{ fontSize: 13, color: 'var(--a-text2)', marginBottom: 16 }}>Sua conta exige código do app autenticador no login.</p>
          <button onClick={disable} disabled={busy}
            style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Desativar 2FA
          </button>
        </div>
      )}

      {status && !status.enabled && !setup && (
        <div style={{ padding: 20, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--a-text2)', marginBottom: 16 }}>2FA não ativado. Ative para reforçar a segurança da sua conta de administrador.</p>
          <button onClick={startSetup} disabled={busy}
            style={{ padding: '10px 16px', background: '#A965ED', border: 'none', color: '#000', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
            {busy ? 'Gerando...' : 'Configurar 2FA'}
          </button>
        </div>
      )}

      {setup && (
        <div style={{ padding: 20, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12 }}>
          <p style={{ fontSize: 13, marginBottom: 12 }}><strong>1.</strong> Abra o Google Authenticator, Authy ou similar e leia o QR code:</p>
          <img src={setup.qr} alt="QR Code" style={{ display: 'block', margin: '0 auto 16px', background: '#fff', borderRadius: 8 }} />
          <p style={{ fontSize: 12, color: 'var(--a-text3)', textAlign: 'center', marginBottom: 16 }}>
            Ou digite manualmente: <code style={{ background: 'var(--a-bg)', padding: '4px 8px', borderRadius: 4 }}>{setup.secret}</code>
          </p>
          <p style={{ fontSize: 13, marginBottom: 8 }}><strong>2.</strong> Digite o código de 6 dígitos do app:</p>
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="000000" maxLength={6}
            style={{ width: '100%', padding: '11px 14px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 18, textAlign: 'center', letterSpacing: '0.3em', marginBottom: 12 }} />
          <button onClick={confirmTotp} disabled={busy || token.length !== 6}
            style={{ width: '100%', padding: '12px', background: '#A965ED', border: 'none', color: '#000', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 14, opacity: token.length !== 6 ? 0.5 : 1 }}>
            {busy ? 'Validando...' : 'Confirmar e Ativar'}
          </button>
        </div>
      )}

      {msg && <p style={{ marginTop: 16, fontSize: 13, color: msg.startsWith('✓') ? '#A965ED' : '#ef4444' }}>{msg}</p>}
    </div>
  )
}
