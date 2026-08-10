import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'
import Papa from 'papaparse'

type Row = Record<string, string>

const ALLOWED = ['nome', 'cpf', 'telefone', 'email', 'cidade', 'uf', 'cnpj', 'razao_social', 'ie', 'origem', 'aniversario', 'tags']

function coerce(row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    if (!ALLOWED.includes(k)) continue
    const v = (row[k] || '').trim()
    if (v === '') continue
    if (k === 'tags') out[k] = v.split(/[;,]/).map(s => s.trim()).filter(Boolean)
    else out[k] = v
  }
  return out
}

export async function POST(req: Request) {
  const auth = await requireAdmin('clientes', 'rw')
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
    if (!row.nome) { errors.push({ row: i + 2, reason: 'nome obrigatório' }); return }
    if (!row.telefone && !row.email && !row.cpf) { errors.push({ row: i + 2, reason: 'telefone, email ou CPF obrigatório' }); return }
    valid.push(row)
  })

  if (mode === 'preview') {
    return NextResponse.json({ preview: true, total: parsed.data.length, valid: valid.length, errors, sample: valid.slice(0, 5) })
  }

  if (!valid.length) return NextResponse.json({ error: 'Nenhuma linha válida', errors }, { status: 400 })

  let inserted = 0
  for (let i = 0; i < valid.length; i += 200) {
    const chunk = valid.slice(i, i + 200)
    const { error } = await supabaseAdmin.from('customers').insert(chunk)
    if (error) return NextResponse.json({ error: error.message, inserted, errors }, { status: 500 })
    inserted += chunk.length
  }

  await logAudit({ action: 'import', entity: 'customers', entity_id: null, diff: { total: parsed.data.length, inserted, errors: errors.length } })

  return NextResponse.json({ ok: true, total: parsed.data.length, inserted, errors })
}
