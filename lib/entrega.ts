// Regra única de frete e seguro. Vive aqui, sem import de servidor, para a tela e
// a API usarem exatamente o mesmo cálculo — o servidor recalcula por cima do que
// a tela mostrou, e só bate se a fonte for a mesma.

export type EntregaTipo = 'retirada_cde' | 'retirada_foz' | 'envio_brasil'

export const FRETE_ELETRONICO_APARELHO = 150
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

  const frete = tabelaEletronico ? FRETE_ELETRONICO_APARELHO * unidades : FRETE_SAUDE_PEDIDO
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

// Zona de frete por faixa de CEP (tabela frete_zonas). Igual ao resto deste
// arquivo: função pura, sem acesso a banco — quem lê frete_zonas é a API
// (client e server) e passa a lista pra cá, pra usarem a mesma regra de match.
export type ZonaFrete = {
  nome: string
  cepInicio: string | null
  cepFim: string | null
  prazoDiasUteis: number
  ativo: boolean
  ordem: number
}

// Nunca usados em produção com a tabela populada — é só rede de segurança caso
// frete_zonas venha vazia (ambiente novo, falha de leitura etc.).
export const ZONA_ENVIO_FALLBACK_NOME = 'Restante do Brasil'
export const PRAZO_ENVIO_FALLBACK_DIAS = 15

export function resolverZonaFrete(cepDigits: string, zonas: ZonaFrete[]): { nome: string; prazoDiasUteis: number } {
  const cepNum = Number(cepDigits)
  const ordenadas = [...zonas].filter(z => z.ativo).sort((a, b) => a.ordem - b.ordem)
  for (const z of ordenadas) {
    // cep_inicio e cep_fim nulos = zona coringa (é o caso de "Restante do
    // Brasil"): bate com qualquer CEP, por isso ela precisa ter o maior `ordem`
    // pra só ser alcançada depois das zonas específicas não baterem.
    if (!z.cepInicio && !z.cepFim) return { nome: z.nome, prazoDiasUteis: z.prazoDiasUteis }
    if (z.cepInicio && z.cepFim && cepNum >= Number(z.cepInicio) && cepNum <= Number(z.cepFim)) {
      return { nome: z.nome, prazoDiasUteis: z.prazoDiasUteis }
    }
  }
  return { nome: ZONA_ENVIO_FALLBACK_NOME, prazoDiasUteis: PRAZO_ENVIO_FALLBACK_DIAS }
}
