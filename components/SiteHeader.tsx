import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import HeaderActions from '@/components/HeaderActions'
import Logo from '@/components/Logo'
import { WHATSAPP_HREF } from '@/lib/site'

const CONTATO_HREF = WHATSAPP_HREF

export const revalidate = 300

type Categoria = { id: string; nome: string; parent_id: string | null }
export type NavItem = { id: string; nome: string; subs: { id: string; nome: string }[] }

async function getTopCats(): Promise<NavItem[]> {
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
    const comProduto = (c: Categoria) =>
      (counts[c.id] || 0) > 0 || cats.some(ch => ch.parent_id === c.id && (counts[ch.id] || 0) > 0)
    const filhas = (id: string) =>
      cats.filter(ch => ch.parent_id === id && (counts[ch.id] || 0) > 0).map(ch => ({ id: ch.id, nome: ch.nome }))

    const raizes = cats.filter(c => !c.parent_id).filter(comProduto)

    // Departamento único (só Farmácia): as filhas sobem para o primeiro nível, senão
    // o menu teria um item só. Com dois ou mais departamentos, cada um vira um item
    // com dropdown das suas categorias — é como o Expresso Paraguai navega.
    const base: NavItem[] = raizes.length === 1
      ? filhas(raizes[0].id).map(f => ({ ...f, subs: [] }))
      : raizes.map(r => ({ id: r.id, nome: r.nome, subs: filhas(r.id) }))

    const total = (it: NavItem) =>
      (counts[it.id] || 0) + it.subs.reduce((s, f) => s + (counts[f.id] || 0), 0)
    return base.sort((a, b) => total(b) - total(a))
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
            <div key={c.id} className="nav-item">
              <a href={`/?cat=${c.id}#catalogo`} className="nav-cat-btn">
                {c.nome.toUpperCase()}
                {c.subs.length > 0 && <span className="nav-caret" aria-hidden="true">▾</span>}
              </a>
              {c.subs.length > 0 && (
                <div className="nav-dropdown">
                  {c.subs.map(s => (
                    <a key={s.id} href={`/?cat=${s.id}#catalogo`} className="nav-drop-item">{s.nome}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <HeaderActions topCats={topCats} contatoHref={CONTATO_HREF} />
      </div>
    </header>
  )
}
