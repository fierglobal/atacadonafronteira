'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useListaRecompra } from '@/components/ListaRecompraContext'
import { WHATSAPP_NUMBER } from '@/lib/site'

const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ListaRecompra() {
  const router = useRouter()
  const { itens, carregando, logado, remover } = useListaRecompra()
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  // Visitante com lista local cai aqui via link da sidebar — exige login,
  // mesmo padrão do checkout. Ao voltar logado, a lista já estará sincronizada.
  useEffect(() => {
    if (!carregando && !logado) router.replace('/conta/login?redirect=/conta/minha-conta/recompra')
  }, [carregando, logado, router])

  useEffect(() => {
    setSelecionados(new Set(itens.map(i => i.id)))
  }, [itens])

  const toggle = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const itensSelecionados = itens.filter(i => selecionados.has(i.id))
  const totalEstimado = itensSelecionados.reduce((s, i) => s + i.brlPrice, 0)

  const pedirCotacao = () => {
    if (!itensSelecionados.length) return
    const linhas = itensSelecionados.map(i => `• ${i.name}${i.brand ? ` (${i.brand})` : ''} — ${fmt(i.brlPrice)}`).join('\n')
    const msg = encodeURIComponent(`Olá! Quero pedir cotação dos seguintes produtos da minha lista de recompra:\n\n${linhas}\n\nTotal estimado: ${fmt(totalEstimado)}`)
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
  }

  if (carregando || !logado) return <div style={{ minHeight: 200 }} />

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8, marginTop: 0, color: '#0a0a0a', textTransform: 'uppercase' }}>Lista de Recompra</h1>
      <p style={{ fontSize: 14, color: '#737373', marginBottom: 40 }}>Produtos salvos para pedir de novo ou cotar em lote.</p>

      {itens.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 24, padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ color: '#737373', fontSize: 14, marginBottom: 16 }}>Nenhum produto salvo ainda.</p>
          <p style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
            Clique em &quot;Salvar para recomprar depois&quot; na página de qualquer produto para montar sua lista.
          </p>
          <Link href="/produtos" style={{ color: '#420E76', fontWeight: 900, fontSize: 13, textDecoration: 'none' }}>Ver catálogo →</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {itens.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <input type="checkbox" checked={selecionados.has(item.id)} onChange={() => toggle(item.id)}
                  aria-label={`Selecionar ${item.name}`}
                  style={{ width: 18, height: 18, accentColor: '#420E76', cursor: 'pointer', flexShrink: 0 }} />
                <Link href={`/produtos/${item.id}`} style={{ width: 64, height: 64, background: '#fafafa', borderRadius: 10, overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid #f5f5f5' }}>
                  <Image src={item.img} alt={item.name} fill style={{ objectFit: 'contain', padding: 6 }} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {item.brand && <p style={{ fontSize: 9, fontWeight: 900, color: '#420E76', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{item.brand}</p>}
                  <Link href={`/produtos/${item.id}`} style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </Link>
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#420E76', margin: '4px 0 0' }}>{fmt(item.brlPrice)}</p>
                </div>
                <button onClick={() => remover(item.id)} aria-label="Remover da lista"
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 900, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                {itensSelecionados.length} de {itens.length} selecionado{itens.length === 1 ? '' : 's'}
              </p>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#0a0a0a', margin: '2px 0 0' }}>{fmt(totalEstimado)}</p>
            </div>
            <button onClick={pedirCotacao} disabled={!itensSelecionados.length}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: itensSelecionados.length ? '#25d366' : '#ececec', color: itensSelecionados.length ? '#fff' : '#a3a3a3', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: 13, letterSpacing: '0.02em', cursor: itensSelecionados.length ? 'pointer' : 'not-allowed', boxShadow: itensSelecionados.length ? '0 8px 20px -4px rgba(37,211,102,0.35)' : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Pedir Cotação
            </button>
          </div>
        </>
      )}
    </div>
  )
}
