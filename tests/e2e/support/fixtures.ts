import { test as base, expect, type Page } from '@playwright/test'
import type { EditionId } from '../../../src/api/contracts'
import {
  DEFAULT_CONFIG,
  SCENARIOS,
  type MockConfig,
  type ScenarioId,
} from '../../../src/mocks/config'
import type {} from '../../../src/mocks/control'

/** Demo accounts seeded by the mock layer (see README › Credenciais). */
export const USERS = {
  nova: { email: 'nova@kurio.test', password: 'Kurio@2026', name: 'Nova Ribeiro' },
  bruno: { email: 'bruno@kurio.test', password: 'Kurio@2026', name: 'Bruno Tavares' },
} as const

/** Fixed instant for screenshots and countdowns (`setFixedTime` keeps timers running). */
export const FIXED_NOW = new Date('2026-10-29T15:00:00.000Z')

export function scenarioConfig(
  scenario: ScenarioId,
  overrides: Partial<MockConfig> = {},
): MockConfig {
  return {
    ...DEFAULT_CONFIG,
    ...(SCENARIOS[scenario].config as Partial<MockConfig>),
    ...overrides,
    scenario,
  }
}

/**
 * Drives the simulated backend from the test. Every action runs inside the page against
 * `window.__kurioMock`, so data changes reach the app only through REST and Socket.IO.
 */
export class MockApi {
  constructor(private readonly page: Page) {}

  private presets = 0

  /**
   * Mock configuration applied before the app boots. The latest call wins (the fixture
   * presets "fast" first); reloads keep whatever the test changed afterwards.
   */
  async preset(scenario: ScenarioId = 'fast', overrides: Partial<MockConfig> = {}) {
    this.presets += 1
    await this.page.addInitScript(
      ({ order, config }) => {
        if (Number(sessionStorage.getItem('e2e.preset') ?? 0) >= order) return
        sessionStorage.setItem('e2e.preset', String(order))
        localStorage.setItem('kurio.mock.lab', 'hidden')
        localStorage.setItem('kurio.mock.config', JSON.stringify(config))
      },
      { order: this.presets, config: scenarioConfig(scenario, overrides) },
    )
  }

  async ready() {
    await this.page.waitForFunction(() => Boolean(window.__kurioMock))
  }

  async setScenario(scenario: ScenarioId) {
    await this.ready()
    await this.page.evaluate((id) => window.__kurioMock!.setScenario(id), scenario)
  }

  async setConfig(patch: Partial<MockConfig>) {
    await this.ready()
    await this.page.evaluate((value) => window.__kurioMock!.setConfig(value), patch)
  }

  async changePrice(nftId: string, percent: number, edition?: EditionId) {
    await this.ready()
    return this.page.evaluate(
      (args) => window.__kurioMock!.changePrice(args.nftId, args.percent, args.edition).version,
      {
        nftId,
        percent,
        edition,
      },
    )
  }

  async sellOut(nftId: string, edition?: EditionId) {
    await this.ready()
    await this.page.evaluate((args) => window.__kurioMock!.sellOut(args.nftId, args.edition), {
      nftId,
      edition,
    })
  }

  async replayLastEvent() {
    await this.page.evaluate(() => window.__kurioMock!.replayLastEvent())
  }

  async emitStaleNftEvent(nftId: string) {
    await this.page.evaluate((id) => window.__kurioMock!.emitStaleNftEvent(id), nftId)
  }

  async dropRealtime(outageMs: number) {
    await this.page.evaluate((ms) => window.__kurioMock!.dropRealtime(ms), outageMs)
  }

  async realtimeConnections() {
    await this.ready()
    return this.page.evaluate(() => window.__kurioMock!.realtimeStatus())
  }

  async expireSessions() {
    await this.page.evaluate(() => window.__kurioMock!.expireSessions())
  }

  async settlePending(outcome: 'confirm' | 'decline') {
    await this.page.evaluate((value) => window.__kurioMock!.settlePendingOrders(value), outcome)
  }

  async orders() {
    await this.ready()
    return this.page.evaluate(() =>
      Object.values(window.__kurioMock!.snapshot().orders).map((record) => ({
        number: record.order.number,
        status: record.order.status,
        total: record.order.total,
      })),
    )
  }
}

export const test = base.extend<{ mock: MockApi }>({
  mock: [
    async ({ page }, use) => {
      const mock = new MockApi(page)
      await mock.preset('fast')
      await use(mock)
    },
    { auto: true },
  ],
})

export { expect }

export async function login(page: Page, user: keyof typeof USERS = 'nova', redirect?: string) {
  await page.goto(redirect ? `/entrar?redirect=${encodeURIComponent(redirect)}` : '/entrar')
  await page.getByLabel('E-mail').fill(USERS[user].email)
  await page.getByLabel('Senha', { exact: true }).fill(USERS[user].password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'))
}

/** Lazy images below the fold would render as placeholders in full-page screenshots. */
export async function loadAllImages(page: Page) {
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('img')]
    images.forEach((image) => (image.loading = 'eager'))
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true })
              image.addEventListener('error', resolve, { once: true })
            }),
      ),
    )
    await document.fonts.ready
  })
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** Cart badge count from its accessible name ("Carrinho, 17 itens"). */
export async function cartCount(page: Page) {
  const label = await page.getByRole('link', { name: /^Carrinho,/ }).getAttribute('aria-label')
  return Number(label?.match(/(\d+)/)?.[1] ?? 0)
}
