// Gerador de payload PIX (padrão EMV/BR Code) — ponto único de verdade. Já existia
// duplicado em app/checkout/page.tsx e app/pix/[orderNum]/page.tsx byte a byte; um
// terceiro lugar precisando disso (Minha Conta) foi o motivo de extrair.

export const PIX_KEY_FALLBACK = '65078504000170'
export const PIX_HOLDER_FALLBACK = 'ATACADO NA FRONTEIRA'
export const PIX_CITY = 'MARINGA'

function crc16(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}
// O padrão EMV limita o nome do recebedor a 25 caracteres e a cidade a 15, e não
// aceita acento. Estourar o limite ou deixar acento gera um payload que o app do
// banco recusa — falha silenciosa: o cliente não consegue pagar e ninguém vê erro
// no admin. Por isso saneia aqui, sem confiar no que veio da config.
function emvTexto(v: string, max: number, padrao: string): string {
  const limpo = (v || padrao)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .slice(0, max)
  return limpo || padrao
}
export function gerarPixPayload(amountBRL: number, orderNum: string, pixKey: string, pixHolder: string): string {
  const chave = (pixKey || PIX_KEY_FALLBACK).replace(/\s/g, '')
  const nome = emvTexto(pixHolder, 25, PIX_HOLDER_FALLBACK)
  const cidade = emvTexto(PIX_CITY, 15, PIX_CITY)
  const merchantAccount = tlv('26', tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave))
  const txid = (orderNum || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***'
  const body = [
    tlv('00', '01'), tlv('01', '12'), merchantAccount,
    tlv('52', '0000'), tlv('53', '986'),
    amountBRL > 0 ? tlv('54', amountBRL.toFixed(2)) : '',
    tlv('58', 'BR'), tlv('59', nome), tlv('60', cidade),
    tlv('62', tlv('05', txid)), '6304',
  ].join('')
  return body + crc16(body)
}
