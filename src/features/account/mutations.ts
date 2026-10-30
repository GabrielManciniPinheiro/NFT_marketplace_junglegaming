import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ChangePasswordRequest,
  CreateWalletRequest,
  Profile,
  UpdateProfileRequest,
  WalletInput,
} from '@/api/contracts'
import { credentials } from '@/api/credentials'
import { profileApi, walletsApi } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'

/** Profile edits also change what the session shows (name, avatar): keep both in sync. */
function useProfileCache(userId: string) {
  const queryClient = useQueryClient()
  return (profile: Profile) => {
    queryClient.setQueryData(queryKeys.private.profile(userId), profile)
    void queryClient.invalidateQueries({ queryKey: queryKeys.session(credentials.getToken()) })
  }
}

export function useUpdateProfile(userId: string) {
  const store = useProfileCache(userId)
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => profileApi.update(body),
    onSuccess: store,
  })
}

export function useUploadAvatar(userId: string) {
  const store = useProfileCache(userId)
  return useMutation({
    mutationFn: ({ file, name }: { file: Blob; name: string }) =>
      profileApi.uploadAvatar(file, name),
    onSuccess: store,
  })
}

export function useRemoveAvatar(userId: string) {
  const store = useProfileCache(userId)
  return useMutation({ mutationFn: () => profileApi.removeAvatar(), onSuccess: store })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => profileApi.changePassword(body),
  })
}

export function useSaveWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input:
        { walletId: string; body: WalletInput } | { walletId: null; body: CreateWalletRequest },
    ) =>
      input.walletId
        ? walletsApi.update(input.walletId, input.body)
        : walletsApi.create(input.body as CreateWalletRequest),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.private.wallets(userId) }),
  })
}

export function useRemoveWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (walletId: string) => walletsApi.remove(walletId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.private.wallets(userId) }),
  })
}
