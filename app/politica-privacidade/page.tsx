import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Atacado na Fronteira',
  description: 'Como coletamos, usamos e protegemos seus dados pessoais.',
  alternates: { canonical: '/politica-privacidade' },
}

const UPDATE_DATE = '15 de junho de 2026'

const sec = { background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const h2 = { fontSize: 18, fontWeight: 800, color: '#6d28d9', margin: '0 0 12px', letterSpacing: '-0.01em' } as const
const p = { fontSize: 14, color: '#404040', lineHeight: 1.7, margin: '0 0 12px' } as const

export default function Privacidade() {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>← Voltar ao site</a>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '20px 0 8px', letterSpacing: '-0.02em', color: '#0a0a0a' }}>Política de Privacidade</h1>
        <p style={{ color: '#737373', fontSize: 13, marginBottom: 28 }}>Última atualização: {UPDATE_DATE}</p>

        <div style={sec}>
          <h2 style={h2}>1. Quem somos</h2>
          <p style={p}>Atacado na Fronteira opera o site <strong>atacadonafronteira.com</strong> para venda de produtos via retirada na loja física. Esta política descreve como tratamos seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>2. Dados que coletamos</h2>
          <p style={p}><strong>Cadastro e pedido:</strong> nome completo, CPF (ou CNPJ + razão social), telefone, e-mail, cidade e UF. Esses dados são necessários para emitir cópia do pedido e contatar você sobre a retirada.</p>
          <p style={p}><strong>Pagamento:</strong> comprovante de PIX que você envia voluntariamente. Não armazenamos dados bancários.</p>
          <p style={p}><strong>Navegação:</strong> dados técnicos (endereço IP, navegador, páginas visitadas) e parâmetros UTM de campanha. Usados para entender uso e melhorar o site.</p>
          <p style={p}><strong>Cookies:</strong> essenciais para login/carrinho e analíticos quando você consente.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>3. Como usamos</h2>
          <p style={p}>Processar e entregar seu pedido; identificar você em compras futuras; enviar e-mails transacionais (confirmação, retirada pronta, recuperação de carrinho); cumprir obrigações legais; prevenir fraudes; melhorar nossa operação.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>4. Compartilhamento</h2>
          <p style={p}>Compartilhamos dados apenas com prestadores essenciais à operação:</p>
          <ul style={{ ...p, paddingLeft: 20 }}>
            <li>Supabase (banco de dados e autenticação)</li>
            <li>Vercel (hospedagem)</li>
            <li>Resend (envio de e-mails)</li>
            <li>Autoridades públicas, quando legalmente exigido</li>
          </ul>
          <p style={p}>Não vendemos seus dados a terceiros.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>5. Retenção</h2>
          <p style={p}>Dados de pedido: 5 anos (obrigação fiscal). Dados de marketing: até você solicitar exclusão. Logs técnicos: 12 meses.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>6. Seus direitos (LGPD)</h2>
          <p style={p}>Você pode solicitar a qualquer momento:</p>
          <ul style={{ ...p, paddingLeft: 20 }}>
            <li>Confirmação se tratamos seus dados</li>
            <li>Acesso aos dados</li>
            <li>Correção</li>
            <li>Anonimização ou eliminação de dados desnecessários</li>
            <li>Portabilidade</li>
            <li>Revogação de consentimento</li>
          </ul>
          <p style={p}>Para exercer: entre em contato pelos canais informados na seção 11 (Contato) desta política.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>7. Segurança</h2>
          <p style={p}>Usamos HTTPS, criptografia em repouso (Supabase), senhas com bcrypt e autenticação em dois fatores no acesso administrativo. Mesmo assim, nenhum sistema é 100% imune. Em caso de incidente, notificaremos conforme art. 48 LGPD.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>8. Cookies</h2>
          <p style={p}>Essenciais: login, carrinho, sessão. Analíticos: páginas visitadas e fonte de tráfego. Você pode aceitar todos ou apenas essenciais no banner exibido na primeira visita.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>9. Menores de idade</h2>
          <p style={p}>O site é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de menores.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>10. Alterações</h2>
          <p style={p}>Esta política pode ser atualizada. Mudanças significativas serão comunicadas por e-mail ou banner no site.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>11. Contato</h2>
          <p style={p}>Encarregado de dados (DPO): canal de contato em atualização. Consulte a página inicial para os canais disponíveis no momento.</p>
        </div>
      </div>
    </div>
  )
}
