'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Smartphone, Laptop, Bot, Headphones, Speaker, Watch, Tablet, Package,
  FlaskConical, Syringe, Dumbbell, Sparkles, SprayCan, Globe, Gem, type LucideIcon,
} from 'lucide-react'
import { slugify } from '@/lib/slug'
import type { NavItem } from '@/components/SiteHeader'

// Ícone por nome de categoria — cai em Package (caixa genérica) pra qualquer
// categoria nova que ainda não tenha entrado aqui, sem quebrar o menu.
const ICONS: Record<string, LucideIcon> = {
  'Celular': Smartphone,
  'Notebook': Laptop,
  'Robô Aspirador': Bot,
  'Fones de Ouvido': Headphones,
  'Caixas de Som': Speaker,
  'Smart Watch': Watch,
  'Tablet': Tablet,
  'Acessórios': Package,
  'Peptídeos': FlaskConical,
  'Tirzepatida': Syringe,
  'Retatrutida': Syringe,
  'Anabolizantes': Dumbbell,
  'Estética': Sparkles,
  'Árabe': SprayCan,
  'Importados': Globe,
  'Nicho': Gem,
}

const catHref = (nome: string) => `/categoria/${slugify(nome)}`

export default function DesktopNav({ items }: { items: NavItem[] }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav className="nav-desktop" aria-label="Categorias">
      <Link href="/" className="nav-cat-btn" onMouseEnter={() => setHovered('todos')} onMouseLeave={() => setHovered(null)}>
        <span style={{ position: 'relative', zIndex: 1 }}>TODOS OS PRODUTOS</span>
        {hovered === 'todos' && <motion.div layoutId="nav-hover-bg" className="nav-hover-bg" />}
      </Link>

      {items.map(item => {
        const href = item.marca ? `/?marca=${encodeURIComponent(item.marca)}#catalogo` : catHref(item.nome)
        return (
          <div
            key={item.id}
            className="nav-item"
            onMouseEnter={() => setOpenMenu(item.subs.length > 0 ? item.id : null)}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <a
              href={href}
              className="nav-cat-btn"
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                {item.nome.toUpperCase()}
                {item.subs.length > 0 && (
                  <ChevronDown className="nav-caret-icon" style={{ transform: openMenu === item.id ? 'rotate(180deg)' : 'none' }} />
                )}
              </span>
              {(hovered === item.id || openMenu === item.id) && <motion.div layoutId="nav-hover-bg" className="nav-hover-bg" />}
            </a>

            <AnimatePresence>
              {openMenu === item.id && item.subs.length > 0 && (
                <div className="nav-mega-wrap">
                  <motion.div
                    className="nav-mega"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                  >
                    <div className={`nav-mega-grid ${item.subs.length > 5 ? 'nav-mega-grid-2col' : ''}`}>
                      {item.subs.map(sub => {
                        const Icon = ICONS[sub.nome] ?? Package
                        return (
                          <a key={sub.id} href={catHref(sub.nome)} className="nav-mega-item">
                            <span className="nav-mega-icon"><Icon size={18} strokeWidth={2} /></span>
                            <span>
                              <span className="nav-mega-item-label">{sub.nome}</span>
                              <span className="nav-mega-item-desc">{sub.total} produto{sub.total === 1 ? '' : 's'}</span>
                            </span>
                          </a>
                        )
                      })}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      <Link href="/#como-comprar" className="nav-cat-btn nav-cat-ajuda" onMouseEnter={() => setHovered('ajuda')} onMouseLeave={() => setHovered(null)}>
        <span style={{ position: 'relative', zIndex: 1 }}>COMO COMPRAR</span>
        {hovered === 'ajuda' && <motion.div layoutId="nav-hover-bg" className="nav-hover-bg" />}
      </Link>
    </nav>
  )
}
