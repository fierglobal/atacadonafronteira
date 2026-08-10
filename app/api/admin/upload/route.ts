import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(req: Request) {
  const auth = await requireAdmin('produtos', 'rw')
  if (auth) return auth

  const form = await req.formData()
  const file = form.get('file') as File | null
  const slug = (form.get('slug') as string | null) || 'produto'

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${slug}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('produtos')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('produtos').getPublicUrl(fileName)
  return NextResponse.json({ url: publicUrl })
}
