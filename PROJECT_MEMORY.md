# PROJECT_MEMORY — Atacado Paraguai Novo

## Stack
- Next.js + Supabase (`xjmapfpfgwoivlsalltb`) + Vercel
- E-commerce B2B (atacadoparaguai.app)

## Estado atual
- Admin upgrade concluído (14/06/2026): RBAC granular, audit universal, promoções compostas, sales channels, webhooks HMAC, FTS, CSV import, custom fields, 2FA, rate limit, RLS em 22 tabelas
- Sidebar em 6 grupos colapsáveis
- Go-live checklist pendente (~2-3h de setup)

## Regras críticas
- Supabase: `xjmapfpfgwoivlsalltb` — mpimportspy ≠ este projeto
- Inline styles + CSS vars (não CSS global)
- `requireAdmin(scope, level)` para autorização
- bcrypt rehash-on-login
- Rate-limit in-memory (risco aceito)
- FTS: pt+simple
- tabela é `products` (não `produtos`)
- 2FA TOTP otpauth
- CRON_SECRET setado, ADMIN_PASSWORD cookie → SHA-256 derivado

<!-- session 2026-06-23 12:32 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 12:40 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 12:58 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 14:05 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 14:10 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 14:17 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 14:31 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 14:54 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 17:41 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 18:44 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 18:57 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 22:04 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-23 22:48 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 09:10 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 09:16 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 10:35 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 11:15 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:03 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:08 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:09 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:25 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:27 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:28 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:31 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:33 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 13:34 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 14:50 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 14:59 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:02 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:04 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:19 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:26 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:35 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:35 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:38 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:40 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:42 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:52 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 15:52 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 18:33 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 18:33 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 18:35 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 18:37 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 18:39 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 21:20 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 21:21 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 21:22 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 21:25 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-24 21:27 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-06-25 20:04 -->
<!-- arquivos: app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts,app/api/admin/clientes/[id]/route.ts -->

<!-- session 2026-07-29 09:39 -->
<!-- arquivos: .gitignore,app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts -->

<!-- session 2026-07-29 09:42 -->
<!-- arquivos: .gitignore,app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts -->

<!-- session 2026-07-31 18:13 -->
<!-- arquivos: .gitignore,app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts -->

<!-- session 2026-07-31 18:25 -->
<!-- arquivos: .gitignore,app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts -->

<!-- session 2026-07-31 19:34 -->
<!-- arquivos: .gitignore,app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts -->

<!-- session 2026-07-31 20:12 -->
<!-- arquivos: .gitignore,app/admin/clientes/page.tsx,app/admin/configuracoes/page.tsx,app/admin/financeiro/page.tsx,app/admin/layout.tsx,app/admin/login/page.tsx,app/admin/page.tsx,app/admin/pedidos/page.tsx,app/admin/produtos/page.tsx,app/api/admin/clientes-list/route.ts -->

<!-- session 2026-08-13 21:47 -->
<!-- arquivos: app/apple-icon.png,app/favicon.ico,app/icon.png -->

<!-- session 2026-08-13 21:55 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-13 22:01 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-13 22:05 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-13 22:06 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-13 22:36 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 07:09 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 07:13 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 07:38 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 07:42 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 08:52 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 08:58 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 09:31 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 09:34 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 10:09 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 14:29 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-14 14:43 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-15 21:18 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-15 21:33 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-15 22:08 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-15 23:28 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-20 10:42 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-20 10:48 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-20 10:53 -->
<!-- arquivos: PROJECT_MEMORY.md -->

<!-- session 2026-08-21 20:30 -->
<!-- arquivos: PROJECT_MEMORY.md -->
