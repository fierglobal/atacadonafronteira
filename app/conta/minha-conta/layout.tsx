import MinhaContaNav from './MinhaContaNav'

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="conta-layout" style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a', display: 'flex' }}>
      <style>{`
        @media (max-width: 900px) {
          .conta-layout { flex-direction: column !important; }
          .conta-main { padding: 24px 16px 80px !important; }
        }
      `}</style>
      <MinhaContaNav />
      <main className="conta-main" style={{ flex: 1, minWidth: 0, padding: '48px 48px 80px', maxWidth: 900 }}>
        {children}
      </main>
    </div>
  )
}
