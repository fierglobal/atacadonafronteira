'use client'
import type { Cotacao, EntregaTipo } from '@/lib/entrega'

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

type Props = {
  cotacoes: Record<EntregaTipo, Cotacao> | null
  tipo: EntregaTipo
  onTipo: (t: EntregaTipo) => void
  endereco: string
  onEndereco: (v: string) => void
  seguroRecusado: boolean
  onSeguroRecusado: (v: boolean) => void
}

const OPCOES: { valor: EntregaTipo; titulo: string; sub: string }[] = [
  { valor: 'retirada_cde', titulo: 'Retirar em Ciudad del Este', sub: 'Na nossa loja, no Paraguai. Leve documento com foto.' },
  { valor: 'retirada_foz', titulo: 'Retirar em Foz do Iguaçu', sub: 'R$ 50 por unidade. Acima de 20 unidades, sai de graça.' },
  { valor: 'envio_brasil', titulo: 'Enviar para todo o Brasil', sub: '' },
]

export default function EntregaSeguro({
  cotacoes, tipo, onTipo, endereco, onEndereco, seguroRecusado, onSeguroRecusado,
}: Props) {
  const atual = cotacoes?.[tipo]
  const mostraSeguro = tipo === 'envio_brasil'
  const eletronico = cotacoes?.envio_brasil.tabelaEletronico ?? false

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#737373' }}>COMO QUER RECEBER?</p>

      {OPCOES.map(({ valor, titulo, sub }) => {
        const c = cotacoes?.[valor]
        const preco = c ? c.frete : null
        const subTexto = valor === 'envio_brasil'
          ? (eletronico ? 'Frete R$ 150 por pedido. Seguro cobrado por aparelho.' : 'Frete R$ 50 por pedido. Seguro à parte.')
          : sub
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
              <span style={{ display: 'block', fontSize: 11, color: '#737373', marginTop: 2 }}>{subTexto}</span>
            </span>
          </label>
        )
      })}

      {tipo === 'envio_brasil' && (
        <input value={endereco} onChange={e => onEndereco(e.target.value)}
          placeholder="Endereço completo com CEP (rua, número, bairro, cidade/UF)"
          style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #d4d4d4', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
      )}

      {mostraSeguro && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
          <div style={{ border: '2px solid #B42318', background: '#fdf2f1', borderRadius: 10, padding: '13px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 900, fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B42318', marginBottom: 7 }}>
              <span aria-hidden="true">⚠</span> Leia antes de continuar
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#0a0a0a' }}>
              <b>Envio para o Brasil é por sua conta e risco.</b> Se você recusar o seguro e a mercadoria for
              extraviada, roubada ou perdida por qualquer motivo no caminho, <b>o prejuízo é 100% seu</b> — não
              enviamos outro nem devolvemos o valor pago.
            </p>
          </div>

          {!seguroRecusado && atual && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, border: '1px solid #0f7a3d', background: 'rgba(15,122,61,0.06)', borderRadius: 10 }}>
              <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1.2 }}>🛡️</span>
              <span>
                <span style={{ display: 'block', fontWeight: 750, fontSize: 13, color: '#0a0a0a' }}>Seu pedido está segurado</span>
                <span style={{ display: 'block', fontSize: 11.5, color: '#525252', marginTop: 2 }}>
                  {eletronico ? 'R$ 150 por aparelho' : 'R$ 150 por pedido'}. Se extraviar ou se perder no caminho, enviamos outro sem custo.
                </span>
              </span>
            </div>
          )}

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${seguroRecusado ? '#B42318' : '#ececec'}`, background: seguroRecusado ? '#fdf2f1' : '#ffffff' }}>
            <input type="checkbox" checked={seguroRecusado} onChange={e => onSeguroRecusado(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#B42318' }} />
            <span>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 750, color: '#0a0a0a' }}>Não desejo optar pelo seguro</span>
              <span style={{ display: 'block', fontSize: 11, color: '#737373', marginTop: 2 }}>
                Marcando esta caixa, você assume integralmente o risco de extravio ou perda.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  )
}
