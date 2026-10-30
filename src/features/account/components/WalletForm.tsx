import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { walletInputSchema, type Wallet, type WalletInput, type WalletKind } from '@/api/contracts'
import { walletFormDefaults } from '../wallet-form'
import { FormAlert } from '@/components/form/FormAlert'
import { FormField } from '@/components/form/FormField'
import { applyServerErrors } from '@/components/form/server-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useSaveWallet } from '../mutations'
import { type WalletFormValues } from '../wallet-form'
import { WalletFields } from './WalletFields'

const WALLET_FIELDS = [
  'displayName',
  'nickname',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'provider',
  'referralCode',
  'email',
  'ensName',
  'ensSuffix',
] as const

const resolver = zodResolver(walletInputSchema) as unknown as Resolver<
  WalletFormValues,
  unknown,
  WalletInput
>

interface WalletFormProps {
  userId: string
  kind: WalletKind
  wallet: Wallet | null
  defaults: WalletFormValues
  onSaved?: () => void
  onCancel?: () => void
}

/** Create or edit one wallet (same field grid as the Figma "Carteiras" frame). */
export function WalletForm({ userId, kind, wallet, defaults, onSaved, onCancel }: WalletFormProps) {
  const save = useSaveWallet(userId)
  const form = useForm<WalletFormValues, unknown, WalletInput>({
    resolver,
    defaultValues: defaults,
    mode: 'onTouched',
  })
  const { errors, isDirty } = form.formState
  const prefix = `wallet-${kind}`

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        save.mutate(
          wallet
            ? { walletId: wallet.id, body: values }
            : { walletId: null, body: { ...values, kind } },
          {
            onSuccess: (saved) => {
              form.reset(walletFormDefaults(saved))
              toast.success(`Carteira "${saved.nickname}" salva.`)
              onSaved?.()
            },
            onError: (error) => applyServerErrors(form, error, WALLET_FIELDS),
          },
        ),
      )}
      className="space-y-5"
    >
      {errors.root?.server && <FormAlert>{errors.root.server.message}</FormAlert>}
      <WalletFields
        form={form}
        idPrefix={prefix}
        companion={
          <FormField
            id={`${prefix}-nickname`}
            label="Apelido da carteira"
            required
            error={errors.nickname?.message}
          >
            {(control) => <Input {...control} {...form.register('nickname')} />}
          </FormField>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={save.isPending || (Boolean(wallet) && !isDirty)}>
          {save.isPending && <Spinner aria-hidden />}
          Salvar carteira
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
