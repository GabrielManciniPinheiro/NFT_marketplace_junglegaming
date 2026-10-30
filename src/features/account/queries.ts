import { queryOptions, useQuery } from '@tanstack/react-query'
import { profileApi, walletsApi } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'

export function walletsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.private.wallets(userId),
    queryFn: ({ signal }) => walletsApi.list(signal),
  })
}

export function profileQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.private.profile(userId),
    queryFn: ({ signal }) => profileApi.get(signal),
  })
}

export function useWallets() {
  const { user } = useSession()
  return useQuery({ ...walletsQueryOptions(user?.id ?? 'anonymous'), enabled: Boolean(user) })
}

export function useProfile() {
  const { user } = useSession()
  return useQuery({ ...profileQueryOptions(user?.id ?? 'anonymous'), enabled: Boolean(user) })
}
