import { WifiOffIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRealtimeStatus } from '@/realtime/status'

const SHOW_AFTER_MS = 1_500

/** Tells the collector when live updates are paused and when data was resynchronized. */
export function RealtimeBanner() {
  const status = useRealtimeStatus()
  const [visible, setVisible] = useState(false)
  const wasVisible = useRef(false)

  useEffect(() => {
    if (status !== 'reconnecting') return
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (status !== 'connected') return
    if (wasVisible.current) {
      toast.success('Conexão em tempo real restabelecida. Dados sincronizados.', { id: 'realtime' })
    }
    wasVisible.current = false
    const timer = window.setTimeout(() => setVisible(false), 0)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (visible) wasVisible.current = true
  }, [visible])

  return (
    <div role="status" aria-live="polite">
      {visible && status !== 'connected' && (
        <div className="border-b border-primary/40 bg-surface-2">
          <p className="page-container flex items-center gap-2 py-2 text-xs text-sand">
            <WifiOffIcon className="size-4 shrink-0 text-brand" aria-hidden />
            Atualizações em tempo real indisponíveis. Tentando reconectar… Preços e pedidos serão
            sincronizados assim que a conexão voltar.
          </p>
        </div>
      )}
    </div>
  )
}
