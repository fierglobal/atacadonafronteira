'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'

type Banner = {
  tag: string; title1: string; title2: string; sub: string
  cta: string; color: string; productImg: string; productLabel: string
}

const DEFAULT_BANNERS: Banner[] = [
  { tag: 'MAIS VENDIDO', title1: 'BIOGENESIS', title2: 'EMAGRECIMENTO', sub: 'A marca mais procurada do catálogo. Tirzepatida com procedência garantida e estoque permanente.', cta: 'VER OFERTA', color: '#C08EF2', productImg: '', productLabel: '' },
  { tag: 'LINHA PREMIUM', title1: 'ZPHC', title2: 'PEPTÍDEOS', sub: 'A marca de performance mais respeitada da Europa. Estoque permanente e rastreabilidade completa.', cta: 'EXPLORAR ZPHC', color: '#C293F2', productImg: '', productLabel: '' },
]

const COLORS = [
  { value: '#C08EF2', label: 'Roxo claro' },
  { value: '#C293F2', label: 'Roxo' },
  { value: '#F6C019', label: 'Amarelo' },
]

const inp = { width: '100%', padding: '9px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)', borderRadius: 7, color: 'var(--a-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }
const lbl = { fontSize: 10, color: 'var(--a-text2)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 5 } as const

export default function AdminHome() {
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS)
  const [destaques, setDestaques] = useState<string[]>([])
  const [produtos, setProdutos] = useState<{ id: string; name: string; img_url: string }[]>([])
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/home').then(r => r.json()),
      fetch('/api/admin/produtos-list?perPage=5000').then(r => r.json()),
    ]).then(([cfg, prodsRes]) => {
      if (cfg) {
        if (cfg.banners) setBanners(cfg.banners)
        if (cfg.destaques) setDestaques(cfg.destaques)
        if (cfg.aviso !== undefined) setAviso(cfg.aviso)
      }
      const prods = Array.isArray(prodsRes) ? prodsRes : (prodsRes.rows || [])
      const dec = (s: string | null) => { try { return s ? atob(s) : null } catch { return s } }
      setProdutos(prods.map((p: any) => ({ ...p, name: dec(p.name) ?? p.name })))
      setLoading(false)
    })
  }, [])

  const setBanner = (i: number, k: keyof Banner, v: string) =>
    setBanners(prev => prev.map((b, idx) => idx === i ? { ...b, [k]: v } : b))

  const toggleDestaque = (id: string) =>
    setDestaques(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/home', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banners, destaques, aviso }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }} />

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Personalização da Home</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>Edite banners, aviso e produtos em destaque sem deploy</p>
      </div>

      {/* Aviso */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 22, marginBottom: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', margin: '0 0 14px' }}>BARRA DE AVISO (topo da home)</p>
        <input value={aviso} onChange={e => setAviso(e.target.value)}
          placeholder="Ex: 🚀 Frete grátis acima de USD 300 · Novos peptídeos em estoque"
          style={inp} />
        <p style={{ fontSize: 11, color: 'var(--a-text3)', margin: '6px 0 0' }}>Deixe vazio para ocultar</p>
      </div>

      {/* Banners */}
      {banners.map((b, i) => (
        <div key={i} style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
            <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--a-text2)', letterSpacing: '0.1em', margin: 0 }}>BANNER {i + 1}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>TAG (acima do título)</label>
              <input value={b.tag} onChange={e => setBanner(i, 'tag', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>TÍTULO — LINHA 1</label>
              <input value={b.title1} onChange={e => setBanner(i, 'title1', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>TÍTULO — LINHA 2 (colorida)</label>
              <input value={b.title2} onChange={e => setBanner(i, 'title2', e.target.value)} style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>SUBTÍTULO</label>
              <input value={b.sub} onChange={e => setBanner(i, 'sub', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>TEXTO DO BOTÃO CTA</label>
              <input value={b.cta} onChange={e => setBanner(i, 'cta', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>COR DO BANNER</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c.value} onClick={() => setBanner(i, 'color', c.value)}
                    title={c.label}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c.value, border: b.color === c.value ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer', boxShadow: b.color === c.value ? `0 0 10px ${c.value}` : 'none', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>NOME DO PRODUTO NO BANNER</label>
              <input value={b.productLabel} onChange={e => setBanner(i, 'productLabel', e.target.value)} placeholder="Ex: BIOGENESIS RETATRUTIDE 40MG" style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>URL DA IMAGEM DO PRODUTO</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input value={b.productImg} onChange={e => setBanner(i, 'productImg', e.target.value)} placeholder="https://..." style={{ ...inp, flex: 1 }} />
                {b.productImg && (
                  <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: 'var(--a-bg)', flexShrink: 0, position: 'relative' }}>
                    <Image src={b.productImg} alt="" fill style={{ objectFit: 'contain' }} unoptimized />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Destaques */}
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 22, marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', letterSpacing: '0.1em', margin: '0 0 6px' }}>PRODUTOS EM DESTAQUE</p>
        <p style={{ fontSize: 12, color: 'var(--a-text3)', margin: '0 0 16px' }}>
          Os selecionados aparecem primeiro na grade da home. {destaques.length > 0 && <span style={{ color: '#3b82f6', fontWeight: 700 }}>{destaques.length} selecionados</span>}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {produtos.map(p => {
            const sel = destaques.includes(p.id)
            return (
              <div key={p.id} onClick={() => toggleDestaque(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${sel ? 'rgba(59,130,246,0.5)' : 'var(--a-border)'}`, background: sel ? 'rgba(59,130,246,0.08)' : 'var(--a-bg)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: 'var(--a-border)', flexShrink: 0, position: 'relative' }}>
                  {p.img_url && <Image src={p.img_url} alt="" fill style={{ objectFit: 'cover' }} unoptimized />}
                </div>
                <p style={{ fontSize: 11, color: sel ? '#3b82f6' : 'var(--a-text2)', fontWeight: sel ? 700 : 400, margin: 0, lineHeight: 1.3, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {p.name}
                </p>
                {sel && <span style={{ fontSize: 14, color: '#3b82f6', flexShrink: 0 }}>✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={save} disabled={saving}
          style={{ padding: '12px 32px', background: saving ? 'var(--a-border)' : '#A965ED', color: saving ? 'var(--a-text2)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#A965ED', fontWeight: 700 }}>✓ Salvo com sucesso</span>}
        <a href="/" target="_blank" rel="noopener"
          style={{ fontSize: 12, color: 'var(--a-text3)', textDecoration: 'none', marginLeft: 'auto', border: '1px solid var(--a-border)', padding: '9px 16px', borderRadius: 8 }}>
          Ver home →
        </a>
      </div>
    </div>
  )
}
