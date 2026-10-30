interface ImportMetaEnv {
  /** "true" boots the MSW mock layer (REST + Socket.IO) before rendering. */
  readonly VITE_ENABLE_MOCKS?: string
  /** Base URL for the REST API (default: /api). */
  readonly VITE_API_URL?: string
  /** Socket.IO endpoint (default: wss://realtime.kurio.mock, intercepted by MSW). */
  readonly VITE_SOCKET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
