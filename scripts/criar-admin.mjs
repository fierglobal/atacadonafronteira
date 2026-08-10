#!/usr/bin/env node
/**
 * Cria (ou atualiza) um usuário admin com senha bcrypt.
 *
 * Uso:
 *   node scripts/criar-admin.mjs "Nome do Admin" email@dominio.com 'SenhaForte123'
 *
 * Sem nenhum admin cadastrado, o login só funciona pelo fallback legado
 * (ADMIN_PASSWORD no env), que entra como 'dono' e não registra auditoria
 * nominal nem permite 2FA por usuário.
 */
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'

for (const linha of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const [nome, email, senha] = process.argv.slice(2)
if (!nome || !email || !senha) {
  console.error('uso: node scripts/criar-admin.mjs "Nome" email@dominio.com \'Senha\'')
  process.exit(1)
}
if (senha.length < 10) {
  console.error('erro: use uma senha de pelo menos 10 caracteres.')
  process.exit(1)
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const senha_hash = await bcrypt.hash(senha, 12)
const { data, error } = await db
  .from('admin_users')
  .upsert(
    { nome, email, senha_hash, senha_algo: 'bcrypt', role: 'dono', ativo: true, permissions: {} },
    { onConflict: 'email' },
  )
  .select('id, nome, email, role')
  .single()

if (error) {
  console.error('falhou:', error.message)
  process.exit(1)
}
console.log('admin pronto:', data)
console.log('Ative o 2FA em /admin/seguranca depois do primeiro login.')
