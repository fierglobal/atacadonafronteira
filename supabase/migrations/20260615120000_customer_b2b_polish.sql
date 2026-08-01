-- ═══════════════════════════════════════════════════════════════════
-- Customer B2B Polish — equiparar com VTEX no escopo de atacado retirada
-- ═══════════════════════════════════════════════════════════════════

-- PJ opcional
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS ie TEXT;

-- Bloqueio com motivo
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueio_motivo TEXT,
  ADD COLUMN IF NOT EXISTS bloqueado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bloqueado_por TEXT;

-- Origem + aniversário (campanhas + relacionamento)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS origem TEXT,
  ADD COLUMN IF NOT EXISTS aniversario DATE;

-- Notas internas (CRM-light)
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  autor TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_notes_customer_idx ON customer_notes(customer_id, pinned DESC, created_at DESC);

-- Documentos (CNPJ, alvará, comprovante)
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  tamanho INTEGER,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_documents_customer_idx ON customer_documents(customer_id, created_at DESC);

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
