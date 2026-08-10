-- ═══════════════════════════════════════════════════════════════════
-- Checkout Polish — P0/P1/P2 (sem CPF/CNPJ algoritmo)
-- ═══════════════════════════════════════════════════════════════════

-- Orders: PJ, PO Number, UTMs, PIX expiry, múltiplos cupons
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT CHECK (tipo_pessoa IN ('PF','PJ')),
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS pix_expira_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cupom_ids UUID[];

CREATE INDEX IF NOT EXISTS orders_pix_expira_idx ON orders(pix_expira_em) WHERE status = 'pendente_pagamento';

-- Configurações: pedido mínimo, ready time, cross-sell padrão
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS pedido_minimo_brl NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS estimated_ready_time TEXT,
  ADD COLUMN IF NOT EXISTS pix_expiry_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS recovery_abandono_min INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS recovery_template TEXT;

-- Default config: ready time
UPDATE configuracoes
SET estimated_ready_time = COALESCE(estimated_ready_time, 'Após a confirmação do PIX, seu pedido fica pronto para retirada em até 24 horas úteis.')
WHERE id = 'default';

-- Carrinhos persistidos (logado): user_id no cart_sessions já não existe? Adicionar
ALTER TABLE cart_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS cart_sessions_user_idx ON cart_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cart_sessions_abandono_idx ON cart_sessions(created_at, contatado) WHERE contatado IS NOT TRUE AND convertido IS NOT TRUE;
