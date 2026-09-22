'use client'
import type { Cotacao, EntregaTipo } from '@/lib/entrega'

const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type Props = {
  cotacoes: Record<EntregaTipo, Cotacao> | null
  tipo: EntregaTipo
  onTipo: (t: EntregaTipo) => void
}

const OPCOES: { valor: EntregaTipo; titulo: string; sub: string }[] = [
  { valor: 'retirada_cde', titulo: 'Retirar em Ciudad del Este', sub: 'Na nossa loja, no Paraguai. Leve documento com foto.' },
  { valor: 'retirada_foz', titulo: 'Retirar em Foz do Iguaçu', sub: 'R$ 50 por unidade. Acima de 20 unidades, sai de graça.' },
]

export default function EntregaSeguro({ cotacoes, tipo, onTipo }: Props) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#737373' }}>COMO QUER RETIRAR?</p>

      {OPCOES.map(({ valor, titulo, sub }) => {
        const c = cotacoes?.[valor]
        const preco = c ? c.frete : null
        return (
          <label key={valor} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tipo === valor ? 'rgba(66,14,118,0.5)' : '#ececec'}`, background: tipo === valor ? 'rgba(66,14,118,0.04)' : '#ffffff', cursor: 'pointer', marginBottom: 8 }}>
            <input type="radio" name="entrega" checked={tipo === valor} onChange={() => onTipo(valor)} style={{ marginTop: 3, accentColor: '#420E76' }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{titulo}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap', color: preco === 0 ? '#0f7a3d' : '#420E76' }}>
                  {preco === null ? '—' : preco === 0 ? 'Sem custo' : brl(preco)}
                </span>
              </span>
              <span style={{ display: 'block', fontSize: 11, color: '#737373', marginTop: 2 }}>{sub}</span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
