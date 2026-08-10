type Bucket = { count: number; reset: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) }
  b.count++
  return { ok: true, retryAfter: 0 }
}

export function getIp(req: Request): string {
  const h = req.headers
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k)
  }, 60_000)
}
