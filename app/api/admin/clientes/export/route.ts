import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, logAudit } from '@/lib/admin-auth'

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET() {
  const auth = await requireAdmin('clientes', 'r')
  if (auth) return auth

  const { data } = await supabaseAdmin
    .from('customers')
    .select('nome, cpf, telefone, email, cidade, uf, cnpj, razao_social, ie, tags, bloqueado, origem, aniversario, created_at')
    .order('created_at', { ascending: false })

  const headers = ['nome', 'cpf', 'telefone', 'email', 'cidade', 'uf', 'cnpj', 'razao_social', 'ie', 'tags', 'bloqueado', 'origem', 'aniversario', 'created_at']
  const lines = [headers.join(',')]
  for (const c of (data || [])) {
    const row = headers.map(h => {
      const v = (c as Record<string, unknown>)[h]
      if (Array.isArray(v)) return csvEscape(v.join(';'))
      return csvEscape(v)
    })
    lines.push(row.join(','))
  }
  const csv = lines.join('\n')

  await logAudit({ action: 'export', entity: 'customers', entity_id: null, diff: { count: data?.length || 0 } })

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
