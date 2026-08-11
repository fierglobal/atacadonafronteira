import SiteHeader from '@/components/SiteHeader'
import { WHATSAPP_ENABLED, WHATSAPP_NUMBER } from '@/lib/site'

export const revalidate = 3600

const WA_NUMBER = WHATSAPP_NUMBER
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Olá! Quero informações sobre retirada.')}`
const PHONE_DISPLAY = '+595 994 222774'
const ADDRESS_LINE1 = 'Av. Carlos Antonio López 7000'
const ADDRESS_LINE2 = 'Cd. del Este 100136 — Paraguai'
const MAPS_LINK = 'https://www.google.com/maps?ll=-25.510525,-54.610327&z=14&t=m&hl=pt-BR&gl=US&mapclient=embed&q=Av.+Carlos+Antonio+L%C3%B3pez+7000+Cd.+del+Este+100136+Paraguai'
const MAPS_EMBED = 'https://www.google.com/maps?q=Av.+Carlos+Antonio+L%C3%B3pez+7000+Cd.+del+Este+100136+Paraguai&hl=pt-BR&z=15&output=embed'

const HORARIO = [
  { dia: 'Segunda a Sexta', horas: '09:00 — 18:00' },
  { dia: 'Sábado', horas: '09:00 — 13:00' },
  { dia: 'Domingo', horas: 'Fechado' },
]

export default function OndeRetirarPage() {
  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', color: '#0a0a0a' }}>
      <style>{`
        .contact-card:hover { border-color: rgba(66, 14, 118,0.4) !important; transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important; }
        .contact-card { transition: all 0.22s; }
        .maps-btn:hover { background: #A965ED !important; color: #000 !important; box-shadow: 0 8px 24px rgba(66, 14, 118,0.35) !important; }
        .maps-btn { transition: all 0.2s; }
        .wa-btn:hover { background: #1ebd5d !important; box-shadow: 0 8px 24px rgba(37,211,102,0.4) !important; transform: translateY(-2px); }
        .wa-btn { transition: all 0.2s; }
        @media (max-width: 768px) {
          .cards-row { grid-template-columns: 1fr 1fr !important; }
          .iframe-wrap { height: 320px !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteHeader />

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 32px' }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'rgba(66, 14, 118,0.08)', border: '1px solid rgba(66, 14, 118,0.3)', borderRadius: 99, color: '#420E76', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', marginBottom: 18 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A965ED', boxShadow: '0 0 6px rgba(66, 14, 118,0.6)' }} />
              LOJA FÍSICA
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08, margin: '0 0 18px' }}>
              Onde <span style={{ color: '#420E76' }}>retirar</span> seu pedido
            </h1>
            <p style={{ fontSize: 15, color: '#525252', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 480 }}>
              Trabalhamos exclusivamente com retirada na loja em Ciudad del Este, Paraguai. Após confirmação do PIX, seu pedido fica pronto em até 24h úteis.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
              <a href={MAPS_LINK} target="_blank" rel="noopener" className="maps-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', background: '#0a0a0a', color: '#ffffff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Abrir no Google Maps
              </a>
              {WHATSAPP_ENABLED && (
                <a href={WA_LINK} target="_blank" rel="noopener" className="wa-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', background: '#25d366', color: '#ffffff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="contact-card" style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: '0.14em', margin: '0 0 16px' }}>ENDEREÇO</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(66, 14, 118,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px' }}>{ADDRESS_LINE1}</p>
                <p style={{ fontSize: 14, color: '#525252', margin: 0 }}>{ADDRESS_LINE2}</p>
              </div>
            </div>

            {WHATSAPP_ENABLED && (
              <>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: '0.14em', margin: '0 0 16px' }}>CONTATO</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 22 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,211,102,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', margin: '0 0 2px' }}>WHATSAPP</p>
                    <a href={WA_LINK} target="_blank" rel="noopener" style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', textDecoration: 'none' }}>{PHONE_DISPLAY}</a>
                  </div>
                </div>
              </>
            )}

            <p style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: '0.14em', margin: '0 0 12px' }}>HORÁRIO DE ATENDIMENTO</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {HORARIO.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: h.horas === 'Fechado' ? '#a3a3a3' : '#404040', padding: '4px 0' }}>
                  <span style={{ fontWeight: 600 }}>{h.dia}</span>
                  <span style={{ fontFamily: 'monospace' }}>{h.horas}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 80px' }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="iframe-wrap" style={{ position: 'relative', height: 480, background: '#fafafa' }}>
            <iframe src={MAPS_EMBED}
              title="Localização Atacado na Fronteira"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fafafa', borderTop: '1px solid #ececec', gap: 12, flexWrap: 'wrap' as const }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', margin: '0 0 2px' }}>{ADDRESS_LINE1}</p>
              <p style={{ fontSize: 12, color: '#737373', margin: 0 }}>{ADDRESS_LINE2}</p>
            </div>
            <a href={MAPS_LINK} target="_blank" rel="noopener"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#ffffff', color: '#420E76', border: '1px solid rgba(66, 14, 118,0.4)', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em' }}>
              Ver no Google Maps
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>
            </a>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 24px', color: '#0a0a0a' }}>Como retirar seu pedido</h2>
        <div className="cards-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { n: '1', t: 'Faça seu pedido', d: 'Adicione produtos ao carrinho e finalize na nossa loja online.' },
            { n: '2', t: 'Pague via PIX', d: 'Use a chave PIX ou copie o código. Envie o comprovante para agilizar.' },
            { n: '3', t: 'Aguarde confirmação', d: 'Após validar o PIX, separamos seu pedido em até 24h úteis.' },
            { n: '4', t: 'Retire na loja', d: 'Apresente o número do pedido e seu documento. Pronto!' },
          ].map(s => (
            <div key={s.n} className="contact-card" style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, padding: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#420E76', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, marginBottom: 12 }}>{s.n}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a', margin: '0 0 6px' }}>{s.t}</p>
              <p style={{ fontSize: 12, color: '#525252', lineHeight: 1.55, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ background: '#fafafa', borderTop: '1px solid #ececec', padding: '24px', textAlign: 'center' as const }}>
        <p style={{ color: '#a3a3a3', fontSize: 11, letterSpacing: '0.05em', margin: 0 }}>© 2026 ATACADO NA FRONTEIRA — Cd. del Este, Paraguai</p>
      </footer>
    </div>
  )
}
