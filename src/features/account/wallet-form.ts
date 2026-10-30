import type { Wallet } from '@/api/contracts'
import type { WalletFieldValues } from './components/WalletFields'

export interface WalletFormValues extends WalletFieldValues {
  nickname: string
}

export function walletFormDefaults(
  wallet: Wallet | null,
  overrides: Partial<WalletFormValues> = {},
): WalletFormValues {
  return {
    displayName: wallet?.displayName ?? '',
    nickname: wallet?.nickname ?? '',
    network: wallet?.network ?? '',
    profileName: wallet?.profileName ?? '',
    address: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    provider: wallet?.provider ?? '',
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? '',
    ensName: wallet?.ensName ?? '',
    ensSuffix: wallet?.ensSuffix ?? '.eth',
    ...overrides,
  }
}
