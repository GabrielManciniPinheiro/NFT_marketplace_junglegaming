import type { EditionId, EnsSuffix, Network, WalletProvider } from '@/api/contracts'

/**
 * Fictitious accounts. Passwords are only kept here to be hashed at seed time —
 * the mock database stores salt + PBKDF2 hash, never the plain text.
 */
export const DEMO_PASSWORD = 'Kurio@2026'

export interface UserSeed {
  id: string
  username: string
  displayName: string
  email: string
  bio: string
  password: string
  wallets: WalletSeed[]
  cart: { nftId: string; edition: EditionId; quantity: number }[]
  favorites: string[]
}

export interface WalletSeed {
  id: string
  kind: 'primary' | 'secondary'
  displayName: string
  nickname: string
  network: Network
  profileName: string
  address: string
  secondaryAddress: string
  provider: WalletProvider
  referralCode: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
}

export const USER_SEEDS: UserSeed[] = [
  {
    id: 'usr_nova',
    username: 'nova',
    displayName: 'Nova Ribeiro',
    email: 'nova@kurio.test',
    bio: 'Coleciono arte digital com personagens e acompanho lançamentos da comunidade Kurio.',
    password: DEMO_PASSWORD,
    wallets: [
      {
        id: 'wal_nova_primary',
        kind: 'primary',
        displayName: 'Nova Ribeiro',
        nickname: 'Principal',
        network: 'ethereum',
        profileName: 'nova.colecao',
        address: '0xA91F3c7d5b2e8f104a6c9d2b7e5f1a3c8d6bE82C',
        secondaryAddress: '',
        provider: 'metamask',
        referralCode: 'NOVA01',
        email: 'nova@kurio.test',
        ensName: 'nova',
        ensSuffix: '.eth',
      },
      {
        id: 'wal_nova_secondary',
        kind: 'secondary',
        displayName: 'Nova Ribeiro',
        nickname: 'Reserva',
        network: 'polygon',
        profileName: 'nova.reserva',
        address: '0x5D1e8a4C27b93f60E1d4a7B2c9e8F03a6b1D7c4E',
        secondaryAddress: 'nova.kurio.eth',
        provider: 'coinbase',
        referralCode: 'NOVA01',
        email: 'nova@kurio.test',
        ensName: 'nova',
        ensSuffix: '.kurio.eth',
      },
    ],
    // Same composition as the cart frame in Figma (2 + 6 + 9 editions = 26.83 ETH).
    cart: [
      { nftId: 'emerald-ape-042', edition: '1-50', quantity: 2 },
      { nftId: 'violet-nomad-314', edition: '1-50', quantity: 6 },
      { nftId: 'ivory-baron-088', edition: '1-50', quantity: 9 },
    ],
    favorites: ['emerald-ape-042', 'golden-beat-207'],
  },
  {
    id: 'usr_bruno',
    username: 'bruno',
    displayName: 'Bruno Tavares',
    email: 'bruno@kurio.test',
    bio: 'Fotografia generativa e trilhas sonoras on-chain.',
    password: DEMO_PASSWORD,
    wallets: [
      {
        id: 'wal_bruno_primary',
        kind: 'primary',
        displayName: 'Bruno Tavares',
        nickname: 'Principal',
        network: 'ethereum',
        profileName: 'bruno.tav',
        address: '0x3B7cE2a91F04d8B6e5C1a7D9f2E0b4C8a6D1e3F5',
        secondaryAddress: '',
        provider: 'walletconnect',
        referralCode: 'BRUNO01',
        email: 'bruno@kurio.test',
        ensName: 'brunotav',
        ensSuffix: '.eth',
      },
    ],
    cart: [],
    favorites: ['sage-nomad-009'],
  },
]

export interface CouponSeed {
  code: string
  label: string
  percentBps: number
  expiresAt: string
}

export const COUPON_SEEDS: CouponSeed[] = [
  {
    code: 'KURIO10',
    label: 'Cupom de boas-vindas',
    percentBps: 1_000,
    expiresAt: '2027-12-31T23:59:59.000Z',
  },
  {
    code: 'LANCAMENTO5',
    label: 'Desconto do lançamento',
    percentBps: 500,
    expiresAt: '2027-06-30T23:59:59.000Z',
  },
  {
    code: 'EXPIRADO20',
    label: 'Campanha encerrada',
    percentBps: 2_000,
    expiresAt: '2025-11-30T23:59:59.000Z',
  },
]

/** Referral codes accepted by the wallet and collector forms (validated server-side). */
export const REFERRAL_CODES = ['KURIO2026', 'NOVA01', 'BRUNO01', 'APE042']

/** Flat network fee per order. The cart shows the Ethereum estimate. */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}
