import { FlaskConicalIcon, RotateCcwIcon } from 'lucide-react'
import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { mockConfig, type MockConfig, type ScenarioId } from '../config'
import { DEMO_PASSWORD, USER_SEEDS } from '../fixtures/accounts'
import { mockControl } from '../control'
import { onRealtimeStatusChange, realtimeStatus } from '../realtime/server'

const NFT_OPTIONS = [
  ['emerald-ape-042', 'Emerald Ape #042'],
  ['violet-nomad-314', 'Violet Nomad #314'],
  ['ivory-baron-088', 'Ivory Baron #088'],
  ['sage-nomad-009', 'Sage Nomad #009'],
  ['neon-vessel-552', 'Neon Vessel #552'],
  ['golden-beat-207', 'Golden Beat #207'],
] as const

function useMockConfig() {
  return useSyncExternalStore(mockConfig.subscribe, mockConfig.get)
}

let statusSnapshot = realtimeStatus()
function useRealtimeStatus() {
  return useSyncExternalStore(
    (listener) =>
      onRealtimeStatusChange(() => {
        statusSnapshot = realtimeStatus()
        listener()
      }),
    () => statusSnapshot,
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h3 className="text-xs font-bold tracking-wider text-brand uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs text-sand">{label}</legend>
      <div className="flex flex-wrap gap-1">
        {options.map(([option, text]) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={value === option ? 'default' : 'outline'}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {text}
          </Button>
        ))}
      </div>
    </fieldset>
  )
}

export function MockLab() {
  const config = useMockConfig()
  const realtime = useRealtimeStatus()
  const [nftId, setNftId] = useState<string>(NFT_OPTIONS[0][0])
  const [feedback, setFeedback] = useState('')
  const scenarios = mockControl.scenarios()
  const active = scenarios.find((scenario) => scenario.id === config.scenario)

  const run = (message: string, action: () => unknown) => () => {
    try {
      action()
      setFeedback(message)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao executar ação')
    }
  }
  const patch = (value: Partial<MockConfig>) => mockControl.setConfig(value)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Abrir Mock Lab (simulação do backend)"
          className="fixed bottom-4 left-4 z-40 border-primary/60 bg-background/95 shadow-lg backdrop-blur max-sm:size-10 max-sm:p-0"
          data-testid="mock-lab-trigger"
        >
          <FlaskConicalIcon aria-hidden />
          <span className="max-sm:sr-only">Mock Lab</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mock Lab</SheetTitle>
          <SheetDescription>
            Backend simulado com MSW. As ações alteram os dados do servidor e chegam à aplicação por
            REST e Socket.IO.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6 text-sm">
          <Section title="Contas de demonstração">
            <ul className="space-y-1 text-xs text-sand">
              {USER_SEEDS.map((user) => (
                <li key={user.id}>
                  <span className="text-foreground">{user.email}</span> — {user.displayName}
                </li>
              ))}
            </ul>
            <p className="text-xs text-sand">
              Senha de ambas: <code className="text-foreground">{DEMO_PASSWORD}</code>
            </p>
          </Section>

          <Section title="Cenário">
            <Label htmlFor="mock-scenario" className="sr-only">
              Cenário ativo
            </Label>
            <Select
              value={config.scenario}
              onValueChange={(id) => mockControl.setScenario(id as ScenarioId)}
            >
              <SelectTrigger id="mock-scenario" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-sand">{active?.description}</p>
          </Section>

          <Section title="Carteira e pagamento">
            <Toggle
              label="Conexão da carteira"
              value={config.walletApproval}
              options={[
                ['approve', 'Aprovar'],
                ['reject', 'Recusar'],
              ]}
              onChange={(walletApproval) => patch({ walletApproval })}
            />
            <Toggle
              label="Resultado do pagamento"
              value={config.paymentOutcome}
              options={[
                ['confirm', 'Confirmar'],
                ['decline', 'Recusar'],
              ]}
              onChange={(paymentOutcome) => patch({ paymentOutcome })}
            />
            <Toggle
              label="Liquidação de pedidos"
              value={config.settlementDelayMs > 0 ? 'auto' : 'manual'}
              options={[
                ['auto', 'Automática (3 s)'],
                ['manual', 'Manual'],
              ]}
              onChange={(mode) => patch({ settlementDelayMs: mode === 'auto' ? 3_000 : 0 })}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={run('Pedidos pendentes confirmados', () =>
                  mockControl.settlePendingOrders('confirm'),
                )}
              >
                Confirmar pendentes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Pedidos pendentes recusados', () =>
                  mockControl.settlePendingOrders('decline'),
                )}
              >
                Recusar pendentes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Carteiras desconectadas', mockControl.disconnectWallets)}
              >
                Desconectar carteiras
              </Button>
            </div>
          </Section>

          <Section title="Catálogo (nft.updated)">
            <Label htmlFor="mock-nft" className="text-xs text-sand">
              NFT afetado
            </Label>
            <Select value={nftId} onValueChange={setNftId}>
              <SelectTrigger id="mock-nft" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NFT_OPTIONS.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={run('Preço +10% publicado', () => mockControl.changePrice(nftId, 10))}
              >
                Preço +10%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Preço −10% publicado', () => mockControl.changePrice(nftId, -10))}
              >
                Preço −10%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Edição esgotada', () => mockControl.sellOut(nftId))}
              >
                Esgotar edição 1/50
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Estoque reposto', () => mockControl.restock(nftId))}
              >
                Repor estoque
              </Button>
            </div>
          </Section>

          <Section title="Entrega de eventos">
            <p className="text-xs text-sand">
              Conexões: {realtime.connections} ({realtime.authenticated} autenticadas)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={run('Último evento reenviado', mockControl.replayLastEvent)}
              >
                Duplicar último evento
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Evento antigo enviado', () => mockControl.emitStaleNftEvent(nftId))}
              >
                Enviar evento antigo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Tempo real fora por 8 s', () => mockControl.dropRealtime(8_000))}
              >
                Derrubar conexão (8 s)
              </Button>
            </div>
          </Section>

          <Section title="Sessão">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={run('Sessões expiradas', mockControl.expireSessions)}
              >
                Expirar sessão agora
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={run('Cupom KURIO10 expirado', () => mockControl.expireCoupon('KURIO10'))}
              >
                Expirar cupom KURIO10
              </Button>
            </div>
          </Section>

          <Section title="Dados">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (window.confirm('Restaurar o cenário inicial? Você será desconectado.'))
                  void mockControl.reset()
              }}
            >
              <RotateCcwIcon aria-hidden />
              Resetar dados e cenário
            </Button>
          </Section>

          <p role="status" aria-live="polite" className="min-h-5 text-xs text-brand">
            {feedback}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
