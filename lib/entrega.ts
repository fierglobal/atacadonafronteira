// Regra única de retirada e seu custo. Vive aqui, sem import de servidor, para a
// tela e a API usarem exatamente o mesmo cálculo — o servidor recalcula por cima
// do que a tela mostrou, e só bate se a fonte for a mesma.
//
// 'envio_brasil' continua no tipo só porque pedidos reais feitos antes da loja
// virar retirada-only têm esse valor gravado em orders.entrega_tipo — as telas
// de detalhe de pedido (admin, conta do cliente, /pedido/[hash]) ainda precisam
// rotular esse histórico corretamente. Não é mais um valor que calcularEntrega
// aceita, nem que o checkout deixa alguém escolher (bloqueado em
// app/api/checkout/route.ts antes de chegar aqui).
export type EntregaTipo = 'retirada_cde' | 'retirada_foz' | 'envio_brasil'
export type TipoRetirada = 'retirada_cde' | 'retirada_foz'

export const FOZ_POR_UNIDADE = 50
export const FOZ_GRATIS_A_PARTIR_DE = 20

// Nome do departamento raiz que define a tabela cara. Mora aqui e não como UUID
// porque o id do banco muda entre ambientes; o nome é o contrato do catálogo.
export const DEPARTAMENTO_ELETRONICO = 'Eletrônicos'
export const DEPARTAMENTO_FARMACIA = 'Farmácia'

export type ItemEntrega = { quantity: number; eletronico: boolean; farmacia: boolean; subtotalBRL: number }

export type Cotacao = {
  frete: number
  /** true quando a tabela de eletrônico rege o pedido inteiro */
  tabelaEletronico: boolean
  /** true quando a tabela de farmácia rege o pedido (sem eletrônico junto) */
  tabelaFarmacia: boolean
  unidades: number
}

export function calcularEntrega(itens: ItemEntrega[], tipo: TipoRetirada): Cotacao {
  const unidades = itens.reduce((s, i) => s + (i.quantity || 0), 0)
  // Um único eletrônico puxa o pedido inteiro para a tabela cara — decisão do
  // dono, não inferência: eletrônico e medicamento viajam com o mesmo risco de
  // apreensão, e separar por item deixaria o pedido misto barato demais.
  const tabelaEletronico = itens.some(i => i.eletronico && i.quantity > 0)
  // Farmácia só rege quando não há eletrônico junto — eletrônico sempre vence.
  const tabelaFarmacia = !tabelaEletronico && itens.some(i => i.farmacia && i.quantity > 0)

  if (tipo === 'retirada_cde') {
    return { frete: 0, tabelaEletronico, tabelaFarmacia, unidades }
  }

  const frete = unidades >= FOZ_GRATIS_A_PARTIR_DE ? 0 : FOZ_POR_UNIDADE * unidades
  return { frete, tabelaEletronico, tabelaFarmacia, unidades }
}

export function ehEntregaTipo(v: unknown): v is EntregaTipo {
  return v === 'retirada_cde' || v === 'retirada_foz' || v === 'envio_brasil'
}

export const ENTREGA_LABEL: Record<EntregaTipo, string> = {
  retirada_cde: 'Retirada em Ciudad del Este',
  retirada_foz: 'Retirada em Foz do Iguaçu',
  envio_brasil: 'Envio para o Brasil',
}
