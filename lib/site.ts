// Fonte única do domínio público. Domínio final confirmado: atacadonafronteira.com
// (ainda não registrado/apontado — enquanto isso isto aqui é só placeholder).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://atacadonafronteira.com'

export const SITE_NAME = 'Atacado na Fronteira'

// O número de WhatsApp em código ainda é o do cliente antigo (Atacado Paraguai).
// Enquanto não vier o número novo, os CTAs de WhatsApp ficam ocultos — mensagem
// de cliente não pode cair na empresa errada. Flip pra true assim que trocar o número.
export const WHATSAPP_ENABLED = false
