import { supabaseAdmin } from '@/lib/supabase'

export type Config = {
  pix_key: string
  pix_holder: string
  brl_rate: number
  admin_email: string
  store_name: string
  whatsapp: string
  pedido_minimo_brl: number | null
  estimated_ready_time: string
  pix_expiry_minutes: number
  recovery_abandono_min: number
  recovery_template: string | null
}

const DEFAULTS: Config = {
  pix_key: '78a52520-b4c3-400a-842b-f94878274813',
  pix_holder: 'DISTRIBUIDORA FIOS NOBRE',
  brl_rate: 5.20,
  admin_email: '',
  store_name: 'Atacado na Fronteira',
  whatsapp: '595994222774',
  pedido_minimo_brl: null,
  estimated_ready_time: 'Após a confirmação do PIX, seu pedido fica pronto para retirada em até 24 horas úteis.',
  pix_expiry_minutes: 30,
  recovery_abandono_min: 120,
  recovery_template: null,
}

export async function getConfig(): Promise<Config> {
  try {
    const { data } = await supabaseAdmin.from('configuracoes').select('*').eq('id', 'default').single()
    if (!data) return DEFAULTS
    return {
      pix_key: data.pix_key || DEFAULTS.pix_key,
      pix_holder: data.pix_holder || DEFAULTS.pix_holder,
      brl_rate: Number(data.brl_rate) || DEFAULTS.brl_rate,
      admin_email: data.admin_email || DEFAULTS.admin_email,
      store_name: data.store_name || DEFAULTS.store_name,
      whatsapp: data.whatsapp || DEFAULTS.whatsapp,
      pedido_minimo_brl: data.pedido_minimo_brl ? Number(data.pedido_minimo_brl) : null,
      estimated_ready_time: data.estimated_ready_time || DEFAULTS.estimated_ready_time,
      pix_expiry_minutes: data.pix_expiry_minutes || DEFAULTS.pix_expiry_minutes,
      recovery_abandono_min: data.recovery_abandono_min || DEFAULTS.recovery_abandono_min,
      recovery_template: data.recovery_template || null,
    }
  } catch {
    return DEFAULTS
  }
}
