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
    <div className="cookie-banner" style={{
      // sobe quando a barra de pedido mínimo está no rodapé (ver MinimoBar)
      position: 'fixed', bottom: 'calc(16px + var(--minimo-bar-h, 0px))', left: 16, right: 16, zIndex: 9999,
      maxWidth: 720, margin: '0 auto', padding: 16,
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(66, 14, 118,0.25)', borderRadius: 12,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' as const,
    }}>
      <div className="cookie-banner-text" style={{ flex: '1 1 280px', fontSize: 12, color: '#525252', lineHeight: 1.55 }}>
        Usamos cookies essenciais para o site funcionar e analíticos para entender uso.
        Veja nossa <a href="/politica-privacidade" style={{ color: '#420E76', textDecoration: 'underline' }}>Política de Privacidade</a>.
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => decide('essential')}
          style={{ padding: '9px 16px', background: 'transparent', border: '1px solid #d4d4d4', borderRadius: 8, color: '#404040', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Apenas essenciais
        </button>
        <button onClick={() => decide('all')}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(66, 14, 118,0.25)' }}>
          Aceitar todos
        </button>
      </div>
      <style>{`
        /* Em 320px o banner de 2 linhas + botões cobria o CTA "Ver farmácia"
           inteiro na primeira tela. Texto vira 1 linha truncada abaixo de 380px
           — a política continua a um clique, só a explicação encolhe. */
        @media (max-width: 380px) {
          .cookie-banner-text { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        }
      `}</style>
    </div>
  )
}
