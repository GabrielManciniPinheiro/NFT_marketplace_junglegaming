# Análise de performance (Lighthouse)

Relatórios versionados nesta pasta: [`reports/summary.md`](reports/summary.md) (tabela e
ambiente), `reports/<página>-<perfil>.report.html|json` (execução mediana de cada combinação).

## Metodologia

- **Artefato:** build de produção (`vite build`) servido por `vite preview` na porta 4174 — o
  mesmo que vai para o deploy, com a camada MSW ativa.
- **Cenário:** `default` (latência simulada de 120–450 ms por requisição).
- **Execução:** Lighthouse 13.6 pela API Node (`lighthouse/run.ts`), Chrome headless com perfil
  novo a cada execução (cache frio, Service Worker recém-instalado).
- **Perfis:** mobile padrão do Lighthouse (Moto G Power emulado, throttling simulado: RTT 150 ms,
  1,6 Mbps, CPU 4×) e o preset desktop.
- **Amostragem:** 3 execuções por página e perfil; a tabela usa a mediana de cada categoria e
  métrica, e o relatório versionado é o da execução com performance mediana.
- **Máquina:** Ryzen 5 3600, 16 GB, Windows 11, Node 24 (detalhes em `reports/summary.md`).

## Resultado

| Página                           | Perfil  | Perf. | A11y |  BP | SEO |    LCP |   CLS |    TBT |
| -------------------------------- | ------- | ----: | ---: | --: | --: | -----: | ----: | -----: |
| Início (`/`)                     | mobile  |    91 |  100 | 100 | 100 | 3,45 s | 0,003 | 102 ms |
| Início (`/`)                     | desktop |   100 |  100 | 100 | 100 | 0,74 s | 0,001 |   0 ms |
| Detalhe (`/nft/emerald-ape-042`) | mobile  |    90 |  100 | 100 | 100 | 3,48 s | 0,000 | 103 ms |
| Detalhe (`/nft/emerald-ape-042`) | desktop |   100 |  100 | 100 | 100 | 0,74 s | 0,000 |   0 ms |

Todas as metas (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90) foram
atingidas. As três execuções de cada combinação variaram no máximo 1 ponto.

## O que pesa no mobile

O elemento de LCP das duas páginas é a arte do NFT, e a URL dela vem da API. A cadeia até ele é,
portanto: HTML → JavaScript do app → Service Worker do MSW pronto → `GET /api/…` → imagem.

|                                        |   Início |  Detalhe |
| -------------------------------------- | -------: | -------: |
| LCP observado (sem throttling)         | ≈ 0,78 s | ≈ 0,82 s |
| — atraso até a imagem começar a baixar |   661 ms |   673 ms |
| — download da imagem                   |    40 ms |    43 ms |
| — atraso de renderização               |    73 ms |    99 ms |
| LCP simulado (mobile)                  |   3,45 s |   3,48 s |
| Nota da métrica LCP                    |     0,65 |     0,64 |

O LCP simulado (Lantern) reaplica essa cadeia com RTT de 150 ms, banda de 1,6 Mbps e CPU 4× mais
lenta. Nessa simulação, **o que custa é quantos bytes disputam a banda antes da imagem**, não a
latência do backend: medindo o mesmo build com `?mock=fast` (latência zero), o resultado foi
idêntico (LCP 3,6 s, nota 88 no Início antes da última otimização). Por isso as otimizações
abaixo atacam tamanho e ordem do que é baixado.

TBT, CLS, FCP e Speed Index já estão com nota ≥ 0,97; o LCP é a única métrica abaixo de 0,9 e é o
que deixa o mobile perto do limite de 90.

## Otimizações e efeito medido

Valores de performance do Início no mobile. As etapas intermediárias são execuções únicas
(`npm run lighthouse:quick`); a primeira e a última linhas são medianas de 3 execuções.

| Mudança                                                                                                                                                                        | Performance |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------: |
| Ponto de partida                                                                                                                                                               |          79 |
| `tldts` → `tldts-lite` (o cookie store do MSW embutia ~260 KB de sufixos públicos)                                                                                             |          80 |
| `modulepreload` do chunk de mocks, portão de rede (a UI renderiza antes do MSW), menu da conta e carrinho anônimo sob demanda, preload da arte do LCP assim que a API responde |          85 |
| Dependências de boot em um chunk `vendor`                                                                                                                                      |          87 |
| Grupos `react`/`tanstack`/`vendor`/`app` só com o que o boot usa                                                                                                               |       89–90 |
| Medição oficial (3 execuções)                                                                                                                                                  |          88 |
| Código do catálogo (abaixo da dobra no celular) carregado só depois da arte do hero                                                                                            |          91 |
| Artes originais em alta resolução (arte do LCP de 20 para 35 KB), medição oficial                                                                                              |      **91** |

No Detalhe, a principal correção foi de estabilidade visual: as abas de informação agora têm
skeleton com a altura final, o que levou o CLS do desktop de 0,097 para 0,000.

A última otimização é a que mais diz sobre o gargalo: sem reduzir o tamanho total do app, apenas
tirando da janela anterior ao LCP os ~38 KB (gzip) de código do catálogo e as imagens dos cards,
a nota passou de 88 para 91 (LCP simulado de 3,59 s para 3,44 s).

## Limites conhecidos

- **Margem pequena no mobile.** 90–91 está perto do limite, e o throttling de CPU do Lantern
  multiplica o tempo das tarefas medidas na máquina que roda a auditoria: em máquinas mais lentas
  ou carregadas, espere 1–3 pontos a menos.
- **Custo exclusivo da demo.** O MSW (≈ 64 KB gzip de JavaScript, registro do Service Worker e o
  `mockServiceWorker.js`) está no caminho crítico, porque nenhuma requisição sai antes dele. Com
  um backend real (`VITE_ENABLE_MOCKS=false`) esse custo desaparece.
- **LCP dependente de dados.** Enquanto a arte vier da API, a imagem não pode ser descoberta no
  HTML. SSR ou pré-renderização do hero removeriam a cadeia JS → API → imagem.
- **Servidor de auditoria.** `vite preview` serve HTTP/1.1 com gzip; a Vercel serve HTTP/2 com
  Brotli, o que tende a melhorar os números no deploy.

## Como reproduzir

```bash
npm run lighthouse        # build + 3 execuções por página/perfil; atualiza lighthouse/reports
npm run lighthouse:quick  # 1 execução; resultados só em lighthouse/.tmp
```

Feche outros servidores na porta 4174 antes de rodar. O runner sobe e encerra o próprio
`vite preview`; uma versão anterior deixava o processo órfão no Windows, e a rodada seguinte
podia medir um build antigo — já corrigido.
