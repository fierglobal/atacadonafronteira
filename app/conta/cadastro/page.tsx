'use client'
import { useState, useEffect, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import Logo from '@/components/Logo'

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, x) =>
    x ? `${a}.${b}.${c}-${x}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a)
}
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length > 6) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  if (d.length > 2) return d.replace(/(\d{2})(\d{0,})/, '($1) $2')
  return d
}

type F = { nome: string; cpf: string; telefone: string; email: string; senha: string; confirmSenha: string; cidade: string; uf: string }
const empty: F = { nome: '', cpf: '', telefone: '', email: '', senha: '', confirmSenha: '', cidade: '', uf: '' }

export default function Cadastro() {
  const router = useRouter()
  const [redirect, setRedirect] = useState('/checkout')
  const [form, setForm] = useState<F>(empty)
  const [errs, setErrs] = useState<Partial<Record<keyof F, string>>>({})
  const [globalErr, setGlobalErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirect(params.get('redirect') || '/')
  }, [])

  const set = (k: keyof F) => (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (k === 'cpf') v = maskCPF(v)
    else if (k === 'telefone') v = maskPhone(v)
    else if (k === 'uf') v = v.toUpperCase().slice(0, 2)
    setForm(p => ({ ...p, [k]: v }))
    setErrs(p => { const n = { ...p }; delete n[k]; return n })
  }

  const validate = () => {
    const e: Partial<Record<keyof F, string>> = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    if (!form.cpf.replace(/\D/g, '').match(/^\d{11}$/)) e.cpf = 'CPF inválido'
    if (!form.telefone.replace(/\D/g, '').match(/^\d{10,11}$/)) e.telefone = 'Número inválido'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'E-mail inválido'
    if (form.senha.length < 6) e.senha = 'Mínimo 6 caracteres'
    if (form.senha !== form.confirmSenha) e.confirmSenha = 'Senhas não coincidem'
    if (!form.cidade.trim()) e.cidade = 'Obrigatório'
    if (!form.uf.match(/^[A-Z]{2}$/)) e.uf = 'UF inválida'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setGlobalErr('')

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: { data: { nome: form.nome } },
    })

    if (error) {
      setGlobalErr(error.message.includes('already registered') ? 'E-mail já cadastrado. Faça login.' : error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nome: form.nome, cpf: form.cpf, telefone: form.telefone,
        cidade: form.cidade, uf: form.uf,
        updated_at: new Date().toISOString(),
      })
      await fetch('/api/conta/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id }),
      })
    }

    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.senha })
      if (signInErr) { setSuccess(true); setLoading(false); return }
    }

    router.push(redirect)
    router.refresh()
  }

  const inp = (err?: string) => ({
    width: '100%', padding: '11px 14px', background: '#ffffff',
    border: `1px solid ${err ? '#ef4444' : '#d4d4d4'}`, borderRadius: 8,
    color: '#0a0a0a', fontSize: 14, boxSizing: 'border-box' as const,
  })
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#404040', letterSpacing: '0.08em', marginBottom: 6 } as const
  const errTxt = { fontSize: 10, color: '#ef4444', marginTop: 4 } as const

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(66, 14, 118,0.06)', border: '2px solid #420E76', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 16px rgba(66, 14, 118,0.18)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#420E76" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10, color: '#0a0a0a' }}>Conta criada!</h2>
          <p style={{ color: '#404040', fontSize: 14, lineHeight: 1.6 }}>Verifique seu e-mail <strong style={{ color: '#0a0a0a' }}>{form.email}</strong> para ativar sua conta.</p>
          <a href={`/conta/login?redirect=${encodeURIComponent(redirect)}`}
            style={{ display: 'inline-block', marginTop: 24, padding: '12px 28px', background: '#A965ED', color: '#000', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 16px rgba(66, 14, 118,0.25)' }}>
            Ir para Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a', padding: '40px 24px 80px' }}>
      <style>{`
        input:focus { border-color: rgba(66, 14, 118,0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(66, 14, 118,0.08); }
        input::placeholder { color: #a3a3a3; }
        @media (max-width: 640px) {
          .cad-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/"><Logo size={30} /></a>
          <h1 style={{ fontSize: 20, fontWeight: 900, marginTop: 20, marginBottom: 4, color: '#0a0a0a' }}>Criar conta</h1>
          <p style={{ color: '#404040', fontSize: 13 }}>Cadastre-se para finalizar seu pedido</p>
        </div>

        <form onSubmit={submit}>
          <div style={{ background: '#ffffff', border: '1px solid #ececec', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>

            <div>
              <label style={lbl}>NOME COMPLETO</label>
              <input value={form.nome} onChange={set('nome')} placeholder="Seu nome completo" style={inp(errs.nome)} />
              {errs.nome && <p style={errTxt}>{errs.nome}</p>}
            </div>

            <div className="cad-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>CPF</label>
                <input value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" style={inp(errs.cpf)} />
                {errs.cpf && <p style={errTxt}>{errs.cpf}</p>}
              </div>
              <div>
                <label style={lbl}>WHATSAPP</label>
                <input value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" style={inp(errs.telefone)} />
                {errs.telefone && <p style={errTxt}>{errs.telefone}</p>}
              </div>
            </div>

            <div>
              <label style={lbl}>E-MAIL</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" style={inp(errs.email)} />
              {errs.email && <p style={errTxt}>{errs.email}</p>}
            </div>

            <div className="cad-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 14 }}>
              <div>
                <label style={lbl}>CIDADE</label>
                <input value={form.cidade} onChange={set('cidade')} placeholder="Sua cidade" style={inp(errs.cidade)} />
                {errs.cidade && <p style={errTxt}>{errs.cidade}</p>}
              </div>
              <div>
                <label style={lbl}>ESTADO</label>
                <input value={form.uf} onChange={set('uf')} placeholder="SP" style={inp(errs.uf)} />
                {errs.uf && <p style={errTxt}>{errs.uf}</p>}
              </div>
            </div>

            <div style={{ height: 1, background: '#ececec' }} />

            <div className="cad-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>SENHA</label>
                <input type="password" value={form.senha} onChange={set('senha')} placeholder="Mínimo 6 caracteres" style={inp(errs.senha)} />
                {errs.senha && <p style={errTxt}>{errs.senha}</p>}
              </div>
              <div>
                <label style={lbl}>CONFIRMAR SENHA</label>
                <input type="password" value={form.confirmSenha} onChange={set('confirmSenha')} placeholder="Repita a senha" style={inp(errs.confirmSenha)} />
                {errs.confirmSenha && <p style={errTxt}>{errs.confirmSenha}</p>}
              </div>
            </div>
          </div>

          {globalErr && <p style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', marginTop: 14 }}>{globalErr}</p>}

          <button type="submit" disabled={loading}
            style={{ width: '100%', marginTop: 20, padding: '15px', background: '#A965ED', color: '#000', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(66, 14, 118,0.25)' }}>
            {loading ? 'Criando conta...' : 'Criar Conta e Continuar →'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#404040' }}>
            Já tem conta?{' '}
            <a href={`/conta/login?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#420E76', fontWeight: 700, textDecoration: 'none' }}>Entrar</a>
          </p>
        </form>
      </div>
    </div>
  )
}
