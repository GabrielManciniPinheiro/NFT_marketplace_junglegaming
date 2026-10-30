import type { ReactNode } from 'react'
import {
  Controller,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from 'react-hook-form'
import {
  NETWORK_LABEL,
  WALLET_PROVIDER_LABEL,
  type EnsSuffix,
  type Network,
  type WalletProvider,
} from '@/api/contracts'
import { FormField } from '@/components/form/FormField'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Values shared by the wallet form (Carteiras) and the collector form (Pagamento). */
export interface WalletFieldValues extends FieldValues {
  displayName: string
  network: Network | ''
  profileName: string
  address: string
  secondaryAddress: string
  provider: WalletProvider | ''
  referralCode: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
}

const ENS_SUFFIXES: EnsSuffix[] = ['.eth', '.kurio.eth']

interface WalletFieldsProps<T extends WalletFieldValues> {
  form: UseFormReturn<T>
  idPrefix: string
  /** Second cell of the first row: "Nome de usuário" (checkout) or "Apelido da carteira". */
  companion: ReactNode
  disabled?: boolean
}

/** 2-column grid from the Figma forms (single column on phones). */
export function WalletFields<T extends WalletFieldValues>({
  form,
  idPrefix,
  companion,
  disabled,
}: WalletFieldsProps<T>) {
  const errors = form.formState.errors as FieldErrors<WalletFieldValues>
  const field = (name: keyof WalletFieldValues & string) => name as Path<T>
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
      <FormField
        id={id('displayName')}
        label="Nome de exibição"
        required
        error={errors.displayName?.message}
      >
        {(control) => (
          <Input
            {...control}
            {...form.register(field('displayName'))}
            autoComplete="name"
            disabled={disabled}
          />
        )}
      </FormField>
      {companion}

      <FormField id={id('network')} label="Rede" required error={errors.network?.message}>
        {(control) => (
          <Controller
            control={form.control}
            name={field('network')}
            render={({ field: { value, onChange, onBlur, ref } }) => (
              <Select
                value={(value as string) || undefined}
                onValueChange={onChange}
                disabled={disabled}
              >
                <SelectTrigger {...control} ref={ref} onBlur={onBlur} className="h-10 w-full">
                  <SelectValue placeholder="Selecione uma rede" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(NETWORK_LABEL) as Network[]).map((network) => (
                    <SelectItem key={network} value={network}>
                      {NETWORK_LABEL[network]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>
      <FormField
        id={id('profileName')}
        label="Nome do perfil"
        required
        error={errors.profileName?.message}
      >
        {(control) => (
          <Input {...control} {...form.register(field('profileName'))} disabled={disabled} />
        )}
      </FormField>

      <FormField
        id={id('address')}
        label="Endereço da carteira"
        required
        error={errors.address?.message}
      >
        {(control) => (
          <Input
            {...control}
            {...form.register(field('address'))}
            placeholder="Endereço 0x da carteira"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            disabled={disabled}
          />
        )}
      </FormField>
      <FormField
        id={id('secondaryAddress')}
        label="ENS ou carteira secundária (opcional)"
        error={errors.secondaryAddress?.message}
      >
        {(control) => (
          <Input
            {...control}
            {...form.register(field('secondaryAddress'))}
            placeholder="ENS ou carteira secundária (opcional)"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
          />
        )}
      </FormField>

      <FormField
        id={id('provider')}
        label="Tipo de carteira"
        required
        error={errors.provider?.message}
      >
        {(control) => (
          <Controller
            control={form.control}
            name={field('provider')}
            render={({ field: { value, onChange, onBlur, ref } }) => (
              <Select
                value={(value as string) || undefined}
                onValueChange={onChange}
                disabled={disabled}
              >
                <SelectTrigger {...control} ref={ref} onBlur={onBlur} className="h-10 w-full">
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WALLET_PROVIDER_LABEL) as WalletProvider[]).map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {WALLET_PROVIDER_LABEL[provider]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>
      <FormField
        id={id('referralCode')}
        label="Código de indicação"
        required
        error={errors.referralCode?.message}
      >
        {(control) => (
          <Input
            {...control}
            {...form.register(field('referralCode'))}
            autoComplete="off"
            className="uppercase"
            disabled={disabled}
          />
        )}
      </FormField>

      <FormField id={id('email')} label="E-mail" required error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register(field('email'))}
            type="email"
            autoComplete="email"
            inputMode="email"
            disabled={disabled}
          />
        )}
      </FormField>
      <FormField id={id('ensName')} label="Nome ENS" required error={errors.ensName?.message}>
        {(control) => (
          <div className="flex gap-2">
            <Controller
              control={form.control}
              name={field('ensSuffix')}
              render={({ field: { value, onChange } }) => (
                <Select value={value as string} onValueChange={onChange} disabled={disabled}>
                  <SelectTrigger aria-label="Sufixo ENS" className="h-10 w-[6.75rem] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENS_SUFFIXES.map((suffix) => (
                      <SelectItem key={suffix} value={suffix}>
                        {suffix}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input
              {...control}
              {...form.register(field('ensName'))}
              autoComplete="off"
              spellCheck={false}
              placeholder="nome"
              disabled={disabled}
            />
          </div>
        )}
      </FormField>
    </div>
  )
}
