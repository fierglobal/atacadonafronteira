# Spec de implementação — Redesign "Ponte de Fronteira"

Mockup completo aprovado no Superdesign (projeto `b5e69448-2337-493d-8efc-fa4e6cf2beac`,
canvas: https://superdesign.dev/teams/c7805951-f44b-4ded-982d-8f67ccd6f445/projects/b5e69448-2337-493d-8efc-fa4e6cf2beac).
28 telas (14 rotas × desktop+mobile), tema claro preservando roxo `#420E76`/amarelo `#F6BD0C`,
motivo de ponte do logo como linguagem estrutural sutil.

Esta spec existe pra decidir ANTES de tocar em código: o que muda em cada arquivo, o que é
feature nova (não só reestilo), e em que ordem implementar sem quebrar produção no meio do
caminho. Não implementar nada sem reler esta spec primeiro.

**Revisada por um Checker independente (agente separado, sem o contexto de quem escreveu a
primeira versão) antes de qualquer código ser tocado** — confirmou as citações de linha do
checkout, a inexistência de qualquer coisa parecida com "recompra" no código/migrations, e
a estrutura dos 28 mockups reais. As correções abaixo (tokens, chrome compartilhado,
MinimoBar, atribuição de arquivo por agente, RLS) vêm dessa revisão.

## 1. Escopo confirmado com o Guilherme

- Visual + lógica: manter 100% das regras de negócio atuais (PIX único, retirada exclusiva
  CDE, tiers de preço por quantidade, pedido mínimo R$3.000 (confirmado no banco 07/10/2026,
  não R$2.000 como documentado antes), compra aberta sem aprovação de
  empresa) — **exceto** o checkout, que vira 3 etapas reais em vez do estado atual
  (`'checking'|'confirm'|'form'|'pix'`, 2 steps visuais).
- "Lista de Recompra/Cotação" é feature NOVA (não existe hoje, nem no banco nem na UI).
- Header/footer/tab-bar mobile precisam existir como componentes reais e consistentes em
  toda rota — hoje o footer só existe inline em `HomeClient.tsx`, e não há drawer mobile
  nem tab bar.

### 1.1 Mudança de catálogo pra 3 painéis (pedido da Mirella, posterior à v1 desta spec)

**O catálogo inteiro muda — isso é decisão de negócio, não só de UI.** Os 3 departamentos
atuais (Eletrônicos/Farmácia/Perfumaria) saem; o site passa a vender só 3 painéis:

1. **Apple** — iPhone, iPad, MacBook e demais produtos Apple. **Xiaomi e JBL saem do site**
   (hoje fazem parte de "Eletrônicos" junto com Apple — não entram no novo painel).
2. **Perfumes de Nicho** — perfumes de nicho importados + a subcategoria "Importados"
   (designers: Dior, Chanel, Carolina Herrera) se funde aqui.
3. **Perfumes Árabes** — catálogo árabe mais vendido, foco em venda por caixa fechada/atacado.

**Farmácia (GLP-1, tirzepatida, peptídeos, anabolizantes) sai do site inteiro** — não é
"painel sem destaque", é descontinuada aqui.

O mega-menu, o drawer mobile e as vitrines por departamento da Home (seção 4) já foram
regenerados no mockup do Superdesign para refletir essa estrutura (3 painéis, nenhum
resquício de Eletrônicos/Farmácia/Xiaomi/JBL — verificado por varredura nas 28 telas).
**O que falta fazer, que é trabalho de BANCO, não de UI:**

- Inativar (`ativo=false`, nunca `DELETE` — regra do ambiente) os produtos de Farmácia,
  Xiaomi e JBL. Confirmar com o Guilherme se é inativação pura ou se esses produtos migram
  pra outro projeto/tenant antes de inativar aqui.
- As categorias reais no banco hoje são `Eletrônicos > {Celular, Notebook, ...}` e
  `Perfumes > {Árabe, Importados, Nicho}` (ver `lib/categorias.ts`). Decidir: renomear a
  categoria raiz "Eletrônicos" pra "Apple" (ela já vira Apple-only depois da inativação de
  Xiaomi/JBL) ou criar uma categoria raiz nova — renomear é mais simples e preserva
  `categoria_id` em todos os produtos Apple já cadastrados. Para perfumes, "Importados" e
  "Nicho" se fundem num painel só ("Perfumes de Nicho") e "Árabe" vira o outro painel
  ("Perfumes Árabes") — ou mantém as 3 subcategorias no banco e funde só na apresentação
  (nav/vitrine), ou funde de verdade no banco. **Decisão pendente com o Guilherme antes do
  Agente A tocar em `lib/categorias.ts`.**
- `MARCAS_VITRINE` em `lib/site.ts` (hoje `['APPLE','XIAOMI','JBL']`) perde Xiaomi e JBL.

## 2. Arquitetura de componentes compartilhados

**Chrome é por-página, não por root layout — decisão fechada.** `app/layout.tsx` hoje só
tem `<Providers>{children}</Providers>` (que monta `CarrinhoSidebar`+`MinimoBar` globais,
mas NÃO `SiteHeader`). Cada página pública importa `SiteHeader` individualmente
(`app/page.tsx`, `app/produtos/page.tsx`, `app/categoria/[slug]/page.tsx`, e
`app/produtos/[id]/layout.tsx`); checkout/conta/pedido deliberadamente não importam nada.
`SiteFooter`/`MobileHeader`/`BottomTabBar` seguem o MESMO padrão — importados por página, não
no root layout — porque forçar pro root exigiria reconstruir a lógica condicional por rota
que `MinimoBar.tsx:23` já resolve (`pathname.startsWith('/admin') || pathname === '/checkout'
|| pathname.startsWith('/pix/')`). Usar esse mesmo padrão de condicional, não reinventar.

| Componente | Estado hoje | O que fazer |
|---|---|---|
| `components/SiteHeader.tsx` | Existe, server component, mega-menu funcional | Reestilizar (tokens novos) e trocar o mega-menu pra 3 painéis (Apple/Perfumes de Nicho/Perfumes Árabes) — ver seção 1.1. A lógica de busca de categorias (`getTopCats()`) precisa refletir a nova árvore depois da decisão de renomear/fundir categorias no banco |
| `components/DesktopNav.tsx` / `HeaderActions.tsx` | Existem | Reestilizar junto com o header |
| **`SiteFooter`** | **Extraído na Fase 1 (07/10/2026)** — `components/SiteFooter.tsx`, tagline e coluna "Painéis" atualizadas (Apple/Perfumes de Nicho/Perfumes Árabes, sem menção a Farmácia). Montado só na Home por enquanto (`HomeClient.tsx`) — **ainda falta** importar nas outras páginas públicas que hoje só têm `SiteHeader` sem footer (`/produtos`, `/categoria/[slug]`, `/produtos/[id]`) | Falta: Agente A monta `<SiteFooter brands={...} />` nas páginas que ainda não têm footer nenhum, ao reestilizar cada uma |
| **"MobileHeader"** | **Correção pós-implementação da Fase 1: já existia.** O drawer mobile (hamburger, busca, lista de categorias dinâmica vinda do banco, conta) já mora dentro de `components/HeaderActions.tsx` (`mobileMenu` state + `.nav-mobile-drawer`), não é componente separado nem precisa ser criado — a v1 desta spec estava errada nesse ponto | Não extrair/criar nada novo. Só reestilizar `HeaderActions.tsx`/`globals.css` (cores, ícones SVG reais em vez de ☰/×, drawer em accordion) quando a página entrar na vez de cada agente — não é bloqueante pra fundação |
| **`BottomTabBar`** | **Criado na Fase 1 (07/10/2026), já em produção local, testado em viewport mobile real** — `components/BottomTabBar.tsx`, 5 abas (Início/Recompra/Catálogo central elevado/Conta/Carrinho com badge real do carrinho), montado globalmente em `Providers.tsx`, visível só <900px, condicional por rota via `mostrarEm()`. Href da aba Recompra: `/conta/minha-conta/recompra` (fixado) | Feito — nada pendente aqui |
| **`MinimoBar.tsx`** | Existe, barra fixa inferior condicional por pathname, mostra "Faltam R$X" quando carrinho abaixo do mínimo | **Não estava na v1 desta spec — adicionado agora.** No mobile, nas rotas que também mostram `BottomTabBar` (Home/Categoria/Promoções/Conta), as duas barras fixas vão competir pelo mesmo espaço inferior. Fix: quando `BottomTabBar` está presente, `MinimoBar` sobe pra `bottom: 84px` (altura do tab bar) em vez de `bottom: 0` — mudança pequena e isolada em `MinimoBar.tsx`, não em `BottomTabBar` |
| `lib/site.ts` / tokens de design | **Não existe nenhum token hoje** — não é "ad-hoc", é zero. `#420E76` está hardcoded como string literal em pelo menos 26 arquivos (37× em `produtos/[id]/page.tsx`, 36× em `checkout/page.tsx`). Confirmado: não existe `tailwind.config` nem `design-system.md` de produção, só inline `style={{}}` | Criar constantes novas em `lib/site.ts`/`globals.css` pros componentes DESTA rodada (Fundação + os 14 reestilizados). **Não migrar as centenas de ocorrências hardcoded fora do escopo** (admin, `pix/[orderNum]`, `relatorio-pedidos`) — isso é escopo consciente, não uma lacuna |

## 3. O que é feature nova de verdade (não é só CSS)

- **Lista de Recompra/Cotação**: precisa de tabela nova no Supabase (ex.
  `produtos_salvos: id, user_id, product_id, created_at`), rota de API pra
  adicionar/remover/listar, botão "salvar" na PDP (não existe hoje), e a ação em lote
  "Pedir Cotação" (abre WhatsApp com a lista formatada — montar a mensagem server-side ou
  client-side, decidir qual). **Levantar esse esforço com o Guilherme antes de estimar prazo
  — é a única peça do redesign que não é reestilo.** Confirmado por grep completo do repo
  (`.ts`/`.tsx`/`.sql`/`supabase/migrations/`): não existe nada parecido com
  "recompra"/"favorito"/"wishlist"/"salvos" hoje — é feature 100% nova, não uma renomeação
  de algo existente.
  - **RLS obrigatório na criação da tabela**, não depois — ver checklist de segurança do
    ambiente ("tabela nova nasce aberta"). `user_id` com policy que só deixa cada usuário
    ler/escrever as próprias linhas.
  - **Conflito de arquivo, resolver por sequência, não paralelismo total**: o botão "salvar"
    entra em `app/produtos/[id]/page.tsx`, que é o MESMO arquivo que o Agente A (Home +
    Categoria + PDP) reestiliza. Não são dois agentes editando ao mesmo tempo: o Agente D
    entrega primeiro o hook (`useListaRecompra` ou similar) + o componente de botão
    isolados (sem tocar na PDP), e só então o Agente A — já de posse desse componente —
    insere a chamada dentro da PDP como parte do próprio trabalho de reestilo. D nunca abre
    `produtos/[id]/page.tsx`.
  - **Mesmo problema em `MinhaContaNav.tsx`**: o Agente C já está convertendo essa sidebar
    de escura pra clara e montando os sub-tabs mobile — é ele quem adiciona a 3ª entrada de
    nav pra Recompra (sabendo de antemão que a rota é `/conta/minha-conta/recompra`, fixada
    na seção 2). O Agente D entrega só o conteúdo da página, nunca toca em
    `MinhaContaNav.tsx`.
- **Checkout em 3 etapas**: hoje `PageState` tem 4 valores mas só 2 aparecem no
  `StepIndicator` (Dados/Pagamento). Precisa: (a) decidir se "Carrinho" vira de fato um 3º
  `PageState` antes do form, ou se continua sendo só o drawer que leva pro checkout; (b)
  se virar etapa real, o `StepIndicator` passa de 2 pra 3 nós e o fluxo de navegação entre
  estados precisa ser revisto (`app/checkout/page.tsx:294-330` é o `StepIndicator` atual).
- **Promoções (`/promocoes`)**: rota nova — hoje não existe filtro de "produtos em
  promoção" como página própria. Verificar se `isPromo()`/`effectiveBadges()` (`lib/produto.ts`)
  já dão a query certa ou se precisa de uma nova query server-side.
- **`components/EntregaSeguro.tsx`**: não estava em nenhuma tabela da v1 desta spec, mas
  renderiza dentro do checkout (escopo do Agente B) — hoje é um radio-group de UMA opção só
  (a entrega por Foz/Brasil foi descontinuada, só resta Ciudad del Este). O próprio
  `.superdesign/init/components.md` já sinalizava que isso precisa de decisão explícita: o
  mockup mostra uma linha de confirmação estática, não mais um radio de opção única — o
  Agente B implementa como linha estática, não mantém o radio-de-um.

## 4. Mapeamento por rota (desktop + mobile)

| Rota | Arquivos principais | Chrome mobile | Risco |
|---|---|---|---|
| `/` | `app/page.tsx`, `app/HomeClient.tsx`, `HeroRotativo.tsx`, `HomeSecoes.tsx` | Tab bar | Vitrine por departamento já existe (24/09), mockup já atualizado pra vitrine por PAINEL (Apple/Nicho/Árabe — seção 1.1); reestruturar o código mantendo a correção de "não misturar categorias" |
| `/categoria/[slug]` | `app/categoria/[slug]/page.tsx` | Tab bar | Slugs mudam (`eletronicos`→`apple`, e os 2 painéis de perfume) — ver decisão de categoria pendente na seção 1.1 antes de tocar nas rotas |
| `/produtos` (catálogo completo) | `app/produtos/page.tsx` | Tab bar | **Não tinha mockup dedicado nem linha nesta tabela na v1.** Reusa a mesma estrutura visual de `/categoria/[slug]` (já importa `SiteHeader` e `CategoriaProductCard`) — Agente A aplica o mesmo padrão, sem mockup extra necessário |
| `/produtos/[id]` | `app/produtos/[id]/page.tsx` (977 linhas) | Barra de ação fixa | Arquivo grande, tocar em pedaços (galeria/buy-card/descrição/relacionados são blocos JSX distintos já). Recebe também o botão "salvar" da Lista de Recompra — ver seção 3 (conflito de arquivo resolvido por sequência) |
| Carrinho | `components/CarrinhoSidebar.tsx` | Vira tela cheia no mobile — **decisão**: mobile usa rota própria ou mesmo componente com breakpoint? | Hoje é só drawer; "carrinho tela cheia no mobile" é comportamento novo, checar se o drawer atual já tem alguma lógica condicional por viewport |
| `/checkout` (dados) | `app/checkout/page.tsx:1029-1221` | Barra de ação fixa | Ver risco de 3 etapas acima |
| `/checkout` (pix) | `app/checkout/page.tsx:765-916` | Sem chrome especial | — |
| `/conta/login` | `app/conta/login/page.tsx` | Sem chrome (standalone) | — |
| `/conta/cadastro` | `app/conta/cadastro/page.tsx` | Sem chrome (standalone) | — |
| `/conta/minha-conta` | `app/conta/minha-conta/page.tsx` + `MinhaContaNav.tsx` | Tab bar + sub-tabs horizontais substituindo a sidebar | **Sidebar hoje é dark (`#080808`) — vira clara.** Mobile precisa de um padrão de "3 sub-tabs" que não existe hoje |
| `/conta/minha-conta/pedidos` | `app/conta/minha-conta/pedidos/page.tsx` | Tab bar + sub-tabs | — |
| `/conta/minha-conta/pedidos/[id]` | `app/conta/minha-conta/pedidos/[id]/page.tsx` (442 linhas) | Sem chrome, seta de voltar | — |
| `/pedido/[hash]` | `app/pedido/[hash]/page.tsx` + `PrintButton.tsx` | Sem chrome | Página pública/impressão, cuidado para não quebrar o fluxo de impressão |
| Lista de Recompra | **rota nova**, ex. `/conta/minha-conta/recompra` | Tab bar + sub-tabs | Feature nova — ver seção 3 |
| `/promocoes` | **rota nova** | Tab bar | Rota nova — ver seção 3 |

## 5. Ordem de implementação proposta

1. **Fundação, sozinha, bloqueante**: `SiteFooter` extraído + montado globalmente,
   `MobileHeader`, `BottomTabBar`, tokens de design novos em `lib/site.ts`/`globals.css`.
   Nada mais entra até isso fechar — toda página depende disso.
2. **Em paralelo, depois da fundação**:
   - Agente A: Home + Categoria + PDP (as 3 já redesenhadas ad-hoc em 24/09 — mesclar com o
     novo sistema, não recriar do zero)
   - Agente B: Carrinho + Checkout completo (inclui a decisão de 3 etapas da seção 3)
   - Agente C: Área da conta (Login/Cadastro/Perfil/Pedidos/Detalhe) + conversão da sidebar
     escura pra clara
   - Agente D: Lista de Recompra (schema + API + UI, feature nova) + Promoções (rota nova)
3. **Integração**: um agente consolida, roda `tsc`+`next build`, confere nenhuma rota
   quebrou, smoke test visual de cada rota em preview.
4. **Deploy**: preview primeiro, produção só com aprovação explícita do Guilherme — como
   sempre, nunca `vercel --prod` sem pedido direto.

## 6. Fase 1 concluída (07/10/2026) — o que foi feito e o que achei fazendo

- `components/SiteFooter.tsx` extraído, `components/BottomTabBar.tsx` criado,
  tokens de cor em `lib/site.ts` (`COR_ROXO`/`COR_ROXO_ESCURO`/`COR_LILAS`/`COR_AMARELO`).
  `MinimoBar.tsx` ajustado pra subir `bottom: 64px` nas rotas com tab bar
  (`.minimo-bar-acima-tabbar`, só mobile). `tsc` + `next build` limpos, testado
  em viewport mobile real (390×844) com browser de verdade: tab bar renderiza,
  drawer abre, footer aparece completo sem ficar coberto.
- **Bug real achado só testando, não na leitura de código**: `MARCAS_VITRINE`
  ainda tinha `'APPLE'` depois da migração de categoria — como a categoria raiz
  "Eletrônicos" virou "Apple", a vitrine de marca e a categoria raiz colidiam
  em nome, duplicando "APPLE" no menu (mega-menu desktop E drawer mobile).
  Corrigido: `MARCAS_VITRINE = []` (a categoria raiz já cobre o caso).
- **Não mexido ainda**: `HeaderActions.tsx` continua com o visual antigo
  (ícones ☰/×, drawer em lista plana) — funcional e correto, só não bate com
  o mockup aprovado. Fica pro Agente A/C reestilizar junto da página que
  tocarem, não é bloqueante.

Cada agente que edita arquivos usa `isolation: "worktree"` pra não colidir durante o
trabalho — mas isso **não elimina conflito, só atrasa pro momento do merge**. Os dois
pontos reais de conflito (`produtos/[id]/page.tsx` entre A e D; `MinhaContaNav.tsx` entre C
e D) já foram resolvidos por sequência/atribuição única na seção 3, não por isolamento —
isolar sozinho não bastava. Maker e Checker separados por agente/fase — quem implementa não
é quem valida.

## 7. Agente A concluído (08/10/2026) — Categoria, Catálogo e PDP

- `/categoria/[slug]`, `/produtos` e `/produtos/[id]` reestilizados seguindo os
  mockups (`048de4fd...`, `860b2bfe...`): cards com `border-radius` maior e botão
  full-width "Adicionar ao carrinho", buy card da PDP com preço em Inter, tier
  chips e selos de confiança redesenhados, galeria com thumbs maiores,
  relacionados com botão circular. `SiteFooter` montado nas 3 páginas (faltava).
- **Bug real achado só testando**: `SiteFooter.tsx` tinha `onMouseEnter`/
  `onMouseLeave` inline — quebrava com 500 ("Event handlers cannot be passed to
  Client Component props") quando montado num Server Component puro
  (`/categoria/[slug]`). Nunca tinha quebrado porque até então só rodava dentro
  do `HomeClient.tsx` ('use client'). Corrigido pra CSS hover.
- **Bug real achado só testando**: PDP ainda usava cores da paleta antiga
  (`#A965ED`/preto, inclusive um `#0fdc00` verde neon no hover do CTA principal)
  em vez do roxo `#420E76` da marca — corrigido.
- `tsc` + `next build` limpos, testado em viewport desktop (1440) e mobile
  (~500-606) com browser real, incluindo interação de tier (clicar no chip
  muda preço/barra). Commit `61f6a57`, deployado e confirmado em produção.

## 8. Agente B concluído (08/10/2026) — Carrinho e Checkout

- `CarrinhoSidebar.tsx` e as 3 telas do checkout (`'form'`/`'confirm'`/`'pix'`)
  reestilizados seguindo os mockups (`a4a80198...` carrinho, `735cc761...`
  dados, `8ca5950d...` pix): cards de item maiores com imagem com padding,
  `AovBar` e toggle PF/PJ redesenhados, inputs com radius maior e fundo cinza.
- **Decisão da seção 3 resolvida**: "Carrinho" vira um 3º nó do `StepIndicator`
  (Carrinho✓ → Dados → Pagamento) em vez de um `PageState` novo — confirmado
  pelos 3 mockups de checkout, que sempre mostram "CARRINHO" já concluído. O
  fluxo de estados (`'checking'|'confirm'|'form'|'pix'`) não mudou.
- `EntregaSeguro.tsx`: só existe retirada em Ciudad del Este — virou linha
  estática de confirmação em vez de radio-group de 1 opção só, como o mockup
  já mostrava (consistente com a decisão já registrada na seção 3).
- **Bug real achado só testando**: CTA "Finalizar Pedido" usava `#A965ED`/preto
  em vez do roxo `#420E76`; o carrinho mostrava "BRL 123,45" em vez de
  "R$ 123,45" (prefixo de moeda genérico, destoando do resto do site que nunca
  expõe seletor de moeda) — ambos corrigidos.
- **Achado que NÃO foi corrigido, fica registrado pra decisão do Guilherme**:
  `proxy.ts:56` trata `/checkout` como rota protegida igual
  `/conta/minha-conta` — redireciona pra `/conta/login` sempre que não há
  sessão, **mesmo em produção**. Isso significa que o fluxo "guest" inteiro
  dentro de `app/checkout/page.tsx` (`PageState==='form'` sem `userId`, seção
  1 desta spec: "compra aberta sem aprovação de empresa") é código morto hoje —
  nenhum visitante sem login consegue alcançá-lo. Não mexi nisso (é decisão de
  produto, não de visual) — só reestilizei a tela sabendo que ela está lá,
  pronta, esperando essa trava ser revista.
- `tsc` + `next build` limpos. Testado em desktop via browser real (fluxo
  completo: adicionar ao carrinho → abrir drawer → Finalizar Pedido → tela de
  Dados logada como guest, via trava do middleware temporariamente desligada
  só em dev e revertida antes do commit). Mobile do checkout em si não pôde
  ser testado por browser automation nesta sessão (bloqueio do classifier em
  `/checkout` especificamente) — o carrinho mobile foi testado normalmente, e
  o form usa o mesmo CSS responsivo (`grid-template-columns: 1fr` <768px) já
  validado em Categoria/Produtos/PDP. Commit `a977d5b`, deployado e confirmado
  em produção (carrinho testado ao vivo; `/checkout` confirmado via 307
  redirect esperado, já que a trava do middleware está intacta em produção).

## 9. Agente C concluído (09/10/2026) — Área da Conta e Promoções

- Login, Cadastro, Minha Conta (perfil/pedidos/detalhe) reestilizados seguindo
  os mockups. `MinhaContaNav.tsx` + `layout.tsx` viram sidebar clara (era
  `#080808` escuro, conforme a seção 2 já apontava) — mobile vira barra
  horizontal; a 3ª entrada "Lista de Recompra" já entrou apontando pra rota
  fixada (seção 2), mesmo sem a página existir ainda (ficou pro Agente D,
  entregue na seção 10).
- `/pedido/[hash]` (cópia pública/impressão) redesenhada seguindo o mockup.
  **Bug estrutural real e pré-existente corrigido** (confirmado via
  `git show HEAD`, não introduzido nesta sessão): a página renderizava seu
  próprio `<html>/<body>` aninhado dentro do root layout — React acusava
  "mounting a new html/body component" e um hydration mismatch real (não o
  falso-positivo de extensão de navegador já documentado nas fases
  anteriores). Trocado pro padrão correto do App Router (`generateMetadata` +
  `<div>`), mantendo 100% do CSS de impressão.
- `/promocoes` criada (rota nova prevista na seção 4): lista produtos com
  `usd_price_promo` ativo, mesmo critério de `isPromo()` (`lib/produto.ts`,
  como a seção 3 sugeria verificar primeiro) — sem precisar de query nova.
  Reusa `CategoriaProductCard` já reestilizado. Link "PROMOÇÕES" (destaque
  vermelho) adicionado em `DesktopNav.tsx` e `HeaderActions.tsx` — sem isso a
  rota existia mas não era alcançável por ninguém.
- `tsc` + `next build` limpos. Testado em desktop e mobile via browser real,
  incluindo a página de perfil/pedidos/recompra logada (mockando
  temporariamente os dados do Supabase client-side, revertido antes do
  commit — não criou usuário real nem tocou produção). Commit `ce0b084`,
  deployado e confirmado em produção.

## 10. Agente D concluído (09/10/2026) — Lista de Recompra/Cotação

Única peça do redesign que não era reestilo (seção 3) — alinhado com o
Guilherme antes de tocar no banco: mensagem do WhatsApp montada no client
(mesmo padrão do carrinho/PDP), visitante **e** logado podem salvar
(sincroniza ao logar), autorização explícita pra criar a tabela e implementar
de uma vez.

- Migration `create_produtos_salvos`: tabela `produtos_salvos` (`user_id`,
  `product_id`, `unique(user_id, product_id)`) nasce com RLS própria por
  usuário desde a criação (`policy auth.uid() = user_id`, mesmo padrão de
  `profiles.own_profile`) — não depois, como o checklist de segurança do
  ambiente exige.
- `ListaRecompraContext.tsx`: visitante salva em `localStorage`; ao logar
  (evento `onAuthStateChange`), sincroniza o que estava local pro banco
  (`upsert` com `ignoreDuplicates`) e passa a ler sempre do banco via JOIN em
  `products` — nome/preço exibidos nunca ficam desatualizados, diferente de
  guardar um snapshot fixo.
- `BotaoSalvarRecompra.tsx`: toggle na PDP, abaixo do CTA principal (entrou
  em `app/produtos/[id]/page.tsx` nesta mesma sessão — não houve o conflito
  de arquivo entre Agente A/D que a seção 3 antecipava, já que os dois foram
  feitos em sequência por quem já tinha o contexto da PDP reestilizada).
- `/conta/minha-conta/recompra`: lista com seleção múltipla, total estimado e
  botão "Pedir Cotação" que abre `wa.me` com a lista formatada.
- `tsc` + `next build` limpos. Testado end-to-end em desktop e mobile via
  browser real: salvar como visitante (localStorage confirmado), listar,
  (de)selecionar, remover — a sincronização visitante→logado (upsert +
  recarregar do banco) foi validada por leitura cuidadosa do código, não
  por teste ao vivo com usuário real (criar conta de verdade só pra isso
  seria mais invasivo que justificável). Commit `ca0e8bc`, deployado e
  confirmado em produção (botão "salvar" testado ao vivo; `/recompra`
  confirmada via 307 redirect esperado, trava do middleware intacta).

## 11. Redesign "Ponte de Fronteira" — todas as 14 rotas concluídas (09/10/2026)

Os 4 agentes da seção 5 fecharam: Categoria/Catálogo/PDP (seção 7), Carrinho/
Checkout (seção 8), Conta/Promoções (seção 9), Lista de Recompra (seção 10) —
mais a Fundação (seção 6). Cada fase seguiu o mesmo processo: ler código real
→ ler mockup Superdesign → editar preservando 100% da lógica de negócio →
`tsc`+`build` limpos → testar em browser real (desktop e mobile) → perguntar
antes de commitar/dar push. Pendências que ficam registradas, não resolvidas
nesta rodada:

- **`proxy.ts` bloqueia checkout guest em produção** (seção 8) — decisão de
  produto pra revisar com o Guilherme, não um bug de reestilo.
- **`HeaderActions.tsx` continua com o visual antigo** (ícones ☰/×, drawer em
  lista plana) — sinalizado desde a seção 6, nunca bloqueante, nenhum agente
  chegou a reestilizá-lo.
- Os bugs reais achados testando (duplicação "Apple" no menu, hero quebrado,
  SiteFooter quebrando em Server Component, cores da paleta antiga em vários
  CTAs, prefixo "BRL" no carrinho, `<html>` aninhado em `/pedido/[hash]`)
  foram todos corrigidos e confirmados em produção — nenhum é mais pendente.

## 12. Trava de checkout guest revertida (09/10/2026)

A pendência da seção 8/11 ("`proxy.ts` bloqueia checkout guest em produção")
foi revisada e resolvida: `proxy.ts:56` deixou de tratar `/checkout` como rota
protegida — `isProtected` agora cobre só `/conta/minha-conta` e
`/conta/minha-conta/*`. Justificativa (seção 1 desta spec: "compra aberta sem
aprovação de empresa"; o fluxo guest em `app/checkout/page.tsx` já existia e
funcionava, só estava inalcançável; site B2B com pedido mínimo alto, onde
fricção extra no checkout tem custo desproporcional). `tsc`+`build` limpos;
testado em dev real (não em produção com trava temporariamente desligada): com
1 item no carrinho, `/checkout` renderiza direto a tela "Dados" (3 passos:
Carrinho✓ → Dados → Pagamento) sem redirecionar pra login, enquanto
`/conta/minha-conta` continua redirecionando (307) como esperado. Console sem
erros reais (só o warning de extensão do navegador já conhecido).
`HeaderActions.tsx` com visual antigo (seção 11) continua como única pendência
em aberto, fora do escopo desta mudança.
