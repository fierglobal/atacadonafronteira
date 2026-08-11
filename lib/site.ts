// Fonte única do domínio público. Registrado e apontado em 2026-08-10.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://atacadonafronteira.com'

export const SITE_NAME = 'Atacado na Fronteira'

// Fonte única do WhatsApp. Já foi trocado duas vezes neste projeto e cada vez
// sobrou o número velho em algum arquivo — mensagem de cliente caindo na empresa
// errada. Trocar AQUI, e também em configuracoes.whatsapp no banco, que tem
// precedência em runtime (lib/config.ts).
export const WHATSAPP_NUMBER = '595995371537'
export const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}`
export const WHATSAPP_ENABLED = true
