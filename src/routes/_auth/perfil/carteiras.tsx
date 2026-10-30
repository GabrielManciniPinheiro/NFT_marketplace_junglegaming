import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import type { User, Wallet } from '@/api/contracts'
import { getErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { WalletForm } from '@/features/account/components/WalletForm'
import { walletFormDefaults } from '@/features/account/wallet-form'
import { useRemoveWallet } from '@/features/account/mutations'
import { useWallets } from '@/features/account/queries'
import { useSession } from '@/features/auth/session'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/perfil/carteiras')({
  component: WalletsPage,
})

function SectionHeader({
  id,
  title,
  description,
  action,
}: {
  id: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id={id} className="text-[0.9375rem] font-bold">
          {title}
        </h2>
        <p className="text-xs text-sand">{description}</p>
      </div>
      {action}
    </div>
  )
}

function PrimarySection({ user, primary }: { user: User; primary: Wallet | null }) {
  const [adding, setAdding] = useState(false)
  return (
    <section aria-labelledby="primary-title" className="space-y-6">
      <SectionHeader
        id="primary-title"
        title="Carteira principal"
        description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
        action={
          !primary &&
          !adding && (
            <Button
              variant="link"
              className="text-sm font-semibold"
              onClick={() => setAdding(true)}
            >
              Adicionar
            </Button>
          )
        }
      />
      {primary ? (
        <WalletForm
          key={primary.id}
          userId={user.id}
          kind="primary"
          wallet={primary}
          defaults={walletFormDefaults(primary)}
        />
      ) : adding ? (
        <WalletForm
          userId={user.id}
          kind="primary"
          wallet={null}
          defaults={walletFormDefaults(null, {
            displayName: user.displayName,
            email: user.email,
            nickname: 'Principal',
          })}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <p className="text-sm text-sand">Você ainda não cadastrou sua carteira principal.</p>
      )}
    </section>
  )
}

function SecondarySection({
  user,
  primary,
  secondary,
}: {
  user: User
  primary: Wallet | null
  secondary: Wallet | null
}) {
  const [adding, setAdding] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const remove = useRemoveWallet(user.id)

  // "Igual à carteira principal" copies the collector data, never the address.
  const defaults = walletFormDefaults(sameAsPrimary ? primary : null, {
    nickname: 'Reserva',
    address: '',
    secondaryAddress: '',
    ...(sameAsPrimary ? {} : { displayName: user.displayName, email: user.email }),
  })

  return (
    <section aria-labelledby="secondary-title" className="space-y-6">
      <SectionHeader
        id="secondary-title"
        title="Carteira secundária"
        description={
          secondary
            ? 'Usada como alternativa no pagamento.'
            : 'Você ainda não adicionou uma carteira secundária.'
        }
        action={
          !secondary &&
          !adding && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="same-as-primary"
                  checked={sameAsPrimary}
                  disabled={!primary}
                  onCheckedChange={(value) => setSameAsPrimary(value === true)}
                />
                <Label htmlFor="same-as-primary" className="text-sm font-normal">
                  Igual à carteira principal
                </Label>
              </div>
              <Button
                variant="link"
                className="text-sm font-semibold"
                disabled={!primary}
                onClick={() => setAdding(true)}
              >
                Adicionar
              </Button>
            </div>
          )
        }
      />
      {!primary && !secondary && (
        <p className="text-xs text-meta">Cadastre a carteira principal antes da secundária.</p>
      )}
      {secondary ? (
        <>
          <WalletForm
            key={secondary.id}
            userId={user.id}
            kind="secondary"
            wallet={secondary}
            defaults={walletFormDefaults(secondary)}
          />
          <Button
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(secondary.id, {
                onSuccess: () => toast.info('Carteira secundária removida.'),
                onError: (error) => toast.error(getErrorMessage(error)),
              })
            }
          >
            Remover carteira secundária
          </Button>
        </>
      ) : (
        adding && (
          <WalletForm
            key={String(sameAsPrimary)}
            userId={user.id}
            kind="secondary"
            wallet={null}
            defaults={defaults}
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        )
      )}
    </section>
  )
}

function WalletsPage() {
  usePageTitle('Carteiras')
  const { user } = useSession()
  const wallets = useWallets()
  if (!user) return null

  return (
    <div className="space-y-8">
      <h1 className="sr-only">Carteiras</h1>
      {wallets.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2" aria-hidden>
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : wallets.isError ? (
        <ErrorState
          title="Não foi possível carregar suas carteiras"
          error={wallets.error}
          onRetry={() => void wallets.refetch()}
          retrying={wallets.isFetching}
        />
      ) : (
        <>
          <PrimarySection user={user} primary={wallets.data.primary} />
          <Separator />
          <SecondarySection
            user={user}
            primary={wallets.data.primary}
            secondary={wallets.data.secondary}
          />
        </>
      )}
    </div>
  )
}
