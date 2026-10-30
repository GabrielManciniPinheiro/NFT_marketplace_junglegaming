import { zodResolver } from '@hookform/resolvers/zod'
import { CameraIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  AVATAR_MIME_TYPES,
  passwordSchema,
  updateProfileRequestSchema,
  type Profile,
  type UpdateProfileRequest,
} from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/errors'
import { UserAvatar } from '@/components/common/UserAvatar'
import { FormAlert } from '@/components/form/FormAlert'
import { FormField } from '@/components/form/FormField'
import { PasswordInput } from '@/components/form/PasswordInput'
import { applyServerErrors } from '@/components/form/server-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useChangePassword, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '../mutations'

/** Square-crops and downsizes the picture to 256 px WebP before upload. */
async function prepareAvatar(file: File): Promise<{ blob: Blob; name: string }> {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type))
    return { blob: file, name: file.name }
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return { blob: file, name: file.name }
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85),
  )
  return blob ? { blob, name: 'avatar.webp' } : { blob: file, name: file.name }
}

export function AvatarSection({ profile }: { profile: Profile }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar(profile.id)
  const remove = useRemoveAvatar(profile.id)
  const [error, setError] = useState<string | null>(null)
  const busy = upload.isPending || remove.isPending

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const { blob, name } = await prepareAvatar(file)
      upload.mutate(
        { file: blob, name },
        {
          onSuccess: () => toast.success('Foto do perfil atualizada.'),
          onError: (failure) =>
            setError(
              isApiError(failure)
                ? (failure.fieldErrors.avatar?.[0] ?? failure.message)
                : getErrorMessage(failure),
            ),
        },
      )
    } catch {
      setError('Não foi possível ler esta imagem. Use PNG, JPG ou WebP.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  return (
    <section aria-labelledby="avatar-title" className="flex flex-wrap items-center gap-5">
      <UserAvatar user={profile} className="size-20 text-lg" />
      <div className="space-y-2">
        <h2 id="avatar-title" className="text-sm font-bold">
          Foto do perfil
        </h2>
        <input
          ref={input}
          id="avatar-input"
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-describedby="avatar-help"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            {upload.isPending ? <Spinner aria-hidden /> : <CameraIcon aria-hidden />}
            {upload.isPending ? 'Enviando…' : 'Alterar foto'}
          </Button>
          {profile.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                remove.mutate(undefined, { onSuccess: () => toast.info('Foto removida.') })
              }
            >
              <Trash2Icon aria-hidden />
              Remover
            </Button>
          )}
        </div>
        <p id="avatar-help" className="text-xs text-meta">
          PNG, JPG ou WebP. A imagem é recortada em 256 × 256 px.
        </p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}

export function ProfileDataForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile(profile.id)
  const form = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      bio: profile.bio,
    },
    mode: 'onTouched',
  })
  const { errors, isDirty } = form.formState

  return (
    <form
      noValidate
      aria-labelledby="profile-data-title"
      onSubmit={form.handleSubmit((values) =>
        update.mutate(values, {
          onSuccess: (saved) => {
            form.reset({
              displayName: saved.displayName,
              username: saved.username,
              email: saved.email,
              bio: saved.bio,
            })
            toast.success('Dados do perfil salvos.')
          },
          onError: (error) =>
            applyServerErrors(form, error, ['displayName', 'username', 'email', 'bio']),
        }),
      )}
      className="space-y-5"
    >
      <div>
        <h2 id="profile-data-title" className="text-[0.9375rem] font-bold">
          Dados do perfil
        </h2>
        <p className="text-xs text-sand">
          Estas informações aparecem nos seus pedidos e na sua coleção.
        </p>
      </div>
      {errors.root?.server && <FormAlert>{errors.root.server.message}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="profile-displayName"
          label="Nome de exibição"
          required
          error={errors.displayName?.message}
        >
          {(control) => (
            <Input {...control} {...form.register('displayName')} autoComplete="name" />
          )}
        </FormField>
        <FormField
          id="profile-username"
          label="Nome de usuário"
          required
          error={errors.username?.message}
        >
          {(control) => (
            <Input {...control} {...form.register('username')} autoComplete="username" />
          )}
        </FormField>
        <FormField id="profile-email" label="E-mail" required error={errors.email?.message}>
          {(control) => (
            <Input {...control} {...form.register('email')} type="email" autoComplete="email" />
          )}
        </FormField>
        <FormField
          id="profile-bio"
          label="Bio (opcional)"
          error={errors.bio?.message}
          description="Até 280 caracteres."
          className="sm:col-span-2"
        >
          {(control) => <Textarea {...control} {...form.register('bio')} rows={3} />}
        </FormField>
      </div>
      <Button type="submit" size="sm" disabled={update.isPending || !isDirty}>
        {update.isPending && <Spinner aria-hidden />}
        Salvar dados
      </Button>
    </form>
  )
}

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'As senhas não coincidem',
  })
type PasswordValues = z.infer<typeof passwordFormSchema>

export function PasswordForm() {
  const change = useChangePassword()
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      aria-labelledby="password-title"
      onSubmit={form.handleSubmit(({ currentPassword, newPassword }) =>
        change.mutate(
          { currentPassword, newPassword },
          {
            onSuccess: () => {
              form.reset()
              toast.success('Senha alterada com sucesso.')
            },
            onError: (error) => applyServerErrors(form, error, ['currentPassword', 'newPassword']),
          },
        ),
      )}
      className="space-y-5"
    >
      <div>
        <h2 id="password-title" className="text-[0.9375rem] font-bold">
          Alterar senha
        </h2>
        <p className="text-xs text-sand">Use ao menos 8 caracteres, com letras e números.</p>
      </div>
      {errors.root?.server && <FormAlert>{errors.root.server.message}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField
          id="password-current"
          label="Senha atual"
          required
          error={errors.currentPassword?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...form.register('currentPassword')}
              autoComplete="current-password"
            />
          )}
        </FormField>
        <FormField
          id="password-new"
          label="Nova senha"
          required
          error={errors.newPassword?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...form.register('newPassword')}
              autoComplete="new-password"
            />
          )}
        </FormField>
        <FormField
          id="password-confirm"
          label="Confirmar nova senha"
          required
          error={errors.confirmPassword?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...form.register('confirmPassword')}
              autoComplete="new-password"
            />
          )}
        </FormField>
      </div>
      <Button type="submit" size="sm" disabled={change.isPending}>
        {change.isPending && <Spinner aria-hidden />}
        Alterar senha
      </Button>
    </form>
  )
}
