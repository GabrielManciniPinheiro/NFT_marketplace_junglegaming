/**
 * Mock scenarios and network conditions.
 *
 * The active configuration is persisted in localStorage so it survives refreshes, and can be
 * selected with `?mock=<scenario>`, the Mock Lab panel or `window.__kurioMock.setScenario()`.
 */

export type LatencyMode = 'none' | 'fixed' | 'variable' | 'out-of-order'
export type FailureMode = 'none' | 'offline' | 'server-error' | 'flaky'

export interface MockConfig {
  scenario: ScenarioId
  /** Seed for the latency PRNG: same seed, same sequence of delays. */
  seed: number
  latency: { mode: LatencyMode; baseMs: number; jitterMs: number }
  /** `reads` = GET requests only; `all` = every REST call. */
  failure: { mode: FailureMode; scope: 'reads' | 'all'; failuresPerRoute: number }
  emptyCatalog: boolean
  sessionTtlSec: number
  walletApproval: 'approve' | 'reject'
  paymentOutcome: 'confirm' | 'decline'
  /** Delay before a pending order settles. 0 = manual (`settleOrder` / Mock Lab). */
  settlementDelayMs: number
  /** One-shot change applied to the catalog on the next order attempt. */
  checkoutTrap: 'none' | 'price-change' | 'sold-out'
  /** One-shot: the next POST /orders is created but answers after the client deadline. */
  orderTimeout: boolean
  favoritesFailure: boolean
}

export const DEFAULT_CONFIG: MockConfig = {
  scenario: 'default',
  seed: 7,
  latency: { mode: 'variable', baseMs: 120, jitterMs: 330 },
  failure: { mode: 'none', scope: 'reads', failuresPerRoute: 3 },
  emptyCatalog: false,
  sessionTtlSec: 2 * 60 * 60,
  walletApproval: 'approve',
  paymentOutcome: 'confirm',
  settlementDelayMs: 3_000,
  checkoutTrap: 'none',
  orderTimeout: false,
  favoritesFailure: false,
}

export const SCENARIOS = {
  default: {
    label: 'Padrão',
    description: 'Latência variável realista (120–450 ms) e todos os fluxos com sucesso.',
    config: {},
  },
  fast: {
    label: 'Sem latência',
    description: 'Respostas imediatas. Usado pelos testes E2E.',
    config: { latency: { mode: 'none', baseMs: 0, jitterMs: 0 } },
  },
  slow: {
    label: 'Rede lenta',
    description: '2,5 s por requisição: evidencia skeletons e estados de carregamento.',
    config: { latency: { mode: 'fixed', baseMs: 2_500, jitterMs: 0 } },
  },
  'out-of-order': {
    label: 'Respostas fora de ordem',
    description:
      'Requisições ímpares demoram 1,6 s e pares 0,2 s: respostas antigas chegam depois.',
    config: { latency: { mode: 'out-of-order', baseMs: 200, jitterMs: 1_400 } },
  },
  empty: {
    label: 'Catálogo vazio',
    description: 'A listagem de NFTs não retorna resultados.',
    config: { emptyCatalog: true },
  },
  offline: {
    label: 'Sem conexão',
    description: 'Toda chamada REST falha na camada de rede (TypeError: Failed to fetch).',
    config: { failure: { mode: 'offline', scope: 'all', failuresPerRoute: 0 } },
  },
  'server-error': {
    label: 'Erro 500 nas leituras',
    description: 'Toda leitura responde 500 até o cenário ser trocado.',
    config: { failure: { mode: 'server-error', scope: 'reads', failuresPerRoute: 0 } },
  },
  flaky: {
    label: 'Falha transitória (503)',
    description: 'As 3 primeiras tentativas de cada leitura respondem 503; a 4ª funciona.',
    config: { failure: { mode: 'flaky', scope: 'reads', failuresPerRoute: 3 } },
  },
  'short-session': {
    label: 'Sessão curta (60 s)',
    description: 'Sessões criadas a partir de agora expiram em 60 segundos.',
    config: { sessionTtlSec: 60 },
  },
  'wallet-rejected': {
    label: 'Carteira recusa conexão',
    description: 'O provedor simulado recusa a solicitação de conexão.',
    config: { walletApproval: 'reject' },
  },
  'payment-declined': {
    label: 'Pagamento recusado',
    description: 'Pedidos pendentes são recusados na liquidação.',
    config: { paymentOutcome: 'decline' },
  },
  'checkout-price-change': {
    label: 'Preço muda no checkout',
    description: 'Na próxima confirmação o preço do 1º item sobe 10% (evento nft.updated).',
    config: { checkoutTrap: 'price-change' },
  },
  'checkout-sold-out': {
    label: 'Edição esgota no checkout',
    description: 'Na próxima confirmação a edição do 1º item esgota (evento nft.updated).',
    config: { checkoutTrap: 'sold-out' },
  },
  'order-timeout': {
    label: 'Timeout após criar pedido',
    description:
      'O pedido é criado mas a resposta passa do prazo do cliente; o reenvio recupera o mesmo pedido.',
    config: { orderTimeout: true },
  },
  'favorites-failure': {
    label: 'Falha ao favoritar',
    description: 'Inclusão e remoção de favoritos respondem 500 (rollback otimista).',
    config: { favoritesFailure: true },
  },
} satisfies Record<string, { label: string; description: string; config: Partial<MockConfig> }>

export type ScenarioId = keyof typeof SCENARIOS

export function isScenarioId(value: string): value is ScenarioId {
  return Object.hasOwn(SCENARIOS, value)
}

const STORAGE_KEY = 'kurio.mock.config'

function read(): MockConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<MockConfig>) }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_CONFIG }
}

let current = read()
const listeners = new Set<(config: MockConfig) => void>()

function write(next: MockConfig) {
  current = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* in-memory only */
  }
  listeners.forEach((listener) => listener(next))
}

export const mockConfig = {
  get: () => current,

  set(patch: Partial<MockConfig>) {
    write({ ...current, ...patch })
  },

  applyScenario(id: ScenarioId) {
    write({ ...DEFAULT_CONFIG, ...(SCENARIOS[id].config as Partial<MockConfig>), scenario: id })
  },

  reset() {
    write({ ...DEFAULT_CONFIG })
  },

  subscribe(listener: (config: MockConfig) => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /** Re-reads the persisted config (another tab may have changed it). */
  reload() {
    current = read()
  },
}
