// Fonte única do domínio público. Registrado e apontado em 2026-08-10.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://atacadonafronteira.com'

export const SITE_NAME = 'Atacado na Fronteira'

// Taxa usada só quando o banco não responde. Mora aqui, e não em lib/config.ts,
// porque a vitrine é client e lib/config.ts importa a service role. Vitrine e
// checkout caem no MESMO valor, então uma queda do banco deixa os dois errados
// juntos em vez de divergentes — que é o defeito que estamos consertando.
export const BRL_RATE_FALLBACK = 5.20

// Fonte única do WhatsApp. Já foi trocado duas vezes neste projeto e cada vez
// sobrou o número velho em algum arquivo — mensagem de cliente caindo na empresa
// errada. Trocar AQUI, e também em configuracoes.whatsapp no banco, que tem
// precedência em runtime (lib/config.ts).
export const WHATSAPP_NUMBER = '595992636618'
export const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}`
export const WHATSAPP_ENABLED = true

// Como o número é escrito para humanos. Derivado da constante acima de propósito:
// se o número mudar, esta linha é a única que precisa acompanhar, e o erro fica
// visível na hora em vez de sobrar um telefone velho formatado em algum banner.
export const WHATSAPP_DISPLAY = '+595 992 636618'

// Grupo oficial no WhatsApp. Link de convite copiado da fonte, com os parâmetros
// de compartilhamento que o próprio app anexa — o convite cru
// (https://chat.whatsapp.com/JJjvBIV0E1WIO05tNjhiSA) também abre o mesmo grupo.
export const WHATSAPP_GRUPO_HREF =
  'https://chat.whatsapp.com/JJjvBIV0E1WIO05tNjhiSA?s=cl&p=i&ilr=2'

// Vitrines de marca no menu. Marca não é categoria: um iPhone fica em
// Eletrônicos > Celular e aparece na vitrine Apple ao mesmo tempo, coisa que
// categoria_id (que é um só por produto) não resolve. Cada nome precisa bater
// exatamente com products.brand, que é gravado em UPPERCASE.
// A vitrine só aparece no menu se houver produto ativo daquela marca.
export const MARCAS_VITRINE = ['APPLE', 'XIAOMI', 'JBL']
