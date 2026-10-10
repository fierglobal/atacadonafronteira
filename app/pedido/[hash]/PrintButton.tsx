'use client'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(214,168,101,0.1)', border: '1px solid rgba(214,168,101,0.2)', color: '#9D7133', fontSize: 11, fontWeight: 900, borderRadius: 10, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#D6A865'; e.currentTarget.style.color = '#111111' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(214,168,101,0.1)'; e.currentTarget.style.color = '#9D7133' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Imprimir Documento
    </button>
  )
}
