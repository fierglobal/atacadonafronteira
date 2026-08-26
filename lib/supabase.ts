import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// PostgREST tem um limite de linhas por request (db-max-rows, hoje 1000 neste
// projeto) que IGNORA o .range() pedido pelo client sem avisar — um único
// .range(0, 4999) devolve no máximo 1000 linhas caladamente. Acima de 1000
// produtos ativos isso já derrubou contagem de categoria (Medicube sumiu do
// catálogo com total=0). Pagina de verdade até a página vir menor que o pedido.
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data } = await build(from, from + pageSize - 1)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    const val = (_supabase as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? val.bind(_supabase) : val
  },
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )
    }
    const val = (_supabaseAdmin as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? val.bind(_supabaseAdmin) : val
  },
})
