'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'

type Profile = { nome: string; cpf: string; telefone: string; cep: string; endereco: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string }

export default function MeuPerfil() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) { router.replace('/conta/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p || { nome: '', cpf: '', telefone: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' })
      setLoading(false)
    })
  }, [router])

  const save = async () => {
    if (!profile) return
    setSaving(true)
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(p => p ? { ...p, [k]: e.target.value } : p)

  const inp = {
    width: '100%', padding: '10px 12px', background: '#ffffff',
    border: '1px solid #d4d4d4', borderRadius: 8, color: '#0a0a0a',
    fontSize: 14, boxSizing: 'border-box' as const,
  }
  const lbl = { display: 'block', fontSize: 10, fontWeight: 700, color: '#404040', letterSpacing: '0.08em', marginBottom: 5 } as const

  if (loading) return <div style={{ minHeight: 200 }} />

  return (
    <div>
      <style>{`
        input:focus { border-color: rgba(66, 14, 118,0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(66, 14, 118,0.08); }
        @media (max-width: 640px) {
          .mc-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6, marginTop: 0, color: '#0a0a0a' }}>Meu Perfil</h1>
      <p style={{ fontSize: 12, color: '#737373', marginBottom: 28 }}>Gerencie seus dados cadastrais</p>

      {profile && (
        <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="mc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>NOME</label>
                <input value={profile.nome} onChange={set('nome')} style={inp} />
              </div>
              <div>
                <label style={lbl}>WHATSAPP</label>
                <input value={profile.telefone} onChange={set('telefone')} style={inp} />
              </div>
            </div>
            <div className="mc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>CPF</label>
                <input value={profile.cpf} onChange={set('cpf')} style={inp} />
              </div>
              <div>
                <label style={lbl}>CEP</label>
                <input value={profile.cep} onChange={set('cep')} style={inp} />
              </div>
            </div>
            <div className="mc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 14 }}>
              <div>
                <label style={lbl}>ENDEREÇO</label>
                <input value={profile.endereco} onChange={set('endereco')} style={inp} />
              </div>
              <div>
                <label style={lbl}>NÚMERO</label>
                <input value={profile.numero} onChange={set('numero')} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>COMPLEMENTO</label>
              <input value={profile.complemento} onChange={set('complemento')} style={inp} />
            </div>
            <div className="mc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', gap: 14 }}>
              <div>
                <label style={lbl}>BAIRRO</label>
                <input value={profile.bairro} onChange={set('bairro')} style={inp} />
              </div>
              <div>
                <label style={lbl}>CIDADE</label>
                <input value={profile.cidade} onChange={set('cidade')} style={inp} />
              </div>
              <div>
                <label style={lbl}>UF</label>
                <input value={profile.uf} onChange={set('uf')} maxLength={2} style={inp} />
              </div>
            </div>
          </div>
          <button onClick={save} disabled={saving}
            style={{ marginTop: 20, padding: '11px 28px', background: saved ? 'rgba(66, 14, 118,0.08)' : '#A965ED', color: saved ? '#420E76' : '#000', border: saved ? '1px solid rgba(66, 14, 118,0.4)' : 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: saved ? 'none' : '0 4px 16px rgba(66, 14, 118,0.25)' }}>
            {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar Dados'}
          </button>
        </div>
      )}
    </div>
  )
}
