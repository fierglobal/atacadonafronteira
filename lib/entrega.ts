// Regra única de frete e seguro. Vive aqui, sem import de servidor, para a tela e
// a API usarem exatamente o mesmo cálculo — o servidor recalcula por cima do que
// a tela mostrou, e só bate se a fonte for a mesma.

export type EntregaTipo = 'retirada_cde' | 'retirada_foz' | 'envio_brasil'

export const FRETE_ELETRONICO_PEDIDO = 150
export const SEGURO_ELETRONICO_APARELHO = 150
export const FRETE_SAUDE_PEDIDO = 50
export const SEGURO_SAUDE_PEDIDO = 150
export const FOZ_POR_UNIDADE = 50
export const FOZ_GRATIS_A_PARTIR_DE = 20

// Nome do departamento raiz que define a tabela cara. Mora aqui e não como UUID
// porque o id do banco muda entre ambientes; o nome é o contrato do catálogo.
export const DEPARTAMENTO_ELETRONICO = 'Eletrônicos'

export type ItemEntrega = { quantity: number; eletronico: boolean }

export type Cotacao = {
  frete: number
  seguro: number
  /** true quando a tabela de eletrônico rege o pedido inteiro */
  tabelaEletronico: boolean
  /** seguro só existe em envio; retirada não tem transporte para segurar */
  seguroDisponivel: boolean
  unidades: number
}

export function calcularEntrega(
  itens: ItemEntrega[],
  tipo: EntregaTipo,
  seguroRecusado: boolean,
): Cotacao {
  const unidades = itens.reduce((s, i) => s + (i.quantity || 0), 0)
  // Um único eletrônico puxa o pedido inteiro para a tabela cara — decisão do
  // dono, não inferência: eletrônico e medicamento viajam com o mesmo risco de
  // apreensão, e separar por item deixaria o pedido misto barato demais.
  const tabelaEletronico = itens.some(i => i.eletronico && i.quantity > 0)

  if (tipo === 'retirada_cde') {
    return { frete: 0, seguro: 0, tabelaEletronico, seguroDisponivel: false, unidades }
  }

  if (tipo === 'retirada_foz') {
    const frete = unidades >= FOZ_GRATIS_A_PARTIR_DE ? 0 : FOZ_POR_UNIDADE * unidades
    return { frete, seguro: 0, tabelaEletronico, seguroDisponivel: false, unidades }
  }

  const frete = tabelaEletronico ? FRETE_ELETRONICO_PEDIDO : FRETE_SAUDE_PEDIDO
  const seguroCheio = tabelaEletronico
    ? SEGURO_ELETRONICO_APARELHO * unidades
    : SEGURO_SAUDE_PEDIDO
  return {
    frete,
    seguro: seguroRecusado ? 0 : seguroCheio,
    tabelaEletronico,
    seguroDisponivel: true,
    unidades,
  }
}

export function ehEntregaTipo(v: unknown): v is EntregaTipo {
  return v === 'retirada_cde' || v === 'retirada_foz' || v === 'envio_brasil'
}

export const ENTREGA_LABEL: Record<EntregaTipo, string> = {
  retirada_cde: 'Retirada em Ciudad del Este',
  retirada_foz: 'Retirada em Foz do Iguaçu',
  envio_brasil: 'Envio para o Brasil',
}
