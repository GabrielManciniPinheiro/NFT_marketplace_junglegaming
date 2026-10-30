import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/common/ComingSoon'

export const Route = createFileRoute('/aprenda')({
  component: () => (
    <ComingSoon
      title="Aprenda"
      description="Guias sobre carteiras, redes e colecionismo digital chegam em breve."
    />
  ),
})
