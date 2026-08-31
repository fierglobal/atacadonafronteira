// Separação sob medida a pedido do cliente Wilson Xavier de Magalhaes Junior
// (WhatsApp, 31/08/2026) — ele mandou os produtos em duas listas próprias
// ("Pedido 1"/"Pedido 2") que não correspondem a categoria, marca, preço nem
// aos dois pedidos reais dele no banco (os itens de cada lista dele caem
// misturados nos dois pedidos). Sem critério de catálogo pra reproduzir isso,
// então é hardcoded só pra esses 2 pedidos — não é feature geral, não deve
// virar padrão pra outros clientes.
export const WILSON_ORDER_IDS = new Set([
  'a5bc72a2-35c2-4eac-a6a5-bc804bfaf040', // AF80311007L5I
  '23915c0d-6b7b-46e2-aa0a-30b73665d1e4', // AF15534046VXD
])

export const WILSON_PRODUCT_LISTA: Record<string, string> = {
  '55922e9d-4f76-4402-87d1-01c54cbd16b5': 'Lista 1', // TIRZEPATIDE T.G 15MG / 0,5 ML
  '82296491-4a9f-4738-9856-acc81c387431': 'Lista 1', // BIOGENESIS SELANK 10MG
  'b2efbfcf-9185-48b1-a8f7-78cf9b70592f': 'Lista 1', // BIOGENESIS SEMAX 30MG
  '0cdabaf7-b293-4962-8821-305e622252da': 'Lista 1', // THERA GENETICS RETATRUTIDE 40MG - 01 VIAL
  '58b57691-663a-4b85-8368-cf77cfdeaa8e': 'Lista 1', // BIOGENESIS TESAMORELIN 10MG
  'ff97eb62-e1da-4208-b930-0eb2f676bd74': 'Lista 1', // LANDERLAN DURASTESTON PLUS GOLD 250MG - 01 VIAL
  '3e5ef60b-a126-4c94-9d60-cbdaa5106200': 'Lista 1', // EMINENCE ENAPRIME (ENANTATO) 250MG - 10 VIAL
  '773efa95-dd32-44aa-bf66-9451ff6f76a8': 'Lista 1', // COOPER CYPOBOLIC 250MG - 10 VIAL
  'd0462302-62e2-49d6-b989-c36c1bca2c7a': 'Lista 2', // LIPOLESS TIRZEPATIDA 15MG - 04 VIALS
  '5177d80b-d1d1-486f-b0c1-712948e9c345': 'Lista 2', // EMINENCE CYPOPRIME (CYPIONATO) 250MG - 10 VIAL
  'b15734e3-1af2-42ba-a52e-5cd169e42d8b': 'Lista 2', // LANDERLAN DECALAND DEPOT 200MG - 01 VIAL
  '7279b9d6-6293-418d-a007-8b632c154286': 'Lista 2', // COOPER MASTERBOLIC 100MG - 10 VIAL
  'd1e504ff-e782-41e5-a5e7-c2864a230a55': 'Lista 2', // BIOGENESIS CJC 1295 + IPAMORELIN 10MG
  '2f9c806f-8aca-4625-a22e-284904ed27b6': 'Lista 2', // OXYGEN RETAGEN 80MG - 01 VIAL DILUIDA
  '963435a3-89b5-4041-9636-3bd76facea19': 'Lista 2', // OXYGEN RETAGEN 120MG - 01 VIAL DILUIDA
  'f3800a82-015c-4790-b2aa-e77dad595d99': 'Lista 2', // THERA GENETICS RETATRUTIDE 40MG - PEN
}
