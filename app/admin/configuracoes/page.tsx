'use client'
import { useState, useEffect } from 'react'

type Cfg = {
  pix_key: string; pix_holder: string; brl_rate: string; admin_email: string; store_name: string; whatsapp: string
  pedido_minimo_brl: string; estimated_ready_time: string; pix_expiry_minutes: string
  recovery_abandono_min: string; recovery_template: string
}
const empty: Cfg = {
  pix_key: '', pix_holder: '', brl_rate: '', admin_email: '', store_name: '', whatsapp: '',
  pedido_minimo_brl: '', estimated_ready_time: '', pix_expiry_minutes: '30',
  recovery_abandono_min: '120', recovery_template: '',
}

const inp = { width: '100%', padding: '11px 14px', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, color: 'var(--a-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }
const lbl = { fontSize: 10, color: 'var(--a-text2)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 } as const

export default function Configuracoes() {
  const [cfg, setCfg] = useState<Cfg>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/configuracoes').then(r => r.json()).then(d => {
      setCfg({
        pix_key: d.pix_key || '',
        pix_holder: d.pix_holder || '',
        brl_rate: d.brl_rate?.toString() || '5.20',
        admin_email: d.admin_email || '',
        store_name: d.store_name || '',
        whatsapp: d.whatsapp || '',
        pedido_minimo_brl: d.pedido_minimo_brl?.toString() || '',
        estimated_ready_time: d.estimated_ready_time || '',
        pix_expiry_minutes: d.pix_expiry_minutes?.toString() || '30',
        recovery_abandono_min: d.recovery_abandono_min?.toString() || '120',
        recovery_template: d.recovery_template || '',
      })
      setLoading(false)
    })
  }, [])

  const set = (k: keyof Cfg) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCfg(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cfg,
        brl_rate: parseFloat(cfg.brl_rate) || 5.20,
        pedido_minimo_brl: cfg.pedido_minimo_brl ? parseFloat(cfg.pedido_minimo_brl) : null,
        pix_expiry_minutes: parseInt(cfg.pix_expiry_minutes) || 30,
        recovery_abandono_min: parseInt(cfg.recovery_abandono_min) || 120,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }} />

  return (
    <div style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Configurações</h1>
        <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>Ajuste PIX, câmbio, checkout e recuperação</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>

        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 14, padding: 24, gridColumn: '1 / -1' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#A965ED', letterSpacing: '0.1em', margin: '0 0 20px' }}>PAGAMENTO PIX</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 16 }}>
            <div>
              <label style={lbl}>CHAVE PIX</label>
              <input value={cfg.pix_key} onChange={set('pix_key')} placeholder="CNPJ, CPF, e-mail ou aleatória" style={inp} />
            </div>
            <div>
              <label style={lbl}>NOME DO BENEFICIÁRIO</label>
              <input value={cfg.pix_holder} onChange={set('pix_holder')} placeholder="ATACADO NA FRONTEIRA" style={inp} />
            </div>
            <div>
              <label style={lbl}>EXPIRAÇÃO (min)</label>
              <input value={cfg.pix_expiry_minutes} onChange={set('pix_expiry_minutes')} type="number" min="5" max="1440" style={inp} />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', margin: '0 0 20px' }}>CÂMBIO E PEDIDO MÍNIMO</p>
          <label style={lbl}>USD → BRL (taxa)</label>
          <input value={cfg.brl_rate} onChange={set('brl_rate')} placeholder="5.20" type="number" step="0.01" style={inp} />
          <label style={{ ...lbl, marginTop: 16 }}>PEDIDO MÍNIMO (R$)</label>
          <input value={cfg.pedido_minimo_brl} onChange={set('pedido_minimo_brl')} placeholder="Deixe vazio para sem mínimo" type="number" step="0.01" style={inp} />
          <p style={{ fontSize: 12, color: 'var(--a-text3)', margin: '8px 0 0' }}>Bloqueia checkout abaixo do valor</p>
        </div>

        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', letterSpacing: '0.1em', margin: '0 0 20px' }}>NOTIFICAÇÕES</p>
          <label style={lbl}>E-MAIL DO ADMINISTRADOR</label>
          <input value={cfg.admin_email} onChange={set('admin_email')} placeholder="seu@email.com" type="email" style={inp} />
          <p style={{ fontSize: 12, color: 'var(--a-text3)', margin: '8px 0 0' }}>Recebe alerta de comprovante</p>
        </div>

        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 14, padding: 24, gridColumn: '1 / -1' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--a-text2)', letterSpacing: '0.1em', margin: '0 0 20px' }}>DADOS DA LOJA</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>NOME DA LOJA</label>
              <input value={cfg.store_name} onChange={set('store_name')} placeholder="Atacado na Fronteira" style={inp} />
            </div>
            <div>
              <label style={lbl}>WHATSAPP (com DDI)</label>
              <input value={cfg.whatsapp} onChange={set('whatsapp')} placeholder="595981234567" style={inp} />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 14, padding: 24, gridColumn: '1 / -1' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#A660EC', letterSpacing: '0.1em', margin: '0 0 20px' }}>CHECKOUT E PREPARAÇÃO</p>
          <label style={lbl}>TEMPO ESTIMADO DE PREPARAÇÃO (exibido na tela PIX)</label>
          <textarea value={cfg.estimated_ready_time} onChange={set('estimated_ready_time')} rows={2}
            placeholder="Após a confirmação do PIX, seu pedido fica pronto para retirada em até 24 horas úteis."
            style={{ ...inp, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>

        <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 14, padding: 24, gridColumn: '1 / -1' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#ec4899', letterSpacing: '0.1em', margin: '0 0 20px' }}>RECUPERAÇÃO DE CARRINHO ABANDONADO</p>
          <label style={lbl}>DISPARAR APÓS (minutos)</label>
          <input value={cfg.recovery_abandono_min} onChange={set('recovery_abandono_min')} type="number" min="30" max="1440" style={inp} />
          <p style={{ fontSize: 12, color: 'var(--a-text3)', margin: '8px 0 16px' }}>Cron roda a cada 2h. Carrinhos abandonados há mais que esse tempo recebem e-mail.</p>
          <label style={lbl}>TEMPLATE DO E-MAIL (HTML, opcional)</label>
          <textarea value={cfg.recovery_template} onChange={set('recovery_template')} rows={5}
            placeholder="Deixe vazio para usar o template padrão."
            style={{ ...inp, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }} />
        </div>
      </div>

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={save} disabled={saving}
          style={{ padding: '12px 32px', background: saving ? 'var(--a-border)' : '#A965ED', color: saving ? 'var(--a-text2)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#A965ED', fontWeight: 700 }}>✓ Salvo</span>}
      </div>
    </div>
  )
}
