# Arquitetura

Este documento explica como o app está organizado e por que as principais decisões foram
tomadas. Para rodar, testar e reproduzir cenários, veja o [README](README.md).

## Sumário

- [Visão geral](#visão-geral)
- [Organização do código](#organização-do-código)
- [Contratos REST](#contratos-rest)
- [Eventos Socket.IO](#eventos-socketio)
- [Sessão](#sessão)
- [Estado do carrinho](#estado-do-carrinho)
- [Checkout e pedidos](#checkout-e-pedidos)
- [Estratégia de cache](#estratégia-de-cache)
- [Tempo real](#tempo-real)
- [Backend simulado (MSW)](#backend-simulado-msw)
- [Performance](#performance)
- [Acessibilidade](#acessibilidade)
- [Design tokens](#design-tokens)
- [Desvios do Figma](#desvios-do-figma)
- [Limitações e próximos passos](#limitações-e-próximos-passos)

## Visão geral

```
 ┌──────────────── navegador ────────────────────────────────────────────────────────────┐
 │                                                                                      │
 │  rotas + features ──useQuery/useMutation──▶ TanStack Query (cache por chave)         │
 │        ▲                                          │                                  │
 │        │ cache atualizado                 endpoints.ts → http.ts (Axios + Zod)       │
 │        │                                          │ REST /api                        │
 │  RealtimeProvider ── socket.io-client ──┐         ▼                                  │
 │        ▲                                │   ┌─────────────── src/mocks ────────────┐ │
 │        │ nft.updated / order.updated    └──▶│ Service Worker (MSW) → handlers REST │ │
 │        └────────────────────────────────────│ servidor Socket.IO (socket.io-binding)│ │
 │                                             │ regras de negócio → banco (storage)  │ │
 │                                             └──────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────────────────────────────────┘
```

O app conhece o backend **somente** pelos contratos REST e pelos eventos Socket.IO. A camada
simulada (`src/mocks`) é um módulo isolado — uma regra de ESLint (`no-restricted-imports`) impede
que o código do app a importe — e é carregada apenas quando `VITE_ENABLE_MOCKS=true`. Trocar por
um backend real é configuração: desligar os mocks e apontar `VITE_API_URL`/`VITE_SOCKET_URL`.

## Organização do código

- **`src/api`** — contratos Zod (`contracts/`), cliente HTTP, funções por recurso
  (`endpoints.ts`), erros tipados (`ApiError`) e a fábrica de chaves de cache (`query-keys.ts`).
  Nada fora daqui chama o Axios diretamente.
- **`src/features/<domínio>`** — queries, mutations e componentes de cada domínio (auth, catalog,
  nft, favorites, cart, checkout, orders, account). Cada feature expõe `queryOptions` reutilizados
  por loaders de rota e componentes.
- **`src/routes`** — rotas por arquivo do TanStack Router. Loaders apenas pré-aquecem o cache
  (`prefetchQuery`); os componentes leem via `useQuery`, então loader e componente nunca divergem.
  Rotas privadas ficam sob o layout `_auth`.
- **`src/realtime`** — conexão Socket.IO e o processador que aplica eventos no cache.
- **`src/components`** — `ui/` (shadcn/ui), `layout/` (cabeçalho, sessão, banners, foco de rota) e
  `common/` (imagem de NFT, valores em ETH, estados de erro…).
- **`src/lib`** — utilitários puros: aritmética de ETH em `BigInt` (wei), formatação pt-BR,
  storage seguro, search params.

## Contratos REST

Base `VITE_API_URL` (padrão `/api`), JSON. Autenticação por `Authorization: Bearer <token>`;
visitantes enviam o carrinho anônimo em `X-Guest-Cart: <id>`.

**Toda resposta é validada** contra o schema Zod do contrato (`request(schema, …)` em
`http.ts`). Uma resposta fora do contrato vira `ApiError('INVALID_RESPONSE')` — a UI nunca
renderiza dados não validados. Valores em ETH trafegam como **string decimal** (até 18 casas, tipo
`EthAmount` com brand) e toda conta é feita em `BigInt` de wei, sem erro de ponto flutuante.

| Recurso   | Endpoints                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| Sessão    | `GET /auth/session` · `POST /auth/login` · `POST /auth/register` · `POST /auth/logout`                                    |
| Perfil    | `GET/PATCH /profile` · `PUT/DELETE /profile/avatar` (multipart) · `POST /profile/password`                                |
| Carteiras | `GET/POST /wallets` · `PUT/DELETE /wallets/:id` · `POST /wallet-sessions` · `DELETE /wallet-sessions/:id`                 |
| Catálogo  | `GET /nfts` (busca, aba, filtros, ordenação, página) · `GET /nfts/highlights` · `GET /nfts/:id` · `GET /nfts/:id/related` |
| Favoritos | `GET /favorites` · `PUT/DELETE /favorites/:nftId` (idempotentes)                                                          |
| Carrinho  | `GET /cart` · `POST /cart/items` · `PATCH/DELETE /cart/items/:id` · `PUT/DELETE /cart/coupon`                             |
| Checkout  | `POST /quotes` · `POST /orders` (`Idempotency-Key`) · `GET /orders?status=` · `GET /orders/:id`                           |

Mutations do carrinho respondem com o **carrinho completo** e as do perfil com o perfil
completo, para que o cliente substitua o cache em vez de recalcular.

### Envelope de erro

```json
{ "error": { "code": "QUOTE_CHANGED", "message": "…", "status": 409, "retryable": false,
             "fieldErrors": { "code": ["Cupom inválido"] }, "details": { … }, "requestId": "…" } }
```

| Código                                                    | HTTP            | Uso                                                                  |
| --------------------------------------------------------- | --------------- | -------------------------------------------------------------------- |
| `VALIDATION_FAILED`                                       | 422             | Campos inválidos (`fieldErrors` por campo).                          |
| `UNAUTHENTICATED` / `SESSION_EXPIRED`                     | 401             | Sem sessão / sessão expirada.                                        |
| `INVALID_CREDENTIALS`                                     | 401             | Login recusado.                                                      |
| `FORBIDDEN` / `NOT_FOUND`                                 | 403 / 404       | —                                                                    |
| `CONFLICT`                                                | 409             | E-mail em uso; pedido pendente (`details.reason = 'pending-order'`). |
| `AVAILABILITY_CONFLICT`                                   | 409             | Edição esgotada ou estoque insuficiente.                             |
| `QUOTE_CHANGED`                                           | 409             | Preço, disponibilidade, cupom ou taxa mudaram desde a cotação.       |
| `IDEMPOTENCY_CONFLICT`                                    | 409             | Mesma `Idempotency-Key` com payload diferente.                       |
| `COUPON_INVALID` / `COUPON_EXPIRED`                       | 422             | Cupom.                                                               |
| `WALLET_REJECTED`                                         | 409             | O usuário recusou a conexão na carteira.                             |
| `PAYMENT_DECLINED`                                        | 402             | Pagamento recusado.                                                  |
| `RATE_LIMITED` / `SERVICE_UNAVAILABLE` / `INTERNAL_ERROR` | 429 / 503 / 500 | Transitórios (`retryable: true`).                                    |

O cliente acrescenta três códigos próprios, sem resposta HTTP utilizável: `NETWORK_ERROR`,
`TIMEOUT` (prazo implementado com `setTimeout`, para que os testes controlem o relógio) e
`INVALID_RESPONSE`.

## Eventos Socket.IO

```ts
{
  id: string                        // único por entrega lógica → deduplicação
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order', id: string }
  version: number                   // versão do recurso após a mudança
  occurredAt: string                // ISO 8601
  userId?: string                   // só em order.updated: dono do pedido
  data: …                           // nft: preço, preço anterior, disponibilidade por edição
}                                   // order: status, motivo, transação
```

- `nft.updated` é difundido para todos; `order.updated` vai apenas para as conexões do dono.
- O handshake envia o token em `auth` (pacote CONNECT); a conexão é recriada quando o token muda.
- As mesmas entidades REST carregam `version`, então cliente e eventos falam da mesma régua.

## Sessão

**Token opaco em `localStorage`, enviado como Bearer.** O token é um identificador aleatório,
revogável no servidor, com validade de 2 h — não carrega dados do usuário nem é um JWT.

- **Por que não cookie `httpOnly`?** Seria a escolha em produção (imune a leitura por XSS), mas
  exige um backend no mesmo site e proteção CSRF. Aqui o backend é um Service Worker, e respostas
  sintéticas não podem definir cookies (`Set-Cookie` é um header proibido para respostas criadas
  por script). O risco do `localStorage` é mitigado por não haver scripts de terceiros, pelo
  escape do React e pelo token curto e revogável; o cliente HTTP concentra o envio em um único
  interceptor, então migrar para cookie é local.
- **Início/fim de sessão** (`features/auth/session.ts`): login e cadastro descartam qualquer
  cache privado e o id do carrinho anônimo antes de gravar o novo token; logout, expiração ou
  revogação removem token, cache privado e cache de sessão. Abas sincronizam pelo evento
  `storage`.
- **Expiração no meio do uso:** qualquer 401 em requisição autenticada dispara
  `onSessionInvalid`. O `SessionManager` encerra a sessão uma única vez (requisições concorrentes
  são ignoradas), avisa o usuário e, se a rota exige login, leva para
  `/entrar?redirect=<rota atual>&motivo=sessao-expirada`. Rascunhos (formulário do checkout,
  tentativa de pedido, sessão de carteira) ficam em `sessionStorage` com chave por usuário e
  **sobrevivem** a esse fluxo; logout explícito os apaga.
- **Guardas:** o layout `_auth` resolve a sessão em `beforeLoad` (do cache ou da API) e redireciona
  visitantes. O destino pós-login passa por `safeRedirect`, que aceita apenas caminhos internos
  (sem open redirect).
- **Isolamento por usuário:** todo dado privado vive sob `['private', userId, …]`, e eventos de
  pedido de outro usuário (inclusive da sessão anterior na mesma aba) são descartados.

## Estado do carrinho

O carrinho **pertence ao servidor**, inclusive para visitantes.

- **Visitante:** o primeiro “Adicionar” cria um carrinho anônimo e o id volta no corpo; o
  cliente o guarda e o envia em `X-Guest-Cart`. Um `GET /cart` sem id devolve um carrinho vazio
  sem criar nada no servidor.
- **Login/cadastro:** o corpo leva `guestCartId`; o servidor mescla as linhas no carrinho da
  conta, respeitando estoque e limite por pedido, e responde um relatório (`cartMerge`) com
  quantidades ajustadas, que a UI mostra.
- **Mutations:** respondem o carrinho completo, gravado direto no cache (`setQueryData`). Todas
  compartilham o `scope` `cart`, então cliques rápidos (+/−, remover, cupom) são enviados em ordem
  e a última resposta na tela é sempre o estado mais novo.
- **Totais:** subtotal, desconto (cupom em basis points), taxa estimada da rede e total são
  calculados pelo servidor. O cliente só formata.
- **Conflitos:** `AVAILABILITY_CONFLICT`/`NOT_FOUND` recarregam o carrinho e o NFT afetado.
- **Tempo real:** um `nft.updated` que toca uma linha do carrinho invalida o carrinho e avisa
  quando o preço mudou ou o estoque ficou abaixo da quantidade escolhida.

## Checkout e pedidos

1. **Carteira:** o colecionador escolhe uma carteira cadastrada (cartões) ou cadastra outra, e
   conecta (`POST /wallet-sessions`; o provedor simulado pode recusar).
2. **Dados do colecionador:** react-hook-form + o mesmo schema Zod do contrato, com regras
   cruzadas (endereço conforme a rede). O formulário é salvo como rascunho a cada alteração.
3. **Revisão:** `POST /quotes` gera uma cotação com validade, preços por linha e taxa da rede.
4. **Pedido:** `POST /orders` com a cotação e uma `Idempotency-Key`.

**Mudanças entre cotação e pedido.** Se preço, disponibilidade, cupom ou taxa mudaram, o servidor
responde `409 QUOTE_CHANGED` com a nova cotação; a UI destaca as diferenças e só continua depois
que o usuário aceita. Edição esgotada (`AVAILABILITY_CONFLICT`) leva de volta ao carrinho.

**Idempotência.** A chave é derivada do payload: o mesmo payload reutiliza a mesma chave
(clique duplo, nova tentativa após timeout, refresh no meio da requisição) e um payload diferente
gera chave nova. A tentativa fica em `sessionStorage`. No servidor, mesma chave + mesmo payload
devolve o mesmo pedido; mesma chave + payload diferente é `IDEMPOTENCY_CONFLICT`. Além disso, um
usuário com pedido pendente recebe `409 CONFLICT` (`pending-order`) com o id, e a UI leva ao
pedido existente em vez de criar outro.

**Resultado incerto.** Mutations nunca são repetidas automaticamente. Em `TIMEOUT`,
`NETWORK_ERROR` ou 5xx, a UI explica que o pedido pode ter sido criado e oferece “Tentar
novamente” — que reenvia com a mesma chave e recupera o pedido, se ele existir.

**Liquidação.** O pedido nasce `pending`; o servidor o liquida (`confirmed` ou `declined`) e
publica `order.updated`. A página do pedido reflete a mudança sem polling e, ao reconectar,
reconsulta via REST. Um pedido recusado mantém os itens no carrinho.

## Estratégia de cache

Configuração em `src/app/query-client.ts` e chaves em `src/api/query-keys.ts`.

| Dado                     | Chave                                             | `staleTime` | Observações                                                                |
| ------------------------ | ------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| Lista do catálogo        | `['nfts','list', query]`                          | 30 s        | Chave = query exata da API; `keepPreviousData` evita piscar entre filtros. |
| Destaques / relacionados | `['nfts','highlights']`, `['nfts','related',id]`  | 60 s        | —                                                                          |
| Detalhe                  | `['nfts','detail',id]`                            | 30 s        | 404 não é repetido.                                                        |
| Sessão                   | `['session', token]`                              | 60 s        | A chave muda com o token.                                                  |
| Carrinho                 | `['cart','guest']` ou `['private',userId,'cart']` | 15 s        | Substituído pelas respostas das mutations.                                 |
| Privados                 | `['private', userId, …]`                          | 30 s        | Favoritos, perfil, carteiras, pedidos; removidos em bloco no logout.       |

- **Retentativas:** apenas falhas transitórias (`retryable`: rede, timeout, 5xx, 429), até 2
  vezes, com backoff exponencial (1 s, 2 s… até 8 s). Respostas 4xx são definitivas.
- **Respostas fora de ordem:** cada combinação de filtros tem sua entrada, e o `AbortSignal` do
  TanStack Query cancela requisições cujos parâmetros saíram da tela — uma resposta antiga nunca
  sobrescreve a mais nova.
- **Estado na URL:** busca, aba, filtros, ordenação e página do catálogo vivem nos search params
  (validados), então refresh, voltar/avançar e links compartilhados reproduzem a tela.
- **Mutations:** sem retentativa automática. Favoritos são otimistas com rollback; carrinho e
  perfil são substituídos pela resposta; o resto invalida as chaves afetadas.
- **Sincronização:** foco da janela, eventos Socket.IO e reconexões atualizam o que está na tela.

## Tempo real

**Garantias do processador** (`realtime/processor.ts`):

- **Duplicados:** descartados pelo `id` (memória dos últimos 500).
- **Fora de ordem / antigos:** cada recurso guarda a maior `version` aplicada, e o patch também
  compara com a `version` vinda do REST — o estado nunca regride.
- **Isolamento:** `order.updated` de outro usuário é ignorado (o usuário é lido no momento da
  entrega, não na criação da conexão).
- **Patch vs. refetch:** campos que o evento traz (preço, disponibilidade, status) são aplicados
  em todas as listas em cache; campos derivados no servidor (totais do carrinho, snapshot do
  pedido) são reconsultados. Listas ordenadas por preço são marcadas como obsoletas.

**Reconciliação.** Ao reconectar, catálogo, carrinho e dados privados são invalidados: o REST é a
fonte da verdade para tudo que pode ter mudado durante a queda. Um banner informa
“reconectando” enquanto isso.

**Ciclo de vida.** Uma conexão por token: login, logout, expiração ou troca de usuário encerram a
conexão anterior (e seus listeners) e abrem outra com o novo `auth`.

**Limitações do transporte simulado** (`@mswjs/socket.io-binding`):

- Intercepta apenas WebSocket, não HTTP long-polling — por isso `transports: ['websocket']`.
- O handler `ws.link` precisa apontar para a origem (o MSW remove o caminho `/socket.io/`).
- O ping do Engine.IO é enviado manualmente pelo servidor simulado a cada 20 s, e o token é lido
  do pacote CONNECT bruto (`40{…}`).
- Para simular queda, o servidor recusa conexões disparando `error` antes de fechar (código 4000);
  um fechamento limpo antes do handshake deixaria o `Manager` do Socket.IO sem reconectar.
- O `engine.io-client` captura o `WebSocket` global ao ser avaliado, então o módulo do socket é
  importado sob demanda, depois que o MSW instalou a interceptação.
- O binding exige MSW 2.15.x (faixa de peer dependency), por isso a versão está fixada.

## Backend simulado (MSW)

- **Banco:** `mocks/db/store.ts` mantém o estado (catálogo, usuários, sessões, carrinhos, pedidos,
  eventos recentes) em `localStorage`, com seed determinístico.
- **Regras de negócio:** `mocks/domain/` (catálogo, comércio) concentra validações, cálculo de
  totais, cotação, idempotência, liquidação e a emissão de eventos. Os handlers REST
  (`mocks/handlers/`) só traduzem HTTP ↔ domínio.
- **Rede:** latência por cenário com PRNG de semente fixa (mesma sequência a cada execução),
  falhas por rota (offline, 500, 503 transitório) e armadilhas de uso único (preço muda ou
  edição esgota no checkout, timeout após criar o pedido).
- **Controle:** `?mock=`, `?mock-reset`, Mock Lab e `window.__kurioMock` usam a mesma API
  (`mocks/control.ts`). Toda ação muda o banco e, quando aplicável, publica pelo servidor Socket.IO
  — a UI só fica sabendo por REST e eventos, como faria com um backend real.
- **Boot sem bloquear a UI:** o app renderiza imediatamente (com skeletons); apenas as
  requisições e o socket aguardam o “portão de rede” (`app/network-gate.ts`), aberto quando o
  Service Worker está pronto.
- **`tldts-lite`:** o cookie store do MSW depende do `tldts` só para obter o domínio registrável,
  mas o pacote embute a lista de sufixos públicos (~260 KB). Um alias no Vite troca por uma
  aproximação de eTLD+1 suficiente para o backend simulado (`mocks/lib/tldts-lite.ts`).

## Performance

Medições, metodologia e histórico em [lighthouse/ANALISE.md](lighthouse/ANALISE.md). O que foi
aplicado:

- **Caminho crítico curto:** chunks agrupados por estabilidade (`react`, `tanstack`, `vendor`,
  `app`) para evitar dezenas de arquivos minúsculos; formulários, menus, socket, Mock Lab e
  páginas carregam sob demanda. O chunk dos mocks recebe `modulepreload` no HTML para baixar em
  paralelo ao app.
- **LCP orientado a dados:** a arte do hero/detalhe vem da API; assim que a resposta chega, um
  `<link rel=preload imagesrcset … fetchpriority=high>` é injetado antes mesmo do render. Na página
  inicial, o código do catálogo (abaixo da dobra no celular) só é baixado depois que essa arte
  aparece, para não disputar banda com ela.
- **Imagens:** as artes originais (1254 px) ficam em `assets-src/nfts/`; `npm run images` gera
  AVIF/WebP em 320/640/960 px da arte e de três recortes da galeria (rosto, acessório,
  figurino). Na página, `sizes` corretos, dimensões intrínsecas e a cor de fundo da arte como
  placeholder (sem layout shift).
- **Renderização:** `content-visibility: auto` em seções longas abaixo da dobra; skeletons com as
  mesmas dimensões do conteúdo final.
- **Fonte:** Roboto Mono variável, auto-hospedada (woff2, apenas latin).

## Acessibilidade

- Link “Pular para o conteúdo”, landmarks e títulos por página. Após cada navegação o foco vai
  para o conteúdo principal e o título da nova página é anunciado — o anúncio espera o título
  final (não o da página anterior nem o provisório “NFT” enquanto os dados carregam). Mudanças
  só de filtros mantêm o foco.
- Formulários com rótulos visíveis, mensagens de erro associadas aos campos (`aria-describedby`),
  foco no primeiro erro e erros do servidor mapeados para os campos.
- Diálogos, menus e selects do Radix (teclado e foco gerenciados); controles com nome acessível
  (`aria-pressed` em toggles, carrossel com `aria-roledescription`).
- Avisos via `sonner` (região viva), estados de carregamento com `aria-busy`, respeito a
  `prefers-reduced-motion`.
- Paleta com contraste AA sobre o fundo escuro; testes com axe nas páginas principais.

## Design tokens

Cores, raio e tipografia foram amostrados dos frames do Figma e vivem como variáveis CSS em
`src/index.css` (`:root`), expostas ao Tailwind via `@theme inline`. O produto tem só tema escuro.

| Token                          | Valor                             | Uso                          |
| ------------------------------ | --------------------------------- | ---------------------------- |
| `--background`                 | `#140d0a`                         | Fundo                        |
| `--surface` / `--surface-2`    | `#241612` / `#2e1e17`             | Cartões, painéis             |
| `--foreground`                 | `#f5f1eb`                         | Texto principal              |
| `--primary` / `--brand`        | `#d28a4c` / `#e89b55`             | Ações, destaques, foco       |
| `--sand` / `--meta` / `--soft` | `#c3a884` / `#a98c5e` / `#d9d5cf` | Texto secundário e metadados |
| `--required` / `--destructive` | `#ef7f5e`                         | Obrigatório, erros           |
| `--success`                    | `#8fcf8a`                         | Confirmações                 |
| `--border`                     | `#3b281d`                         | Bordas e inputs              |
| `--radius`                     | `0.5rem`                          | Base dos raios               |

Utilitários próprios: `page-container` (largura máxima de 1200 px com margens laterais),
`defer-render` (`content-visibility`) e a animação de shimmer dos skeletons.

## Desvios do Figma

- **Rótulos visíveis** em todos os campos (o layout usa só placeholders em alguns formulários),
  por acessibilidade.
- **Carteiras como cartões selecionáveis** no pagamento, no lugar do “Usar outra carteira?”: mostra
  rede e endereço antes da escolha e leva ao cadastro de uma nova.
- **Ponto como separador decimal em ETH** (como no layout e na convenção cripto); datas e o
  restante da formatação seguem pt-BR.
- Páginas citadas na navegação mas fora do escopo (Aprenda, Criadores) exibem “Em breve”.

## Limitações e próximos passos

- **Sessão em cookie `httpOnly`** com proteção CSRF ao integrar um backend real (ver
  [Sessão](#sessão)).
- **SSR ou pré-renderização** da página inicial tornaria a arte do hero descobrível já no HTML e
  removeria a cadeia JS → API → imagem do LCP.
- **Paginação por cursor** no catálogo se o volume crescer, com `useInfiniteQuery`.
- **Baselines visuais por plataforma:** as versionadas são do Windows; um job de CI em Linux
  deve gerar e manter as suas.
