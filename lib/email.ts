const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Atacado na Fronteira <noreply@atacadonafronteira.com>'

async function send(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.error('[email] RESEND_API_KEY não configurada'); return null }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) { console.error('[email]', res.status, await res.text()); return null }
    return ((await res.json()).id as string) ?? null
  } catch (e) { console.error('[email] exception', e); return null }
}

function layout(content: string, accent = '#8b5cf6') {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:#111;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;border-bottom:2px solid ${accent}">
        <span style="font-size:22px;font-weight:900;color:${accent};letter-spacing:-0.5px">ATACADO NA FRONTEIRA</span>
      </td></tr>
      <tr><td style="background:#0e0e0e;padding:32px;border-radius:0 0 12px 12px;border:1px solid #1a1a1a;border-top:none">
        ${content}
        <hr style="border:none;border-top:1px solid #1a1a1a;margin:28px 0">
        <p style="font-size:12px;color:#444;margin:0;text-align:center">
          Atacado na Fronteira — produtos importados do Paraguai<br>
          <a href="https://atacadonafronteira.com" style="color:${accent};text-decoration:none">atacadonafronteira.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export async function emailProntoRetirada(email: string, nome: string, orderNum: string, totalBrl: number) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#fff">Olá, ${nome.split(' ')[0]}! Seu pedido está pronto.</h2>
    <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px">
      O pagamento do pedido <strong style="color:#8b5cf6">${orderNum}</strong> foi confirmado e
      seu pedido já está separado e pronto para retirada.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="background:#111;border-radius:10px;padding:20px;border-left:4px solid #8b5cf6">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#8b5cf6">Valor pago</p>
        <p style="margin:0;font-size:24px;font-weight:900;color:#fff">R$ ${totalBrl.toFixed(2).replace('.', ',')}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="background:#111;border-radius:10px;padding:16px">
        <p style="margin:0;font-size:13px;color:#888;line-height:1.6">
          Compareça à nossa loja com o número do pedido para retirada.<br>
          Em caso de dúvidas, entre em contato.
        </p>
      </td></tr>
    </table>
    <a href="https://atacadonafronteira.com/conta/minha-conta/pedidos"
       style="display:inline-block;background:#8b5cf6;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
      Ver meu pedido
    </a>`)
  return send(email, `Pedido ${orderNum} pronto para retirada — Atacado na Fronteira`, html)
}

export async function emailConfirmacaoPedido(
  email: string, nome: string, orderNum: string,
  itens: { name: string; quantity: number; usd: number }[],
  totalBrl: number,
) {
  const linhas = itens.map(i =>
    `<tr><td style="padding:8px 0;font-size:13px;color:#888;border-bottom:1px solid #1a1a1a">${i.name} ×${i.quantity}</td>
     <td style="padding:8px 0;font-size:13px;color:#fff;text-align:right;border-bottom:1px solid #1a1a1a;font-weight:700">R$ ${(i.usd * i.quantity * 5.20).toFixed(2).replace('.', ',')}</td></tr>`
  ).join('')
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#fff">Pedido recebido, ${nome.split(' ')[0]}!</h2>
    <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px">
      Seu pedido <strong style="color:#8b5cf6">${orderNum}</strong> foi registrado com sucesso.
      Realize o PIX para confirmar. Após o pagamento, <strong>aguarde a aprovação</strong> — avisamos por e-mail e WhatsApp quando o pedido estiver liberado para retirada ou entrega.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#111;border-radius:10px;padding:16px">
      ${linhas}
      <tr><td colspan="2" style="padding-top:12px;font-size:16px;font-weight:900;color:#fff">Total</td></tr>
      <tr><td></td><td style="text-align:right;font-size:20px;font-weight:900;color:#8b5cf6">R$ ${totalBrl.toFixed(2).replace('.', ',')}</td></tr>
    </table>
    <a href="https://atacadonafronteira.com/checkout"
       style="display:inline-block;background:#8b5cf6;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
      Ver detalhes do pedido
    </a>`)
  return send(email, `Pedido ${orderNum} confirmado — Atacado na Fronteira`, html)
}

export async function emailComprovanteRecebido(
  adminEmail: string, orderNum: string,
  clienteNome: string, clienteEmail: string,
  totalBrl: number, comprovanteUrl: string,
) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#fff">Comprovante recebido</h2>
    <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px">
      O cliente enviou comprovante para o pedido <strong style="color:#f59e0b">${orderNum}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="background:#111;border-radius:10px;padding:20px">
        <p style="margin:0 0 2px;font-size:10px;color:#555;font-weight:700;letter-spacing:0.08em">CLIENTE</p>
        <p style="margin:0 0 12px;font-size:14px;color:#fff;font-weight:600">${clienteNome} · ${clienteEmail}</p>
        <p style="margin:0 0 2px;font-size:10px;color:#555;font-weight:700;letter-spacing:0.08em">VALOR</p>
        <p style="margin:0;font-size:20px;font-weight:900;color:#f59e0b">R$ ${totalBrl.toFixed(2).replace('.', ',')}</p>
      </td></tr>
    </table>
    <a href="${comprovanteUrl}" target="_blank"
       style="display:inline-block;background:#f59e0b;color:#000;font-weight:900;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-right:12px">
      Ver comprovante
    </a>
    <a href="https://atacadonafronteira.com/admin/pedidos"
       style="display:inline-block;background:#1a1a1a;color:#fff;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;text-decoration:none;border:1px solid #333">
      Abrir admin
    </a>`, '#f59e0b')
  return send(adminEmail, `[Comprovante] Pedido ${orderNum} — ${clienteNome}`, html)
}
