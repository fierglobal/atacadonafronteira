import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Uso — Atacado na Fronteira',
  description: 'Condições de uso do site e regras de compra.',
  alternates: { canonical: '/termos' },
}

const UPDATE_DATE = '15 de junho de 2026'

const sec = { background: '#ffffff', border: '1px solid #ececec', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const h2 = { fontSize: 18, fontWeight: 800, color: '#6d28d9', margin: '0 0 12px', letterSpacing: '-0.01em' } as const
const p = { fontSize: 14, color: '#404040', lineHeight: 1.7, margin: '0 0 12px' } as const

export default function Termos() {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ color: '#737373', fontSize: 13, textDecoration: 'none' }}>← Voltar ao site</a>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '20px 0 8px', letterSpacing: '-0.02em', color: '#0a0a0a' }}>Termos de Uso</h1>
        <p style={{ color: '#737373', fontSize: 13, marginBottom: 28 }}>Última atualização: {UPDATE_DATE}</p>

        <div style={sec}>
          <h2 style={h2}>1. Aceitação</h2>
          <p style={p}>Ao usar o site atacadonafronteira.com você concorda com estes Termos. Se não concordar, não use o serviço.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>2. Cadastro</h2>
          <p style={p}>Para finalizar compras você precisa fornecer dados verdadeiros (nome, documento, telefone, e-mail). Você é responsável por manter o sigilo da sua senha. Se identificar uso indevido, comunique imediatamente.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>3. Catálogo e disponibilidade</h2>
          <p style={p}>Buscamos manter informações precisas, mas preços, estoque e descrições podem mudar sem aviso. Pedidos só são confirmados após o pagamento via PIX ser recebido e validado.</p>
          <p style={p}>Em caso de erro grosseiro de precificação, podemos cancelar o pedido e devolver eventual valor.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>4. Pagamento e confirmação</h2>
          <p style={p}>Único meio de pagamento aceito: PIX. O pedido fica em status &quot;aguardando pagamento&quot; até o comprovante ser enviado e validado. Validação manual pode demorar até 24 horas úteis.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>5. Retirada</h2>
          <p style={p}>Operamos por <strong>retirada exclusivamente em loja física</strong>. Não fazemos envio nem entrega. Após confirmação do PIX, prepararemos seu pedido em até 24 horas úteis e avisaremos quando estiver pronto.</p>
          <p style={p}>Pedidos não retirados em 30 dias serão cancelados sem direito a reembolso, salvo acordo prévio.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>6. Cancelamento e reembolso</h2>
          <p style={p}>Você pode cancelar pedidos pendentes (não retirados) entrando em contato conosco (veja seção 13). Reembolso via PIX em até 3 dias úteis. Pedidos retirados não admitem devolução de produto em perfeito estado, exceto vício oculto comprovado.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>7. Uso aceitável</h2>
          <p style={p}>É proibido: usar dados de terceiros, automatizar compras com bots, tentar invadir o sistema, revender com fim ilícito. Identificada infração, podemos bloquear sua conta sem aviso.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>8. Limitação de responsabilidade</h2>
          <p style={p}>O site é fornecido &quot;como está&quot;. Não nos responsabilizamos por indisponibilidade temporária, perda de dados causada por terceiros, danos indiretos. Em qualquer caso, nossa responsabilidade fica limitada ao valor do pedido em discussão.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>9. Propriedade intelectual</h2>
          <p style={p}>Layout, textos, código e marca do site são propriedade do Atacado na Fronteira. É proibida reprodução sem autorização. Imagens e nomes de produtos pertencem aos respectivos fabricantes.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>10. Privacidade</h2>
          <p style={p}>O tratamento dos seus dados está descrito em nossa <a href="/politica-privacidade" style={{ color: '#6d28d9' }}>Política de Privacidade</a>.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>11. Alterações</h2>
          <p style={p}>Estes Termos podem ser atualizados. A versão vigente é sempre a publicada no site.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>12. Foro</h2>
          <p style={p}>Disputas serão resolvidas no foro do consumidor, conforme a legislação aplicável.</p>
        </div>

        <div style={sec}>
          <h2 style={h2}>13. Contato</h2>
          <p style={p}>Canais de atendimento em atualização. Consulte a página inicial para os canais disponíveis no momento.</p>
        </div>
      </div>
    </div>
  )
}
