'use client'

import { useState } from 'react'
import Link from 'next/link'

// Lista de marcas pode passar de 100 itens (ex: Perfumes) — sem busca, achar
// uma marca específica é rolar a lista inteira. Filtro só no cliente (a lista
// completa já veio do servidor), então digitar não recarrega a página.
export default function FiltroMarcas({ marcas, hrefTodas, hrefMarcaTemplate, marcaAtiva }: {
  marcas: [string, number][]
  hrefTodas: string
  /** URL com o placeholder __MARCA__ no lugar do nome — função não dá pra passar
      de Server pra Client Component (RSC não serializa função), então o
      servidor manda um molde de string em vez de um closure. */
  hrefMarcaTemplate: string
  marcaAtiva?: string
}) {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const filtradas = termo ? marcas.filter(([nome]) => nome.toLowerCase().includes(termo)) : marcas

  const sidebarLink = (ativo: boolean): React.CSSProperties => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 8, fontSize: 13, textDecoration: 'none',
    fontWeight: ativo ? 800 : 600,
    background: ativo ? 'rgba(214,168,101,0.08)' : 'transparent',
    color: ativo ? '#9D7133' : '#404040',
  })

  return (
    <>
      {marcas.length > 8 && (
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar marca…"
          aria-label="Buscar marca"
          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #ececec', background: '#fafafa', fontSize: 12.5, marginBottom: 8, boxSizing: 'border-box' }} />
      )}
      <div className="cat-filter-list">
        <Link href={hrefTodas} style={sidebarLink(!marcaAtiva)}>Todas as marcas</Link>
        {termo && filtradas.length === 0 && (
          <p style={{ fontSize: 12, color: '#a3a3a3', padding: '6px 10px', margin: 0 }}>Nenhuma marca encontrada</p>
        )}
        {filtradas.map(([nome, qtd]) => (
          <Link key={nome} href={hrefMarcaTemplate.replace('__MARCA__', encodeURIComponent(nome))} style={sidebarLink(marcaAtiva === nome)}>
            <span>{nome}</span>
            <span style={{ opacity: 0.6, fontWeight: 600, fontSize: 11.5 }}>{qtd}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
