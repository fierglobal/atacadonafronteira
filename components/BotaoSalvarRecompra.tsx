'use client'
import { useListaRecompra, type ItemSalvo } from '@/components/ListaRecompraContext'

export default function BotaoSalvarRecompra({ produto }: { produto: ItemSalvo }) {
  const { estaSalvo, salvar, remover } = useListaRecompra()
  const salvo = estaSalvo(produto.id)

  return (
    <button
      onClick={() => (salvo ? remover(produto.id) : salvar(produto))}
      aria-label={salvo ? 'Remover da lista de recompra' : 'Salvar na lista de recompra'}
      aria-pressed={salvo}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '12px 0', marginTop: 10, borderRadius: 12,
        background: salvo ? 'rgba(214,168,101,0.06)' : '#ffffff',
        border: `1px solid ${salvo ? 'rgba(214,168,101,0.3)' : '#d4d4d4'}`,
        color: salvo ? '#9D7133' : '#404040',
        fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
        cursor: 'pointer', transition: 'all 0.15s',
      }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill={salvo ? '#9D7133' : 'none'} stroke={salvo ? '#9D7133' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      </svg>
      {salvo ? 'Salvo na lista de recompra' : 'Salvar para recomprar depois'}
    </button>
  )
}
