# Kurio — Marketplace de NFTs

Marketplace de NFTs em React + TypeScript construído para o desafio de frontend: catálogo com
filtros na URL, detalhe com edições, favoritos, carrinho com cupom e cotação, checkout com pedido
idempotente, confirmação em tempo real, autenticação e área do colecionador — tudo sobre uma API
REST e um servidor Socket.IO simulados por MSW, com cenários de falha reproduzíveis.

- **Demo:** _adicionar a URL da Vercel após o deploy_
- **Arquitetura e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/reports/summary.md](lighthouse/reports/summary.md) e
  [lighthouse/ANALISE.md](lighthouse/ANALISE.md)

## Sumário

- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Credenciais](#credenciais)
- [Cenários simulados](#cenários-simulados)
- [Reproduzindo falhas](#reproduzindo-falhas)
- [Scripts](#scripts)
- [Testes](#testes)
- [Performance](#performance)
- [Deploy](#deploy)
- [Estrutura](#estrutura)

## Stack

| Área        | Escolha                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- |
| Base        | React 19, TypeScript 6 (strict, `noUncheckedIndexedAccess`), Vite 8 (Rolldown)                |
| Rotas       | TanStack Router (rotas por arquivo, code splitting automático, search params tipados)         |
| Dados       | TanStack Query 5 + Axios; contratos validados com Zod 4                                       |
| Tempo real  | Socket.IO client (`nft.updated`, `order.updated`)                                             |
| UI          | Tailwind CSS 4, shadcn/ui (Radix), lucide-react, sonner                                       |
| Formulários | react-hook-form + Zod (mesmos schemas dos contratos)                                          |
| Mocks       | MSW 2.15 (REST) + `@mswjs/socket.io-binding` (Socket.IO sobre WebSocket)                      |
| Testes      | Vitest (aritmética de ETH), Playwright (E2E desktop + mobile, a11y com axe, regressão visual) |
| Qualidade   | ESLint 9 (jsx-a11y, react-hooks, regras do TanStack), Prettier, Lighthouse 13                 |

## Como rodar

Requisitos: **Node.js ≥ 22.18** (o projeto usa a versão 24, ver `.nvmrc`) e npm.

```bash
npm ci
npm run dev          # http://localhost:5173
```

A API e o tempo real rodam no navegador (MSW + Service Worker), então não há backend para
subir. O build de produção também inclui a camada simulada:

```bash
npm run build
npm run preview      # http://localhost:4173
```

## Variáveis de ambiente

Os valores padrão estão em `.env` (versionado, sem segredos) e `.env.example`. Para sobrescrever
localmente, crie `.env.local`.

| Variável            | Padrão                      | Descrição                                                                                         |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `true`                      | Liga a API REST e o servidor Socket.IO simulados (MSW). Com `false`, o app fala com uma API real. |
| `VITE_API_URL`      | `/api`                      | URL base da API REST.                                                                             |
| `VITE_SOCKET_URL`   | `wss://realtime.kurio.mock` | Endereço do servidor Socket.IO (com mocks, é interceptado pelo MSW).                              |

## Credenciais

| Conta                                    | E-mail             | Senha        |
| ---------------------------------------- | ------------------ | ------------ |
| Nova Ribeiro (com carteiras e favoritos) | `nova@kurio.test`  | `Kurio@2026` |
| Bruno Tavares                            | `bruno@kurio.test` | `Kurio@2026` |

Também é possível criar uma conta em **Cadastro** (os dados ficam no `localStorage` do navegador).

| Cupom          | Efeito                                 |
| -------------- | -------------------------------------- |
| `KURIO10`      | 10% de desconto                        |
| `LANCAMENTO5`  | 5% de desconto                         |
| `EXPIRADO20`   | Cupom expirado (erro `COUPON_EXPIRED`) |
| qualquer outro | Cupom inválido (erro `COUPON_INVALID`) |

Códigos de indicação aceitos nos formulários de carteira/colecionador: `KURIO2026`, `NOVA01`,
`BRUNO01`, `APE042`.

## Cenários simulados

O backend simulado guarda seu banco no `localStorage` (sobrevive a refresh) e tem cenários de
rede e de negócio. Há três formas de controlá-lo:

1. **URL:** `?mock=<cenário>` aplica um cenário e o mantém entre recarregamentos;
   `?mock-reset` restaura os dados iniciais, o cenário padrão e encerra a sessão.
2. **Mock Lab:** botão flutuante no canto inferior esquerdo com seletor de cenário, contas de
   demonstração e ações (publicar mudança de preço, esgotar edição, duplicar evento, derrubar o
   tempo real, expirar sessões, liquidar pedidos…). Para escondê-lo:
   `localStorage.setItem('kurio.mock.lab', 'hidden')`.
3. **Console:** `window.__kurioMock` expõe a mesma API (`setScenario`, `setConfig`,
   `changePrice`, `sellOut`, `restock`, `replayLastEvent`, `emitStaleNftEvent`, `dropRealtime`,
   `expireSessions`, `expireCoupon`, `settlePendingOrders`, `reset`, `snapshot`…).

| Cenário (`?mock=`)      | O que acontece                                                                    |
| ----------------------- | --------------------------------------------------------------------------------- |
| `default`               | Latência variável realista (120–450 ms); todos os fluxos com sucesso.             |
| `fast`                  | Sem latência (usado pelos testes E2E).                                            |
| `slow`                  | 2,5 s por requisição: evidencia skeletons e estados de carregamento.              |
| `out-of-order`          | Requisições ímpares demoram 1,6 s e pares 0,2 s: respostas antigas chegam depois. |
| `empty`                 | Catálogo sem resultados.                                                          |
| `offline`               | Toda chamada REST falha na rede.                                                  |
| `server-error`          | Toda leitura responde 500.                                                        |
| `flaky`                 | As 3 primeiras tentativas de cada leitura respondem 503; a 4ª funciona.           |
| `short-session`         | Sessões criadas a partir de agora expiram em 60 s.                                |
| `wallet-rejected`       | O provedor da carteira recusa a conexão.                                          |
| `payment-declined`      | Pedidos pendentes são recusados na liquidação.                                    |
| `checkout-price-change` | Na próxima confirmação o preço do 1º item sobe 10% (com evento `nft.updated`).    |
| `checkout-sold-out`     | Na próxima confirmação a edição do 1º item esgota (com evento `nft.updated`).     |
| `order-timeout`         | O pedido é criado, mas a resposta passa do prazo do cliente (8 s).                |
| `favorites-failure`     | Favoritar/desfavoritar responde 500.                                              |

## Reproduzindo falhas

Cada requisito de resiliência tem um caminho direto (todos também cobertos pelos testes E2E):

| Situação                      | Como reproduzir                                                                   | Comportamento esperado                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Carregamento lento            | `?mock=slow`                                                                      | Skeletons com shimmer em catálogo, detalhe, carrinho e perfil; sem layout shift.                                          |
| Respostas fora de ordem       | `?mock=out-of-order`, alterne filtros rapidamente                                 | A lista final corresponde sempre aos últimos filtros (requisições antigas são canceladas e ignoradas).                    |
| Sem conexão / 5xx             | `?mock=offline` ou `?mock=server-error`                                           | Estados de erro com “Tentar novamente”; nada quebra a navegação.                                                          |
| Falha transitória             | `?mock=flaky`                                                                     | Retentativas automáticas com backoff resolvem sem intervenção.                                                            |
| 4xx de validação/conflito     | Login com senha errada; cadastro com e-mail existente; cupom inválido             | Mensagem do servidor no formulário, por campo quando há `fieldErrors`, com foco no primeiro erro.                         |
| 404                           | `/nft/nao-existe`                                                                 | Página “NFT não encontrado” sem retentativas.                                                                             |
| Sessão expirada               | `?mock=short-session` e aguarde 60 s, ou Mock Lab › Sessão › Expirar sessão agora | Dados privados descartados, aviso e volta ao login com retorno para a mesma tela; rascunho do checkout preservado.        |
| Estoque insuficiente          | Com o item no carrinho, Mock Lab › Esgotar edição 1/50                            | Aviso imediato via `nft.updated`; ao alterar a quantidade ou finalizar, `AVAILABILITY_CONFLICT` recarrega carrinho e NFT. |
| Preço muda no checkout        | `?mock=checkout-price-change` e confirme o pedido                                 | Cotação nova com diferenças destacadas; o pedido só segue após aceitar.                                                   |
| Edição esgota no checkout     | `?mock=checkout-sold-out` e confirme o pedido                                     | Bloqueio com caminho de volta ao carrinho.                                                                                |
| Timeout com recuperação       | `?mock=order-timeout` e confirme o pedido                                         | Após 8 s, “Tentar novamente” reenvia com a mesma `Idempotency-Key` e recupera o mesmo pedido (sem duplicar).              |
| Pagamento confirmado/recusado | Padrão confirma em 3 s; `?mock=payment-declined` recusa                           | Página do pedido passa de pendente para confirmado/recusado via `order.updated`.                                          |
| Carteira recusa               | `?mock=wallet-rejected`                                                           | Erro explicado no checkout; nenhum pedido é criado.                                                                       |
| Falha ao favoritar            | `?mock=favorites-failure`                                                         | O coração volta ao estado anterior (rollback otimista) com aviso.                                                         |
| Eventos duplicados/antigos    | Mock Lab › Duplicar último evento / Enviar evento antigo                          | Nada muda: eventos são deduplicados por `id` e descartados por `version`.                                                 |
| Queda do tempo real           | Mock Lab › Derrubar conexão (8 s)                                                 | Banner de reconexão; ao voltar, os dados são reconciliados via REST.                                                      |

## Scripts

| Comando                    | Descrição                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run dev`              | Servidor de desenvolvimento (porta 5173).                                                       |
| `npm run build`            | Typecheck + build de produção em `dist/`.                                                       |
| `npm run preview`          | Serve `dist/` (porta 4173).                                                                     |
| `npm run typecheck`        | `tsc -b` em app, configs e testes.                                                              |
| `npm run lint`             | ESLint em todo o projeto.                                                                       |
| `npm run format`           | Prettier.                                                                                       |
| `npm run test:unit`        | Vitest.                                                                                         |
| `npm run test:e2e`         | Playwright (gera o build e sobe o preview automaticamente).                                     |
| `npm run test:e2e:ui`      | Playwright em modo interativo.                                                                  |
| `npm run test:e2e:update`  | Atualiza as baselines de regressão visual.                                                      |
| `npm run test:e2e:report`  | Abre o relatório HTML do último run.                                                            |
| `npm run lighthouse`       | Build + auditoria completa (3 execuções por página e perfil) e atualiza `lighthouse/reports`.   |
| `npm run lighthouse:quick` | 1 execução por página e perfil, só em `lighthouse/.tmp` (não altera os relatórios versionados). |
| `npm run images`           | Regenera as artes responsivas (AVIF/WebP) a partir de `assets-src/nfts`.                        |

## Testes

```bash
npm run test:unit
npx playwright install chromium   # primeira vez
npm run test:e2e
npm run test:e2e:report
```

- **E2E (Playwright):** 71 execuções passando (mais 1 pulada de propósito: o drawer de filtros,
  que só existe no mobile, no projeto desktop) contra o build de produção com a camada MSW ativa. Os fluxos
  principais (`@main`) rodam em desktop (1440×900) e mobile (Pixel 7, 390×844); os casos de
  borda, em desktop. Cobrem catálogo/URL, detalhe, favoritos, carrinho, autenticação, checkout
  (idempotência, timeout, cotação alterada, pedido pendente), conta, tempo real (duplicados,
  versões antigas, queda e reconexão, isolamento entre usuários) e acessibilidade (axe).
- **Regressão visual:** Início, Detalhe, Carrinho e Pagamento em desktop e mobile. As baselines
  ficam em `tests/e2e/__screenshots__/<plataforma>/` — as versionadas foram geradas no Windows;
  em outro sistema operacional, gere as suas com `npm run test:e2e:update` antes de comparar.
- **Diagnóstico:** relatório HTML em `playwright-report/`; trace, vídeo e screenshot são mantidos
  para testes que falham (`test-results/`), abertos pelo próprio relatório.

## Performance

`npm run lighthouse` audita o build de produção (servido por `vite preview`, com o cenário
`default`) nas páginas Início e Detalhe, em mobile e desktop, 3 vezes cada, e versiona a execução
mediana. Resultado atual (medianas):

| Página  | Perfil  | Performance | Accessibility | Best Practices | SEO |    LCP |   CLS |    TBT |
| ------- | ------- | ----------: | ------------: | -------------: | --: | -----: | ----: | -----: |
| Início  | mobile  |          91 |           100 |            100 | 100 | 3,44 s | 0,003 |  98 ms |
| Início  | desktop |         100 |           100 |            100 | 100 | 0,73 s | 0,001 |   0 ms |
| Detalhe | mobile  |          90 |           100 |            100 | 100 | 3,49 s | 0,000 | 110 ms |
| Detalhe | desktop |         100 |           100 |            100 | 100 | 0,75 s | 0,000 |   0 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. A metodologia, o
histórico das otimizações e os limites conhecidos estão em
[lighthouse/ANALISE.md](lighthouse/ANALISE.md).

## Deploy

O app é estático (SPA) e já inclui a camada simulada, então qualquer hospedagem estática serve.
Na Vercel: importe o repositório (framework **Vite**, build `npm run build`, saída `dist`); o
`vercel.json` reescreve as rotas da SPA para `index.html` sem afetar `assets/` nem o
`mockServiceWorker.js`.

## Estrutura

```
src/
  api/          contratos (Zod), cliente HTTP, endpoints, erros e chaves de cache
  app/          QueryClient, router e o portão de rede do boot
  components/   ui (shadcn), layout (cabeçalho, sessão, banners) e componentes comuns
  features/     auth, catalog, nft, favorites, cart, checkout, orders, account
  realtime/     conexão Socket.IO e aplicação dos eventos no cache
  routes/       rotas por arquivo (TanStack Router)
  mocks/        backend simulado: banco, regras de negócio, handlers REST, servidor Socket.IO e Mock Lab
  lib/          aritmética de ETH, formatação, storage, search params
tests/e2e/      Playwright (fixtures, specs, baselines visuais)
lighthouse/     plano de auditoria, runner e relatórios versionados
scripts/        pipeline de imagens
```
