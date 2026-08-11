import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import HeaderActions from '@/components/HeaderActions'
import Logo from '@/components/Logo'
import { WHATSAPP_HREF } from '@/lib/site'

const CONTATO_HREF = WHATSAPP_HREF

export const revalidate = 300

type Categoria = { id: string; nome: string; parent_id: string | null }

async function getTopCats(): Promise<{ id: string; nome: string }[]> {
  try {
    const { data } = await supabaseAdmin
      .from('categorias')
      .select('id, nome, parent_id')
    const cats = (data || []) as Categoria[]
    const productCounts = await supabaseAdmin
      .from('products')
      .select('categoria_id')
      .eq('ativo', true)
    const counts: Record<string, number> = {}
    for (const p of (productCounts.data || [])) {
      if (p.categoria_id) counts[p.categoria_id] = (counts[p.categoria_id] || 0) + 1
    }
    const topCats = cats
      .filter(c => !c.parent_id)
      .filter(c => (counts[c.id] || 0) > 0 || cats.some(ch => ch.parent_id === c.id && (counts[ch.id] || 0) > 0))
      .map(c => {
        const totalChildren = cats.filter(ch => ch.parent_id === c.id).reduce((s, ch) => s + (counts[ch.id] || 0), 0)
        return { id: c.id, nome: c.nome, total: (counts[c.id] || 0) + totalChildren }
      })
      .sort((a, b) => b.total - a.total)
      .map(({ id, nome }) => ({ id, nome }))
    return topCats
  } catch { return [] }
}

export default async function SiteHeader() {
  const topCats = await getTopCats()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo" aria-label="Atacado na Fronteira">
          <Logo size={30} />
        </Link>

        <nav className="nav-desktop" aria-label="Categorias">
          <Link href="/" className="nav-cat-btn">TODOS</Link>
          {topCats.slice(0, 5).map(c => (
            <a key={c.id} href={`/?cat=${c.id}#catalogo`} className="nav-cat-btn">
              {c.nome.toUpperCase()}
            </a>
          ))}
        </nav>

        <HeaderActions topCats={topCats} contatoHref={CONTATO_HREF} />
      </div>
    </header>
  )
}
