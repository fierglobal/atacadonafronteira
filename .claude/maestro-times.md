# Maestro — times de worktree (Atacado na Fronteira)

Criado em 02/09/2026. Coordenação feita pela sessão Maestro (Claude Code), um
terminal Claude Code dedicado por worktree, um domínio de negócio por terminal.

## Achados que definem como o gate funciona (não mudar sem reconferir)

- Push em `main` dispara **dois** deploys de produção: Vercel (integração Git
  nativa — é quem serve atacadonafronteira.com de verdade) e a GitHub Action
  `.github/workflows/cloudflare-pages.yml` ("Fallback", Cloudflare Workers).
- `main` **não tem proteção de branch** nenhuma (sem review obrigatório, sem
  status check obrigatório). Push direto passa liso.
- **Não existe staging separado** — o preview do Vercel usa o mesmo banco
  Supabase de produção (`proxy.ts` só bloqueia escrita não-GET em preview, é
  trava de aplicação, não de infra).
- Sem CI de build/lint/teste em PR.

Por isso o gate do Maestro abaixo é a única rede de segurança real deste
projeto — não pular etapa dele.

## Times e worktrees

| Domínio | Branch | Diretório | Cobre |
|---|---|---|---|
| Pedidos & Vendas | `team/pedidos-vendas` | `~/projetos/atacadonafronteira-worktrees/pedidos-vendas` | `app/admin/pedidos`, `app/api/admin/pedidos*`, `app/checkout`, `app/api/checkout*`, `app/pedido`, `app/pix`, `app/relatorio-pedidos`, `app/api/pedido`, `app/api/cart*`, `app/admin/carrinhos`, `app/api/cron/recovery-abandono` |
| Catálogo | `team/catalogo` | `~/projetos/atacadonafronteira-worktrees/catalogo` | `app/admin/produtos`, `app/api/admin/produtos*`, `app/produtos`, `app/api/produtos`, `app/categoria`, `app/api/categorias`, `app/admin/categorias`, `app/admin/marcas`, `app/admin/estoque`, `app/admin/importar`, `app/api/facetas`, `app/api/cross-sell` |
| Clientes & Marketing | `team/clientes-marketing` | `~/projetos/atacadonafronteira-worktrees/clientes-marketing` | `app/admin/clientes`, `app/api/admin/clientes*`, `app/conta`, `app/api/conta`, `app/api/customer-lookup`, `app/admin/usuarios`, `app/admin/promocoes`, `app/admin/cupons`, `app/api/cupom`, `app/admin/avaliacoes`, `app/api/reviews`, `app/admin/home`, `app/api/home-config` |
| Operação | `team/operacao` | `~/projetos/atacadonafronteira-worktrees/operacao` | `app/admin/configuracoes`, `app/admin/financeiro`, `app/admin/relatorios`, `app/admin/webhooks`, `app/admin/sales-channels`, `app/admin/custom-fields`, `app/admin/audit`, `app/admin/seguranca`, `app/admin/busca`, `lib/*` (compartilhado — avisar os outros times antes de mexer) |

`lib/*.ts` (`admin-auth.ts`, `supabase.ts`, `config.ts` etc.) é compartilhado
entre todos os domínios. Qualquer time que precisar mexer lá avisa o Maestro
antes — é a zona de maior risco de colisão entre terminais.

## Regras de cada terminal

1. **Nunca commitar nem dar push fora da própria branch** (`team/<dominio>`).
   Sem exceção, mesmo pra "correção rápida" num arquivo de outro domínio —
   nesse caso, avisa o Maestro.
2. Sempre trabalhar dentro do próprio diretório de worktree. Nunca editar
   arquivos do worktree principal (`~/projetos/atacadonafronteira`) nem de
   outro time.
3. `git pull --rebase origin main` no início de cada tarefa nova, pra pegar o
   que os outros times já mergearam.
4. Reportar pro Maestro com evidência real (output de build, curl, screenshot)
   — nunca "feito"/"funcionando" sem mostrar o resultado.
5. **Login no admin é sempre feito pelo dono (Guilherme) manualmente.** Nenhum
   terminal loga sozinho usando credencial salva ou automatiza login.

## Gate de merge obrigatório do Maestro

Nenhuma mudança vai pra `main` sem passar, nesta ordem, por:

1. **Rebase** da branch do time em cima da `main` atualizada.
2. **Build real**, output mostrado no chat — nunca aceitar "deve estar ok"
   sem rodar. `npm run build` limpo (sem `error`/`fail`, ignorando "0 errors").
3. **Preview visual no portal do Maestri** — nunca só build/lint passando.
   Servidor local ou preview real, tela renderizada e conferida, fluxo
   testado de verdade quando fizer sentido (não só "a página carrega").
4. Só então **push/merge em `main`** (política atual: merge automático pelo
   Maestro, sem aprovação manual por PR — decidido em 02/09/2026, revisar se
   algo der errado).
5. **Resumo com evidência real** pro dono: o que mudou, o output do build, o
   que foi visto no preview, link/print quando fizer sentido.

Pular qualquer uma dessas etapas não é permitido, mesmo sob pressão de tempo.
