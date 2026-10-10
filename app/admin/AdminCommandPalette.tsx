'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type NavItem = { href: string; label: string; icon: string }

export default function AdminCommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [results, setResults] = useState<NavItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) { setQuery(''); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults(items.slice(0, 8)); return }
    const q = query.toLowerCase()
    setResults(items.filter(i => i.label.toLowerCase().includes(q)).slice(0, 8))
    setSelected(0)
  }, [query, items])

  const go = useCallback((href: string) => {
    router.push(href); onClose()
  }, [router, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) go(results[selected].href)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selected, go, onClose])

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar página..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: '#0f172a', caretColor: '#9D7133' }}
          />
          <kbd style={{ fontSize: 10, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 6px' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>Nenhum resultado</p>
          ) : (
            results.map((r, i) => (
              <button key={r.href} onClick={() => go(r.href)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: i === selected ? 'rgba(214,168,101,0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderLeft: i === selected ? '2px solid #9D7133' : '2px solid transparent' }}
                onMouseEnter={() => setSelected(i)}>
                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke={i === selected ? '#9D7133' : '#cbd5e1'} strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={r.icon} />
                </svg>
                <span style={{ flex: 1, fontSize: 14, color: i === selected ? '#9D7133' : '#475569' }}>{r.label}</span>
              </button>
            ))
          )}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
          <span><kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px' }}>↑↓</kbd> navegar</span>
          <span><kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px' }}>↵</kbd> abrir</span>
        </div>
      </div>
    </div>
  )
}
