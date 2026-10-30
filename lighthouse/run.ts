/**
 * Lighthouse audit runner.
 *
 * - serves the optimized build (`dist/`) with `vite preview`;
 * - audits every page × profile N times, each run in a fresh Chrome profile (cold cache,
 *   fresh service worker, default mock scenario);
 * - writes every report to lighthouse/.tmp and versions the median run (HTML + JSON) plus
 *   a summary (scores, LCP/CLS/TBT, versions, environment) in lighthouse/reports.
 *
 * Usage: npm run lighthouse         (builds first; updates lighthouse/reports)
 *        npm run lighthouse:quick   (1 run each, lighthouse/.tmp only)
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

interface AuditPlan {
  port: number
  runs: number
  pages: { id: string; path: string }[]
  profiles: ('mobile' | 'desktop')[]
  categories: string[]
  targets: Record<string, number>
}

interface RunResult {
  page: string
  profile: string
  run: number
  scores: Record<string, number>
  metrics: { lcp: number; cls: number; tbt: number; fcp: number; si: number }
  html: string
  json: string
}

const ROOT = path.resolve(import.meta.dirname, '..')
const plan = JSON.parse(
  await readFile(path.join(import.meta.dirname, 'audit.config.json'), 'utf8'),
) as AuditPlan
// `--quick`: one run per page/profile for local iterations, written to .tmp only — the
// versioned reports always come from the full plan.
const quick = process.argv.includes('--quick')
if (quick) plan.runs = 1
const TMP = path.join(import.meta.dirname, '.tmp')
const OUT = path.join(import.meta.dirname, 'reports')
const BASE_URL = `http://localhost:${plan.port}`

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

async function waitForServer(url: string, timeoutMs = 30_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Servidor não respondeu em ${url}`)
}

function startPreview(): ChildProcess {
  return spawn(`npx vite preview --port ${plan.port} --strictPort`, {
    cwd: ROOT,
    shell: true,
    stdio: 'ignore',
  })
}

async function audit(pagePath: string, profile: 'mobile' | 'desktop') {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'],
  })
  try {
    const result = await lighthouse(
      `${BASE_URL}${pagePath}`,
      {
        port: chrome.port,
        output: ['html', 'json'],
        logLevel: 'error',
        onlyCategories: plan.categories,
      },
      profile === 'desktop' ? desktopConfig : undefined,
    )
    if (!result) throw new Error('Lighthouse não retornou resultado')
    const { lhr, report } = result
    const [html, json] = report as string[]
    const numeric = (id: string) => Number(lhr.audits[id]?.numericValue ?? NaN)
    return {
      scores: Object.fromEntries(
        plan.categories.map((category) => [
          category,
          Math.round((lhr.categories[category]?.score ?? 0) * 100),
        ]),
      ),
      metrics: {
        lcp: numeric('largest-contentful-paint'),
        cls: numeric('cumulative-layout-shift'),
        tbt: numeric('total-blocking-time'),
        fcp: numeric('first-contentful-paint'),
        si: numeric('speed-index'),
      },
      html: html!,
      json: json!,
      versions: { lighthouse: lhr.lighthouseVersion, userAgent: lhr.environment.hostUserAgent },
    }
  } finally {
    await chrome.kill()
  }
}

await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await mkdir(OUT, { recursive: true })

const preview = startPreview()
const results: RunResult[] = []
let versions: { lighthouse: string; userAgent: string } | undefined

try {
  await waitForServer(BASE_URL)
  for (const page of plan.pages) {
    for (const profile of plan.profiles) {
      for (let run = 1; run <= plan.runs; run++) {
        const outcome = await audit(page.path, profile)
        versions ??= outcome.versions
        const name = `${page.id}-${profile}-${run}`
        await writeFile(path.join(TMP, `${name}.report.html`), outcome.html)
        await writeFile(path.join(TMP, `${name}.report.json`), outcome.json)
        results.push({
          page: page.id,
          profile,
          run,
          scores: outcome.scores,
          metrics: outcome.metrics,
          html: outcome.html,
          json: outcome.json,
        })
        console.log(
          `${name.padEnd(20)} ${plan.categories.map((c) => `${c}=${outcome.scores[c]}`).join(' ')}  LCP=${Math.round(outcome.metrics.lcp)}ms CLS=${outcome.metrics.cls.toFixed(3)} TBT=${Math.round(outcome.metrics.tbt)}ms`,
        )
      }
    }
  }
} finally {
  // On Windows the preview runs under a cmd shell: kill the whole tree before the shell exits,
  // otherwise vite is orphaned and keeps the port (and the old build) alive.
  if (process.platform === 'win32' && preview.pid)
    spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' })
  else preview.kill()
}

if (quick) {
  console.log(`
Modo rápido: relatórios em ${path.relative(ROOT, TMP)} (versionados intactos).`)
  process.exit(0)
}

/* ─── Medians and versioned reports ───────────────────────────────────────── */

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const summary = []
for (const page of plan.pages) {
  for (const profile of plan.profiles) {
    const runs = results.filter((result) => result.page === page.id && result.profile === profile)
    const medians = Object.fromEntries(
      plan.categories.map((c) => [c, median(runs.map((r) => r.scores[c]!))]),
    )
    const metricMedians = {
      lcp: median(runs.map((r) => r.metrics.lcp)),
      cls: median(runs.map((r) => r.metrics.cls)),
      tbt: median(runs.map((r) => r.metrics.tbt)),
      fcp: median(runs.map((r) => r.metrics.fcp)),
      si: median(runs.map((r) => r.metrics.si)),
    }
    // The representative report is the run whose performance score is the median.
    const representative = [...runs].sort((a, b) => a.scores.performance! - b.scores.performance!)[
      Math.floor(runs.length / 2)
    ]!
    const base = `${page.id}-${profile}`
    await writeFile(path.join(OUT, `${base}.report.html`), representative.html)
    await writeFile(path.join(OUT, `${base}.report.json`), representative.json)
    summary.push({
      page: page.id,
      path: page.path,
      profile,
      medians,
      metrics: metricMedians,
      runs: runs.map(({ run, scores, metrics }) => ({ run, scores, metrics })),
      representativeRun: representative.run,
    })
  }
}

