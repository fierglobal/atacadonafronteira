import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

export async function GET() {
  const auth = await requireAdmin('marketing', 'r')
  if (auth) return auth
  const { data } = await supabaseAdmin.from('configuracoes').select('home_config').eq('id', 'default').single()
  return NextResponse.json(data?.home_config || null)
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin('marketing', 'rw')
  if (auth) return auth
  const body = await req.json()
  const { error } = await supabaseAdmin
    .from('configuracoes')
    .upsert({ id: 'default', home_config: body, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit({ action: 'update', entity: 'home_config', entity_id: 'default', diff: body })
  return NextResponse.json({ ok: true })
}
