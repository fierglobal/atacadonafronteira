'use client'
import type { Cotacao, EntregaTipo } from '@/lib/entrega'

const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type Props = {
  cotacoes: Record<EntregaTipo, Cotacao> | null
  tipo: EntregaTipo
  onTipo: (t: EntregaTipo) => void
}

// Só existe retirada em Ciudad del Este — Foz do Iguaçu e envio para o
// Brasil foram descontinuados. Sem mais opção pra escolher, isso deixou de
// ser um radio-group e virou uma linha de confirmação estática (mockup).
export default function EntregaSeguro({ cotacoes, tipo }: Props) {
  const c = cotacoes?.[tipo]
  const preco = c ? c.frete : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', marginBottom: 16, borderRadius: 10, background: 'rgba(15,122,61,0.05)', border: '1px solid rgba(15,122,61,0.15)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#0f7a3d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entrega</span>
        <span style={{ fontSize: 10.5, color: 'rgba(15,122,61,0.75)' }}>Retirada Ciudad del Este</span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 900, color: '#0f7a3d', whiteSpace: 'nowrap' }}>
        {preco === null ? '—' : preco === 0 ? 'GRÁTIS' : brl(preco)}
      </span>
    </div>
  )
}
