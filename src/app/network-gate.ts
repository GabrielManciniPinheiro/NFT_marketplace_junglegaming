/**
 * Network readiness gate.
 *
 * The UI renders immediately; REST calls and the Socket.IO connection wait here until the
 * network layer is ready (the MSW worker in the demo build, immediately otherwise). This
 * lets the app shell, route chunks and skeletons load in parallel with the mock layer.
 */
let open!: () => void

export const networkReady = new Promise<void>((resolve) => {
  open = resolve
})

export function markNetworkReady() {
  open()
}
