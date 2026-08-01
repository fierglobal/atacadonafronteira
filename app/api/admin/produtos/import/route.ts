import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import Papa from 'papaparse'

type Row = Record<string, string>

const REQUIRED = ['name', 'usd_price']
const ALLOWED = [
  'name', 'titulo', 'descricao', 'brand', 'categoria_id',
  'usd_price', 'usd_price_promo', 'usd_price_qty', 'qty_min', 'custo',
  'img_url', 'video_url', 'ativo', 'sort_order', 'estoque', 'sku',
  'peso', 'largura', 'altura', 'comprimento', 'slug', 'meta_titulo', 'meta_descricao',
]

const NUM = new Set(['usd_price', 'usd_price_promo', 'usd_price_qty', 'qty_min', 'custo', 'sort_order', 'estoque', 'peso', 'largura', 'altura', 'comprimento'])
const BOOL = new Set(['ativo'])

function coerce(row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    if (!ALLOWED.includes(k)) continue
    const v = (row[k] || '').trim()
    if (v === '') continue
    if (NUM.has(k)) {
      const n = parseFloat(v.replace(',', '.'))
      if (!isNaN(n)) out[k] = n
    } else if (BOOL.has(k)) {
      out[k] = /^(1|true|sim|yes)$/i.test(v)
    } else {
      out[k] = v
    }
  }
  return out
}

export async function POST(req: Request) {
  const auth = await requireAdmin('import', 'rw')
  if (auth) return auth

  const ct = req.headers.get('content-type') || ''
  let csvText = ''
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    csvText = await file.text()
  } else {
    const { csv } = await req.json()
    csvText = csv || ''
  }
  if (!csvText.trim()) return NextResponse.json({ error: 'CSV vazio' }, { status: 400 })

  const parsed = Papa.parse<Row>(csvText, { header: true, skipEmptyLines: true })
  if (parsed.errors.length) return NextResponse.json({ error: 'CSV inválido', details: parsed.errors.slice(0, 5) }, { status: 400 })

  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') || 'preview'

  const valid: Record<string, unknown>[] = []
  const errors: { row: number; reason: string }[] = []

  parsed.data.forEach((raw, i) => {
    const row = coerce(raw)
    for (const k of REQUIRED) {
      if (row[k] === undefined || row[k] === '') {
        errors.push({ row: i + 2, reason: `${k} obrigatório` })
        return
      }
    }
    valid.push(row)
  })

  if (mode === 'preview') {
    return NextResponse.json({ preview: true, total: parsed.data.length, valid: valid.length, errors, sample: valid.slice(0, 5) })
  }

  if (!valid.length) return NextResponse.json({ error: 'Nenhuma linha válida', errors }, { status: 400 })

  const chunkSize = 200
  let inserted = 0
  for (let i = 0; i < valid.length; i += chunkSize) {
    const chunk = valid.slice(i, i + chunkSize)
    const { error } = await supabaseAdmin.from('products').upsert(chunk, { onConflict: 'slug' })
    if (error) return NextResponse.json({ error: error.message, inserted, errors }, { status: 500 })
    inserted += chunk.length
  }

  await logAudit({ action: 'import', entity: 'product', entity_id: null, diff: { total: parsed.data.length, inserted, errors: errors.length } })

  return NextResponse.json({ ok: true, total: parsed.data.length, inserted, errors })
}
