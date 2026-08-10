-- ═══════════════════════════════════════════════════════════════════
-- Product B2B Polish — Ondas A/B/C (exceto EAN/MPN)
-- ═══════════════════════════════════════════════════════════════════

-- ── Onda A #2: unidade de venda + multiplicador + venda mínima ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unidade_venda TEXT,
  ADD COLUMN IF NOT EXISTS multiplicador INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS venda_minima INTEGER NOT NULL DEFAULT 1;

-- ── Onda C #9: descrição curta ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS descricao_curta TEXT;

-- ── Onda B #7: badges ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS badges TEXT[];

-- ── Onda C #10: agendamento de publicação ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
UPDATE products SET published_at = COALESCE(created_at, now()) WHERE published_at IS NULL AND ativo = true;

-- ── Onda A #1: bandas de preço escalonadas ──
CREATE TABLE IF NOT EXISTS product_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_min INTEGER NOT NULL CHECK (qty_min > 0),
  qty_max INTEGER,
  usd_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_price_tiers_product_idx ON product_price_tiers(product_id, qty_min);

-- ── Onda A #3: custom fields por categoria ──
ALTER TABLE custom_field_defs
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE;

-- ── Onda B #5: relações entre produtos (cross-sell/compre junto) ──
CREATE TABLE IF NOT EXISTS product_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'compre_junto' CHECK (tipo IN ('similar','compre_junto','acessorio','upsell')),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, related_product_id, tipo)
);
CREATE INDEX IF NOT EXISTS product_relations_product_idx ON product_relations(product_id, tipo, ordem);

-- ── RLS para as tabelas novas ──
ALTER TABLE product_price_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_tiers_public_read ON product_price_tiers;
CREATE POLICY price_tiers_public_read ON product_price_tiers FOR SELECT USING (true);

ALTER TABLE product_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_relations_public_read ON product_relations;
CREATE POLICY product_relations_public_read ON product_relations FOR SELECT USING (true);
