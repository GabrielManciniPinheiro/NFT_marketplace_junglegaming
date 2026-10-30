import { Link } from '@tanstack/react-router'
import { MoreVerticalIcon, PlugZapIcon, WalletIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from 'cn'
import {
  NETWORK_LABEL,
  WALLET_PROVIDER_LABEL,
  type Wallet,
  type WalletProvider,
  type WalletSession,
} from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { shortAddress } from '@/lib/format'

const PROVIDERS: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

function ProviderBadge({ provider }: { provider: WalletProvider }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-brand"
    >
      {provider === 'coinbase' ? (
        <WalletIcon className="size-4" />
      ) : provider === 'metamask' ? (
        'M'
      ) : (
        'W'
      )}
    </span>
  )
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  children,
  trailing,
  radioPosition = 'start',
}: {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  children: ReactNode
  trailing?: ReactNode
  radioPosition?: 'start' | 'end'
}) {
  const dot = (
    <span
      aria-hidden
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-full border-2 transition-colors',
        checked ? 'border-primary' : 'border-meta',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full bg-primary transition-opacity',
          !checked && 'opacity-0',
        )}
      />
    </span>
  )
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-colors',
        'has-focus-visible:ring-2 has-focus-visible:ring-ring',
        checked ? 'border-primary/70' : 'border-transparent hover:border-primary/40',
      )}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        {radioPosition === 'start' && dot}
        <span className="min-w-0 flex-1">{children}</span>
        {radioPosition === 'end' && dot}
      </label>
      {trailing}
    </div>
  )
}

interface WalletPickerProps {
  wallets: Wallet[]
  walletId: string | null
  onWalletChange: (walletId: string) => void
  provider: WalletProvider
  onProviderChange: (provider: WalletProvider) => void
  connection: WalletSession | null
  onDisconnect: () => void
  disconnecting: boolean
}

/** "Carteira conectada" (registered wallets) + "Carteira e rede" (signing provider). */
export function WalletPicker({
  wallets,
  walletId,
  onWalletChange,
  provider,
  onProviderChange,
  connection,
  onDisconnect,
  disconnecting,
}: WalletPickerProps) {
  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-[0.9375rem] font-bold">Carteira conectada</legend>
          <Link to="/perfil/carteiras" className="text-sm font-semibold text-brand hover:underline">
            Trocar carteira
          </Link>
        </div>
        {wallets.length === 0 ? (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm text-sand">
            Você ainda não tem carteiras cadastradas. Os dados do perfil serão salvos como sua
            carteira principal ao confirmar a compra.
          </p>
        ) : (
          wallets.map((wallet) => (
            <RadioCard
              key={wallet.id}
              name="checkout-wallet"
              value={wallet.id}
              checked={wallet.id === walletId}
              onChange={() => onWalletChange(wallet.id)}
              trailing={
                <Button asChild variant="ghost" size="icon-sm" className="text-soft">
                  <Link to="/perfil/carteiras" aria-label={`Gerenciar carteira ${wallet.nickname}`}>
                    <MoreVerticalIcon aria-hidden />
                  </Link>
                </Button>
              }
            >
              <span className="block text-sm font-bold">{wallet.nickname}</span>
              <span className="block truncate text-xs text-sand">
                {wallet.secondaryAddress || shortAddress(wallet.address)}
              </span>
              <span className="block text-xs text-sand">
                Rede{' '}
                {wallet.network === 'ethereum'
                  ? 'principal Ethereum'
                  : NETWORK_LABEL[wallet.network]}
              </span>
            </RadioCard>
          ))
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-[0.9375rem] font-bold">Carteira e rede</legend>
        {PROVIDERS.map((option) => (
          <RadioCard
            key={option}
            name="checkout-provider"
            value={option}
            checked={option === provider}
            onChange={() => onProviderChange(option)}
            radioPosition="end"
          >
            <span className="flex items-center gap-3">
              <ProviderBadge provider={option} />
              <span className="text-sm">{WALLET_PROVIDER_LABEL[option]}</span>
            </span>
          </RadioCard>
        ))}
      </fieldset>

      <div role="status" aria-live="polite">
        {connection && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-sand">
              <PlugZapIcon className="size-4 text-success" aria-hidden />
              Conectada via {WALLET_PROVIDER_LABEL[connection.provider]} ·{' '}
              {shortAddress(connection.address)} · {NETWORK_LABEL[connection.network]}
            </span>
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0 text-xs"
              onClick={onDisconnect}
              disabled={disconnecting}
            >
              Desconectar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
