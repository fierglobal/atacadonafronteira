-- ═══════════════════════════════════════════════════════════════════
-- B2B Upgrade Migration — Atacado Paraguai
-- Inclui: RBAC granular, 2FA, audit log, promoções compostas,
-- sales channels, custom fields, FTS, webhooks, cópia de pedido.
-- ═══════════════════════════════════════════════════════════════════

-- ── P19: bcrypt → coluna senha_hash já existe; adiciona algoritmo ──
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS senha_algo TEXT NOT NULL DEFAULT 'sha256';

-- ── P21: 2FA TOTP ──
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── P6: RBAC granular ──
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── P7: Audit log universal ──
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_nome TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  diff JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);

-- ── P8: Promoções compostas ──
CREATE TABLE IF NOT EXISTS promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('desconto_pct','desconto_fixo','brinde','frete_gratis')),
  valor NUMERIC(12,2),
  brinde_product_id TEXT,
  condicoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  prioridade INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  inicio TIMESTAMPTZ,
  fim TIMESTAMPTZ,
  usos_max INTEGER,
  usos_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promocoes_ativo_idx ON promocoes(ativo, prioridade DESC);

-- ── P11: Sales Channels / Trade Policies ──
CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sales_channels (slug, nome, descricao)
  VALUES ('default', 'Padrão', 'Canal padrão (todos os clientes)')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sales_channel_ids UUID[] DEFAULT NULL;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sales_channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL;

-- ── P12: Webhooks ──
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_idx ON webhook_deliveries(webhook_id, created_at DESC);

-- ── P13: Cópia do pedido (hash público) ──
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS copy_hash TEXT UNIQUE;
UPDATE orders SET copy_hash = substr(md5(random()::text || id::text), 1, 16) WHERE copy_hash IS NULL;

-- ── P14: Search FTS (Postgres tsvector) ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION products_search_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.titulo,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.brand,'')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.sku,'')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.descricao,'')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_tsv_trg ON products;
CREATE TRIGGER products_search_tsv_trg
  BEFORE INSERT OR UPDATE OF name, titulo, brand, sku, descricao ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_tsv_update();

UPDATE products SET search_tsv = NULL WHERE search_tsv IS NULL;
UPDATE products SET name = name WHERE search_tsv IS NULL;

CREATE INDEX IF NOT EXISTS products_search_tsv_idx ON products USING GIN(search_tsv);

-- customers FTS
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION customers_search_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.nome,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.email,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.cpf,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.telefone,'')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_search_tsv_trg ON customers;
CREATE TRIGGER customers_search_tsv_trg
  BEFORE INSERT OR UPDATE OF nome, email, cpf, telefone ON customers
  FOR EACH ROW EXECUTE FUNCTION customers_search_tsv_update();

UPDATE customers SET nome = nome WHERE search_tsv IS NULL;
CREATE INDEX IF NOT EXISTS customers_search_tsv_idx ON customers USING GIN(search_tsv);

-- ── P16: Master Data dinâmico ──
CREATE TABLE IF NOT EXISTS custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL CHECK (entity IN ('products','customers')),
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','number','boolean','date','select')),
  options JSONB,
  required BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity, field_key)
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ═══════════════════════════════════════════════════════════════════
-- P18: RLS — habilitar em tudo, permitir leitura pública mínima
-- (APIs admin usam service_role e bypassam RLS por padrão)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_public_read ON products;
CREATE POLICY products_public_read ON products FOR SELECT USING (ativo = true);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categorias_public_read ON categorias;
CREATE POLICY categorias_public_read ON categorias FOR SELECT USING (true);

ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marcas_public_read ON marcas;
CREATE POLICY marcas_public_read ON marcas FOR SELECT USING (true);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_public_read ON reviews;
CREATE POLICY reviews_public_read ON reviews FOR SELECT USING (aprovado = true);

ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_channels_public_read ON sales_channels;
CREATE POLICY sales_channels_public_read ON sales_channels FOR SELECT USING (ativo = true);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_variants_public_read ON product_variants;
CREATE POLICY product_variants_public_read ON product_variants FOR SELECT USING (true);

-- Tabelas sensíveis: RLS habilitado, sem policies (service_role bypassa)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_logs ENABLE ROW LEVEL SECURITY;

-- profiles permite usuário ler/atualizar o próprio
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS profiles_self_read ON profiles';
    EXECUTE 'CREATE POLICY profiles_self_read ON profiles FOR SELECT USING (auth.uid() = id)';
    EXECUTE 'DROP POLICY IF EXISTS profiles_self_upsert ON profiles';
    EXECUTE 'CREATE POLICY profiles_self_upsert ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- Default: dono ganha todas as permissões
-- ═══════════════════════════════════════════════════════════════════
UPDATE admin_users
SET permissions = '{
  "produtos": "rw", "pedidos": "rw", "clientes": "rw",
  "financeiro": "rw", "cupons": "rw", "promocoes": "rw",
  "marketing": "rw", "configuracoes": "rw", "usuarios": "rw",
  "webhooks": "rw", "audit": "r", "import": "rw"
}'::jsonb
WHERE role = 'dono' AND permissions = '{}'::jsonb;
