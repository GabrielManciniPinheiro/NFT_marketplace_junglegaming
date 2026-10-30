import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * The demo build boots MSW before any request: preload its chunk (and static deps) from the
 * HTML so it downloads in parallel with the app bundle instead of after it.
 */
function preloadMockLayer(enabled: boolean): Plugin {
  return {
    name: 'kurio:preload-mock-layer',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (!enabled || !context.bundle) return html
        const entry = Object.values(context.bundle).find(
          (chunk) =>
            chunk.type === 'chunk' &&
            chunk.facadeModuleId?.split(path.sep).join('/').endsWith('src/mocks/browser.ts'),
        )
        if (!entry || entry.type !== 'chunk') return html
        return [entry.fileName, ...entry.imports].map((fileName) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${fileName}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

/* ─── Chunk groups for the boot path ──────────────────────────────────────── */

const normalize = (id: string) => id.split(path.sep).join('/')

/** Matches a module inside node_modules by its path relative to node_modules. */
const inModules = (pattern: RegExp) => (id: string) => {
  const [, rest] = normalize(id).split('/node_modules/')
  return rest !== undefined && pattern.test(rest)
}

/** Matches an application module by its path relative to src/. */
const inSource = (pattern: RegExp) => (id: string) => {
  const [, rest] = normalize(id).split('/src/')
  return rest !== undefined && !id.includes('node_modules') && pattern.test(rest)
}

/** Libraries every page needs at boot (header dialogs included; forms/menus stay lazy). */
const BOOT_PACKAGES =
  /^(axios|zod|sonner|cn|class-variance-authority|lucide-react|react-remove-scroll|react-remove-scroll-bar|react-style-singleton|use-callback-ref|use-sidecar|aria-hidden|get-nonce|detect-node-es|tslib|@radix-ui\/(primitive|react-(dialog|slot|primitive|compose-refs|context|portal|presence|focus-scope|focus-guards|dismissable-layer|id|use-[a-z-]+)))\//

/** Shared application modules used by the shell and the first routes. */
const BOOT_SOURCES =
  /^(api|lib|config|app)\/|^realtime\/(processor|status)|^components\/ui\/(button|skeleton|spinner|separator|dialog|sheet|input|label|empty)\.|^components\/common\/(ErrorState|NotFound|NftImage|EthAmount|Breadcrumbs)\.|^features\/(auth\/(session|search|use-logout)|cart\/queries)\./

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadMockLayer(loadEnv(mode, process.cwd()).VITE_ENABLE_MOCKS === 'true'),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      // MSW's cookie store only needs eTLD+1 from tldts; skip its 260 KB suffix list.
      {
        find: /^tldts$/,
        replacement: path.resolve(import.meta.dirname, './src/mocks/lib/tldts-lite.ts'),
      },
    ],
  },
  build: {
    rolldownOptions: {
      output: {
        // Boot-critical code in a few larger chunks: dozens of sub-1 KB shared files cost a
        // round trip each on HTTP/1.1. Forms, selects, menus, the mock layer and the socket
        // client keep their own lazily loaded chunks.
        codeSplitting: {
          groups: [
            { name: 'react', test: inModules(/^(react|react-dom|scheduler)\//), priority: 40 },
            { name: 'tanstack', test: inModules(/^@tanstack\//), priority: 30 },
            { name: 'vendor', test: inModules(BOOT_PACKAGES), priority: 20 },
            { name: 'app', test: inSource(BOOT_SOURCES), priority: 10 },
          ],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
}))
