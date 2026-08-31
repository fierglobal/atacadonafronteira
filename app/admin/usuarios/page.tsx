'use client'
import { useState, useEffect } from 'react'

type User = { id: string; nome: string; email: string; role: string; ativo: boolean; created_at: string }

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'operador' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/admin/usuarios').then(r => r.json()).catch(() => [])
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const criar = async () => {
    if (!form.nome || !form.email || !form.senha) return
    setSaving(true)
    setErr('')
    const r = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    if (!r.ok) { setErr(d.error || 'Erro ao criar usuário'); setSaving(false); return }
    setForm({ nome: '', email: '', senha: '', role: 'operador' })
    setModal(false)
    setSaving(false)
    load()
  }

  const toggleAtivo = async (u: User) => {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x))
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, ativo: !u.ativo }),
    })
  }

  const excluir = async (u: User) => {
    if (!confirm(`Excluir ${u.nome}?`)) return
    setUsers(prev => prev.filter(x => x.id !== u.id))
    await fetch('/api/admin/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    })
  }

  const inp = {
    padding: '10px 12px', background: 'var(--a-bg)', border: '1px solid var(--a-border)',
    borderRadius: 8, color: 'var(--a-text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <div className="usuarios-page" style={{ padding: '32px 36px', background: 'var(--a-bg)', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .usuarios-page { padding: 16px !important; }
          .usuarios-table-wrap { display: none !important; }
          .usuarios-cards { display: block !important; }
        }
      `}</style>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Usuários Admin</h1>
          <p style={{ color: 'var(--a-text3)', fontSize: 13, marginTop: 4 }}>Gerencie o acesso ao painel</p>
        </div>
        <button onClick={() => { setModal(true); setErr('') }}
          style={{ padding: '9px 18px', background: '#A965ED', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
          + Novo Usuário
        </button>
      </div>

      <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#f59e0b' }}>
        Usuários criados aqui fazem login com email + senha. O acesso legado (variável ADMIN_PASSWORD) continua funcionando.
      </div>

      <div className="usuarios-table-wrap" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
              {['Usuário', 'Email', 'Perfil', 'Status', 'Criado em', ''].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum usuário cadastrado</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--a-border)' }}>
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.role === 'dono' ? 'rgba(245,158,11,0.15)' : 'rgba(169, 101, 237,0.15)', border: `1px solid ${u.role === 'dono' ? 'rgba(245,158,11,0.3)' : 'rgba(169, 101, 237,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: u.role === 'dono' ? '#f59e0b' : '#A965ED' }}>
                      {u.nome[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)' }}>{u.nome}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--a-text3)' }}>{u.email}</td>
                <td style={{ padding: '12px 18px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: u.role === 'dono' ? '#f59e0b' : '#A965ED', background: u.role === 'dono' ? 'rgba(245,158,11,0.1)' : 'rgba(169, 101, 237,0.1)', padding: '3px 10px', borderRadius: 4 }}>
                    {u.role === 'dono' ? 'Dono' : 'Operador'}
                  </span>
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => toggleAtivo(u)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${u.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: u.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: u.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer' }}>
                    {u.ativo ? '● Ativo' : '○ Inativo'}
                  </button>
                </td>
                <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--a-text3)' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => excluir(u)}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="usuarios-cards" style={{ display: 'none', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)' }}>Carregando...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--a-text3)', fontSize: 13 }}>Nenhum usuário cadastrado</div>
        ) : users.map(u => (
          <div key={u.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.role === 'dono' ? 'rgba(245,158,11,0.15)' : 'rgba(169, 101, 237,0.15)', border: `1px solid ${u.role === 'dono' ? 'rgba(245,158,11,0.3)' : 'rgba(169, 101, 237,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: u.role === 'dono' ? '#f59e0b' : '#A965ED', flexShrink: 0 }}>
                {u.nome[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome}</p>
                <p style={{ fontSize: 12, color: 'var(--a-text3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: u.role === 'dono' ? '#f59e0b' : '#A965ED', background: u.role === 'dono' ? 'rgba(245,158,11,0.1)' : 'rgba(169, 101, 237,0.1)', padding: '3px 10px', borderRadius: 4, flexShrink: 0 }}>
                {u.role === 'dono' ? 'Dono' : 'Operador'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
              <button onClick={() => toggleAtivo(u)}
                style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: `1px solid ${u.ativo ? 'rgba(169, 101, 237,0.3)' : 'var(--a-border)'}`, background: u.ativo ? 'rgba(169, 101, 237,0.08)' : 'transparent', color: u.ativo ? '#A965ED' : 'var(--a-text3)', cursor: 'pointer' }}>
                {u.ativo ? '● Ativo' : '○ Inativo'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--a-text3)' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
              <button onClick={() => excluir(u)}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--a-surface)', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 400, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Novo Usuário</h2>
              <button onClick={() => setModal(false)} style={{ background: 'var(--a-border)', border: 'none', color: 'var(--a-text2)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['NOME', 'nome', 'text'], ['EMAIL', 'email', 'email'], ['SENHA', 'senha', 'password']].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    type={type} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 10, color: 'var(--a-text3)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>PERFIL</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ ...inp, appearance: 'none' as any }}>
                  <option value="operador">Operador (acesso limitado)</option>
                  <option value="dono">Dono (acesso total)</option>
                </select>
              </div>
              {err && <p style={{ color: '#ef4444', fontSize: 12 }}>{err}</p>}
              <button onClick={criar} disabled={saving || !form.nome || !form.email || !form.senha}
                style={{ marginTop: 8, padding: '13px', background: (!form.nome || !form.email || !form.senha) ? 'var(--a-border)' : '#A965ED', color: (!form.nome || !form.email || !form.senha) ? 'var(--a-text3)' : '#000', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