const environment = {
  date: new Date().toISOString(),
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model ?? 'desconhecido',
  cpus: os.cpus().length,
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  lighthouse: versions?.lighthouse,
  chrome: versions?.userAgent,
  server: `vite preview (build de produção) em ${BASE_URL}`,
  scenario: 'default (latência variável 120–450 ms)',
  throttling: {
    mobile: 'Moto G Power emulado, throttling simulado (RTT 150 ms, 1,6 Mbps, CPU 4×)',
    desktop: 'preset desktop do Lighthouse (RTT 40 ms, 10 Mbps, CPU 1×)',
  },
}

await writeFile(
  path.join(OUT, 'summary.json'),
  JSON.stringify({ environment, targets: plan.targets, results: summary }, null, 2),
)

const ms = (value: number) => `${(value / 1000).toFixed(2)} s`
const lines = [
  '# Auditoria Lighthouse',
  '',
  `Gerado por \`npm run lighthouse\` em ${environment.date}.`,
  '',
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...summary.map(
    (row) =>
      `| ${row.page} (\`${row.path}\`) | ${row.profile} | ${row.medians.performance} | ${row.medians.accessibility} | ${row.medians['best-practices']} | ${row.medians.seo} | ${ms(row.metrics.lcp)} | ${row.metrics.cls.toFixed(3)} | ${Math.round(row.metrics.tbt)} ms |`,
  ),
  '',
  `Medianas de ${plan.runs} execuções por página e perfil. Metas: ${Object.entries(plan.targets)
    .map(([category, target]) => `${category} ≥ ${target}`)
    .join(', ')}.`,
  '',
  '## Ambiente',
  '',
  ...Object.entries(environment).map(
    ([key, value]) => `- **${key}**: ${typeof value === 'object' ? JSON.stringify(value) : value}`,
  ),
  '',
]
await writeFile(path.join(OUT, 'summary.md'), lines.join('\n'))
console.log(`\nResumo em ${path.relative(ROOT, path.join(OUT, 'summary.md'))}`)
