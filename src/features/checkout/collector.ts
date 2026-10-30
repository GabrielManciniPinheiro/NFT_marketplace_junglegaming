import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import {
  collectorSchema,
  isValidAddress,
  type Collector,
  type User,
  type Wallet,
} from '@/api/contracts'
import type { WalletFieldValues } from '@/features/account/components/WalletFields'

export interface CollectorFormValues extends WalletFieldValues {
  username: string
  note: string
}

export const COLLECTOR_FIELDS = [
  'displayName',
  'username',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'provider',
  'referralCode',
  'email',
  'ensName',
  'ensSuffix',
  'note',
] as const

const collectorFormSchema = collectorSchema.superRefine((value, ctx) => {
  if (value.network && !isValidAddress(value.network, value.address)) {
    ctx.addIssue({
      code: 'custom',
      path: ['address'],
      message:
        value.network === 'solana'
          ? 'Endereço Solana inválido (base58, 32 a 44 caracteres)'
          : 'Use 0x seguido de 40 caracteres hexadecimais',
    })
  }
})

export const collectorResolver = zodResolver(collectorFormSchema) as unknown as Resolver<
  CollectorFormValues,
  unknown,
  Collector
>

/** The selected registered wallet pre-fills the collector profile. */
export function collectorDefaults(user: User, wallet: Wallet | null): CollectorFormValues {
  return {
    displayName: wallet?.displayName ?? user.displayName,
    username: user.username,
    network: wallet?.network ?? '',
    profileName: wallet?.profileName ?? '',
    address: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    provider: wallet?.provider ?? '',
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? user.email,
    ensName: wallet?.ensName ?? '',
    ensSuffix: wallet?.ensSuffix ?? '.eth',
    note: '',
  }
}
