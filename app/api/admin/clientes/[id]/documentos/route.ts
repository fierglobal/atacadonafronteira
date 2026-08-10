import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, getAdminSession, logAudit } from '@/lib/admin-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('clientes', 'r')
  if (auth) return auth
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('customer_documents')
    .select('id, nome, url, tipo, tamanho, uploaded_by, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  // Bucket `documentos` é privado (guarda documento pessoal de cliente).
  // A coluna `url` guarda o path; o link de leitura é assinado e expira.
  const comLink = await Promise.all((data || []).map(async d => {
    if (!d.url || /^https?:\/\//.test(d.url)) return d
    const { data: signed } = await supabaseAdmin.storage
      .from('documentos').createSignedUrl(d.url, 60 * 10)
    return { ...d, url: signed?.signedUrl || '' }
  }))
  return NextResponse.json(comLink)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('clientes', 'rw')
  if (auth) return auth
  const { id } = await params
  const sess = await getAdminSession()
  const ct = req.headers.get('content-type') || ''
  let nome = '', url = '', tipo: string | null = null, tamanho: number | null = null

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    nome = String(form.get('nome') || (file instanceof File ? file.name : 'documento'))
    if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    tipo = file.type
    tamanho = file.size
    const ext = file.name.split('.').pop() || 'bin'
    const path = `clientes/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error: upErr } = await supabaseAdmin.storage.from('documentos').upload(path, file, { upsert: false, contentType: file.type })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    // Guarda o path, não uma URL pública — o bucket é privado.
    url = path
  } else {
    const body = await req.json()
    nome = body.nome
    url = body.url
    tipo = body.tipo || null
    tamanho = body.tamanho || null
    if (!nome || !url) return NextResponse.json({ error: 'Nome e URL obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('customer_documents')
    .insert({ customer_id: id, nome, url, tipo, tamanho, uploaded_by: sess?.nome || 'admin' })
    .select('id, nome, url, tipo, tamanho, uploaded_by, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'create', entity: 'customer_document', entity_id: data.id, diff: { customer_id: id, nome } })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin('clientes', 'rw')
  if (auth) return auth
  const { docId } = await req.json()
  await supabaseAdmin.from('customer_documents').delete().eq('id', docId)
  await logAudit({ action: 'delete', entity: 'customer_document', entity_id: docId })
  return NextResponse.json({ ok: true })
}
