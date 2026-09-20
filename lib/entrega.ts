// Regra única de frete e seguro. Vive aqui, sem import de servidor, para a tela e
// a API usarem exatamente o mesmo cálculo — o servidor recalcula por cima do que
// a tela mostrou, e só bate se a fonte for a mesma.

export type EntregaTipo = 'retirada_cde' | 'retirada_foz' | 'envio_brasil'

export const FOZ_POR_UNIDADE = 50
export const FOZ_GRATIS_A_PARTIR_DE = 20

// Envio para o Brasil: despacho único em até 48h úteis pela transportadora da
// Shopee, frete cobrado como % do valor da compra (seguro sempre incluso nesse
// percentual — não existe mais opção de recusar seguro). De qual base física
// (Foz/SP/Recife/Goiânia) o pedido realmente sai é decisão operacional interna,
// tomada depois no admin — não influencia o que o cliente vê nem paga.
export const FRETE_PCT_ELETRONICO = 0.10
export const FRETE_PCT_PADRAO = 0.05
export const PRAZO_ENVIO_BRASIL_HORAS = 48

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

// subtotalParaFrete é opcional: quando informado (checkout final, depois do
// cupom aplicado), vale ele — cupom é desconto sobre mercadoria, o frete em %
// deve incidir sobre o que o cliente realmente paga pela mercadoria, não sobre
// o preço cheio antes do cupom. Sem ele (cotação de preview, sem cupom ainda),
// soma o subtotal bruto de cada item.
export function calcularEntrega(itens: ItemEntrega[], tipo: EntregaTipo, subtotalParaFrete?: number): Cotacao {
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

  if (tipo === 'retirada_foz') {
    const frete = unidades >= FOZ_GRATIS_A_PARTIR_DE ? 0 : FOZ_POR_UNIDADE * unidades
    return { frete, tabelaEletronico, tabelaFarmacia, unidades }
  }

  const subtotal = subtotalParaFrete ?? itens.reduce((s, i) => s + (i.subtotalBRL || 0), 0)
  const pct = tabelaEletronico ? FRETE_PCT_ELETRONICO : FRETE_PCT_PADRAO
  const frete = +(subtotal * pct).toFixed(2)
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

// Zona de frete por faixa de CEP (tabela frete_zonas). Não influencia mais o
// frete nem o prazo mostrado ao cliente (envio_brasil agora é sempre 48h úteis
// pra qualquer CEP) — fica só como referência interna de qual base física
// (SP/Recife/Goiânia) está mais perto do destino, pra uso futuro no admin.
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
