'use client'
import { useState } from 'react'

type PreviewResult = {
  preview: boolean
  total: number
  valid: number
  errors: { row: number; reason: string }[]
  sample: Record<string, unknown>[]
}

type CommitResult = {
  ok: boolean
  total: number
  inserted: number
  errors: { row: number; reason: string }[]
}

export default function ImportarProdutos() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [committed, setCommitted] = useState<CommitResult | null>(null)

  const doPreview = async () => {
    if (!file) return
    setBusy(true); setMsg(''); setPreview(null); setCommitted(null)
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch('/api/admin/produtos/import?mode=preview', { method: 'POST', body: fd })
    const d = await r.json()
    if (!r.ok) { setMsg(d.error || 'Erro'); setBusy(false); return }
    setPreview(d)
    setBusy(false)
  }

  const doCommit = async () => {
    if (!file) return
    setBusy(true); setMsg('')
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch('/api/admin/produtos/import?mode=commit', { method: 'POST', body: fd })
    const d = await r.json()
    if (!r.ok) { setMsg(d.error || 'Erro'); setBusy(false); return }
    setCommitted(d)
    setPreview(null)
    setBusy(false)
  }

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Importar Produtos (CSV)</h1>
      <p style={{ color: 'var(--a-text3)', fontSize: 13, marginBottom: 24 }}>
        Faça upload de um arquivo CSV com cabeçalho. Colunas aceitas: name, titulo, descricao, brand, categoria_id, usd_price, usd_price_promo, usd_price_qty, qty_min, custo, img_url, video_url, ativo, sort_order, estoque, sku, peso, largura, altura, comprimento, slug, meta_titulo, meta_descricao.
        Obrigatórias: <strong>name, usd_price</strong>.
      </p>

      <div style={{ padding: 20, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, marginBottom: 20 }}>
        <input type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setCommitted(null); setMsg('') }}
          style={{ display: 'block', marginBottom: 16, fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={doPreview} disabled={!file || busy}
            style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--a-border)', color: 'var(--a-text)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: !file || busy ? 0.5 : 1 }}>
            {busy && !preview ? 'Analisando...' : 'Pré-visualizar'}
          </button>
          {preview && preview.valid > 0 && (
            <button onClick={doCommit} disabled={busy}
              style={{ padding: '10px 16px', background: '#A965ED', border: 'none', color: '#000', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800, opacity: busy ? 0.5 : 1 }}>
              {busy ? 'Importando...' : `Importar ${preview.valid} linhas`}
            </button>
          )}
        </div>
        {msg && <p style={{ marginTop: 12, color: '#ef4444', fontSize: 13 }}>{msg}</p>}
      </div>

      {preview && (
        <div style={{ padding: 20, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            <strong>Pré-visualização:</strong>{' '}
            <span style={{ color: '#A965ED' }}>{preview.valid} válidas</span> · {preview.total} totais · <span style={{ color: '#ef4444' }}>{preview.errors.length} erros</span>
          </p>
          {preview.errors.length > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: '#ef4444' }}>Ver erros</summary>
              <ul style={{ fontSize: 12, color: 'var(--a-text2)', marginTop: 8 }}>
                {preview.errors.slice(0, 20).map((e, i) => <li key={i}>Linha {e.row}: {e.reason}</li>)}
                {preview.errors.length > 20 && <li>... e mais {preview.errors.length - 20}</li>}
              </ul>
            </details>
          )}
          <p style={{ fontSize: 12, color: 'var(--a-text3)', marginBottom: 8 }}>Amostra:</p>
          <pre style={{ background: 'var(--a-bg)', padding: 12, borderRadius: 8, fontSize: 11, overflow: 'auto', maxHeight: 240 }}>
            {JSON.stringify(preview.sample, null, 2)}
          </pre>
        </div>
      )}

      {committed && (
        <div style={{ padding: 20, background: 'rgba(169, 101, 237,0.06)', border: '1px solid rgba(169, 101, 237,0.3)', borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: '#A965ED', fontWeight: 700 }}>✓ Importação concluída</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Inseridos/atualizados: <strong>{committed.inserted}</strong> de {committed.total}
          </p>
          {committed.errors.length > 0 && (
            <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 6 }}>
              {committed.errors.length} linhas com erro (não importadas)
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 16, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12 }}>
        <p style={{ fontSize: 12, color: 'var(--a-text3)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.1em' }}>EXEMPLO DE CSV</p>
        <pre style={{ background: 'var(--a-bg)', padding: 12, borderRadius: 8, fontSize: 11, overflow: 'auto' }}>{`name,brand,usd_price,estoque,ativo,sku
"Maca Peruana 60 caps","Atacado na Fronteira",15.50,100,true,MAC60
"Whey Isolate 1kg","Atacado na Fronteira",42.00,50,true,WHY1K`}</pre>
      </div>
    </div>
  )
}
