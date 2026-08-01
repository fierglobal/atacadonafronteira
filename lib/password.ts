import bcrypt from 'bcryptjs'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(plain: string): Promise<{ hash: string; algo: 'bcrypt' }> {
  return { hash: await bcrypt.hash(plain, 12), algo: 'bcrypt' }
}

export async function verifyPassword(plain: string, stored: string, algo: string | null): Promise<boolean> {
  if (algo === 'bcrypt' || stored.startsWith('$2')) {
    return bcrypt.compare(plain, stored)
  }
  const legacy = await sha256(plain)
  return legacy === stored
}
