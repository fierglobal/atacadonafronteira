'use client'
import { useEffect, useState } from 'react'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  // localStorage só existe no cliente, então a leitura precisa ser pós-montagem.
  // Roda uma única vez e não encadeia re-render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie-consent')) setShow(true)
    } catch {}
  }, [])

  const decide = (value: 'all' | 'essential') => {
    try { localStorage.setItem('cookie-consent', value) } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
      maxWidth: 720, margin: '0 auto', padding: 16,
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(109,40,217,0.25)', borderRadius: 12,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' as const,
    }}>
      <div style={{ flex: '1 1 280px', fontSize: 12, color: '#525252', lineHeight: 1.55 }}>
        Usamos cookies essenciais para o site funcionar e analíticos para entender uso.
        Veja nossa <a href="/politica-privacidade" style={{ color: '#6d28d9', textDecoration: 'underline' }}>Política de Privacidade</a>.
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => decide('essential')}
          style={{ padding: '9px 16px', background: 'transparent', border: '1px solid #d4d4d4', borderRadius: 8, color: '#404040', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Apenas essenciais
        </button>
        <button onClick={() => decide('all')}
          style={{ padding: '9px 18px', background: '#8b5cf6', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(109,40,217,0.25)' }}>
          Aceitar todos
        </button>
      </div>
    </div>
  )
}
