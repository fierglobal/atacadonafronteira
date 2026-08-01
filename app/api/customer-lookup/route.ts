import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIp } from '@/lib/rate-limit'

const onlyDigits = (s: string) => s.replace(/\D/g, '')

export async function POST(req: Request) {
  const rl = rateLimit(`customer-lookup:${getIp(req)}`, 30, 60_000)
  if (!rl.ok) return NextResponse.json({ found: false }, { status: 429 })
  const { cpf } = await req.json()
  if (!cpf) return NextResponse.json({ found: false })
  const digits = onlyDigits(cpf)
  if (digits.length !== 11) return NextResponse.json({ found: false })

  const formatted = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  const { data } = await supabaseAdmin
    .from('customers')
    .select('nome, telefone, email, cidade, uf, cnpj, razao_social, bloqueado')
    .in('cpf', [digits, formatted])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return NextResponse.json({ found: false })
  if (data.bloqueado) return NextResponse.json({ found: false, blocked: true })

  return NextResponse.json({
    found: true,
    nome: data.nome || '', telefone: data.telefone || '', email: data.email || '',
    cidade: data.cidade || '', uf: data.uf || '',
    cnpj: data.cnpj || '', razao_social: data.razao_social || '',
  })
}
