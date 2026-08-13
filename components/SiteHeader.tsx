import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getConfig } from '@/lib/config'
import HeaderActions from '@/components/HeaderActions'
import Logo from '@/components/Logo'
import { MARCAS_VITRINE, WHATSAPP_HREF } from '@/lib/site'

const CONTATO_HREF = WHATSAPP_HREF

export const revalidate = 300

type Categoria = { id: string; nome: string; parent_id: string | null }
export type NavItem = { id: string; nome: string; subs: { id: string; nome: string }[]; marca?: string }

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

// Vitrines de marca só entram no menu se tiverem produto ativo — senão o
// cliente clica e cai num catálogo vazio.
async function getVitrines(): Promise<NavItem[]> {
  if (MARCAS_VITRINE.length === 0) return []
  try {
    const { data } = await supabaseAdmin
      .from('products')
      .select('brand')
      .eq('ativo', true)
      .in('brand', MARCAS_VITRINE)
    const comProduto = new Set((data || []).map(p => p.brand as string))
    return MARCAS_VITRINE.filter(m => comProduto.has(m))
      .map(m => ({ id: `marca-${m}`, nome: m, subs: [], marca: m }))
  } catch { return [] }
}

export default async function SiteHeader() {
  const [cats, vitrines, config] = await Promise.all([getTopCats(), getVitrines(), getConfig().catch(() => null)])
  const minimo = config?.pedido_minimo_brl
    ? `R$ ${Number(config.pedido_minimo_brl).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    : null
  // Departamentos primeiro, vitrines depois. O menu é cortado a partir do fim
  // (slice + media query), então o que vem por último é o que some em tela
  // menor — e é melhor perder um atalho de marca do que a porta de entrada de
  // um departamento inteiro. Com as vitrines na frente, a 1050px sobravam só
  // APPLE/XIAOMI/JBL e sumiam Farmácia e Eletrônicos.
  const topCats = [...cats, ...vitrines]

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
              <a href={c.marca ? `/?marca=${encodeURIComponent(c.marca)}#catalogo` : `/?cat=${c.id}#catalogo`} className="nav-cat-btn">
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
      {/* Condições do atacado sempre à vista: são critério de qualificação —
          quem não fecha R$ 1.000 precisa saber antes de montar carrinho. */}
      <div className="header-strip" aria-label="Condições de compra">
        {minimo && <span><b>Pedido mínimo {minimo}</b></span>}
        <span>PIX à vista</span>
        <span>Retirada em loja ou entrega em Foz do Iguaçu</span>
        <span>Preços em USD</span>
        <span>Separação em até 24h úteis</span>
      </div>
    </header>
  )
}
