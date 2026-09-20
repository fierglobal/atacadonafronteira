'use client'
import { useEffect, useState } from 'react'
import type { Cotacao, EntregaTipo } from '@/lib/entrega'

const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type Props = {
  cotacoes: Record<EntregaTipo, Cotacao> | null
  tipo: EntregaTipo
  onTipo: (t: EntregaTipo) => void
  endereco: string
  onEndereco: (v: string) => void
  cep: string
  onCep: (v: string) => void
}

const fmtCep = (digits: string) => digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits

type Endereco = { rua: string; numero: string; complemento: string; bairro: string; cidadeUf: string }
const ENDERECO_VAZIO: Endereco = { rua: '', numero: '', complemento: '', bairro: '', cidadeUf: '' }

// O banco só tem a coluna entrega_endereco (texto livre) — nenhuma migração
// necessária. Os campos ficam separados só na tela; ao digitar, compomos a
// mesma string única que a API/admin/e-mail já sabem ler.
function compose(e: Endereco): string {
  if (!e.rua && !e.numero) return ''
  return [
    [e.rua, e.numero].filter(Boolean).join(', '),
    e.complemento,
    e.bairro,
    e.cidadeUf,
  ].filter(Boolean).join(' - ')
}

const OPCOES: { valor: EntregaTipo; titulo: string; sub: string }[] = [
  { valor: 'retirada_cde', titulo: 'Retirar em Ciudad del Este', sub: 'Na nossa loja, no Paraguai. Leve documento com foto.' },
  { valor: 'retirada_foz', titulo: 'Retirar em Foz do Iguaçu', sub: 'R$ 50 por unidade. Acima de 20 unidades, sai de graça.' },
  { valor: 'envio_brasil', titulo: 'Enviar para todo o Brasil', sub: '' },
]

export default function EntregaSeguro({
  cotacoes, tipo, onTipo, onEndereco, cep, onCep,
}: Props) {
  const mostraSeguro = tipo === 'envio_brasil'
  const eletronico = cotacoes?.envio_brasil.tabelaEletronico ?? false

  const [end, setEnd] = useState<Endereco>(ENDERECO_VAZIO)
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'ok' | 'not_found' | 'error'>('idle')

  // Busca automática por CEP (ViaCEP, sem chave, CORS liberado) — some do
  // usuário digitar rua/bairro/cidade à mão; ele só confirma e completa nº.
  useEffect(() => {
    if (cep.length !== 8) { queueMicrotask(() => setCepStatus('idle')); return }
    let vivo = true
    queueMicrotask(() => setCepStatus('loading'))
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(r => r.json())
      .then((d: { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean }) => {
        if (!vivo) return
        if (d.erro) {
          setCepStatus('not_found')
          setEnd(p => { const next = { ...p, rua: '', bairro: '', cidadeUf: '' }; onEndereco(compose(next)); return next })
          return
        }
        setCepStatus('ok')
        setEnd(p => {
          const next = { ...p, rua: d.logradouro || '', bairro: d.bairro || '', cidadeUf: d.localidade && d.uf ? `${d.localidade}/${d.uf}` : '' }
          onEndereco(compose(next))
          return next
        })
      })
      .catch(() => { if (vivo) setCepStatus('error') })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só o CEP dispara a busca; onEndereco é setState estável do pai
  }, [cep])

  const setCampo = (k: keyof Endereco) => (v: string) => {
    setEnd(p => { const next = { ...p, [k]: v }; onEndereco(compose(next)); return next })
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#737373' }}>COMO QUER RECEBER?</p>

      {OPCOES.map(({ valor, titulo, sub }) => {
        const c = cotacoes?.[valor]
        const preco = c ? c.frete : null
        const subTexto = valor === 'envio_brasil'
          ? `${eletronico ? '10%' : '5%'} do valor da compra · seguro incluso · chega em até 3 dias úteis`
          : sub
        return (
          <label key={valor} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tipo === valor ? 'rgba(66,14,118,0.5)' : '#ececec'}`, background: tipo === valor ? 'rgba(66,14,118,0.04)' : '#ffffff', cursor: 'pointer', marginBottom: 8 }}>
            <input type="radio" name="entrega" checked={tipo === valor} onChange={() => onTipo(valor)} style={{ marginTop: 3, accentColor: '#420E76' }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{titulo}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap', color: preco === 0 ? '#0f7a3d' : '#420E76' }}>
                  {preco === null ? '—' : preco === 0 ? 'Sem custo' : brl(preco)}
                </span>
              </span>
              <span style={{ display: 'block', fontSize: 11, color: '#737373', marginTop: 2 }}>{subTexto}</span>
            </span>
          </label>
        )
      })}

      {tipo === 'envio_brasil' && (
        <>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input value={fmtCep(cep)} onChange={e => onCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="CEP" inputMode="numeric" maxLength={9}
              style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: `1px solid ${cepStatus === 'not_found' || cepStatus === 'error' ? '#ef4444' : '#d4d4d4'}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
            {cepStatus === 'loading' && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid #ececec', borderTopColor: '#420E76', borderRadius: '50%', animation: 'cep-spin 0.7s linear infinite' }} />
            )}
          </div>
          {cepStatus === 'not_found' && (
            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#ef4444', fontWeight: 700 }}>CEP não encontrado — confira o número.</p>
          )}
          {cepStatus === 'error' && (
            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#b45309', fontWeight: 700 }}>Não conseguimos buscar o endereço agora — preencha manualmente.</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 8 }}>
            <input value={end.rua} onChange={e => setCampo('rua')(e.target.value)}
              placeholder="Rua / Av." disabled={cepStatus === 'loading'}
              style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #d4d4d4', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, background: cepStatus === 'loading' ? '#fafafa' : '#ffffff' }} />
            <input value={end.numero} onChange={e => setCampo('numero')(e.target.value)}
              placeholder="Número"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #d4d4d4', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
            <input value={end.complemento} onChange={e => setCampo('complemento')(e.target.value)}
              placeholder="Complemento (opcional)"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #d4d4d4', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
            <input value={end.bairro} onChange={e => setCampo('bairro')(e.target.value)}
              placeholder="Bairro" disabled={cepStatus === 'loading'}
              style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #d4d4d4', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, background: cepStatus === 'loading' ? '#fafafa' : '#ffffff' }} />
          </div>
          {end.cidadeUf && (
            <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#737373' }}>
              <span style={{ fontWeight: 700, color: '#0a0a0a' }}>{end.cidadeUf}</span>
            </p>
          )}
          <p style={{ margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, color: cep.length === 8 ? '#0f7a3d' : '#737373' }}>
            {cep.length === 8 ? '📦 Despacho em até 3 dias úteis' : 'Informe o CEP para confirmar o endereço de entrega.'}
          </p>
          <style>{`@keyframes cep-spin { to { transform: translateY(-50%) rotate(360deg) } }`}</style>
        </>
      )}

      {mostraSeguro && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, border: '1px solid #0f7a3d', background: 'rgba(15,122,61,0.06)', borderRadius: 10, marginTop: 4 }}>
          <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1.2 }}>🛡️</span>
          <span>
            <span style={{ display: 'block', fontWeight: 750, fontSize: 13, color: '#0a0a0a' }}>Seguro incluso no frete</span>
            <span style={{ display: 'block', fontSize: 11.5, color: '#525252', marginTop: 2 }}>
              Se extraviar ou se perder no caminho, reenviamos sem custo — não é uma opção à parte.
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
