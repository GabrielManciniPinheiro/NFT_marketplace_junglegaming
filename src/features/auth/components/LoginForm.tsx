import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { emailSchema } from '@/api/contracts'
import { credentials } from '@/api/credentials'
import { authApi } from '@/api/endpoints'
import { FormAlert } from '@/components/form/FormAlert'
import { FormField } from '@/components/form/FormField'
import { PasswordInput } from '@/components/form/PasswordInput'
import { applyServerErrors } from '@/components/form/server-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { AuthSearch } from '../search'
import { useAuthSuccess } from '../use-auth-success'

const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha'),
})
type LoginValues = z.infer<typeof loginFormSchema>

const authInputClass = 'h-12 rounded-lg px-4'

export function LoginForm({ search }: { search: AuthSearch }) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })
  const onSuccess = useAuthSuccess(search.redirect)
  const login = useMutation({
    mutationFn: (values: LoginValues) =>
      authApi.login({ ...values, guestCartId: credentials.getGuestCartId() ?? undefined }),
    onSuccess: (auth) =>
      onSuccess(auth, `Olá, ${auth.session.user.displayName}! Você entrou na sua conta.`),
    onError: (error) => applyServerErrors(form, error, ['email', 'password']),
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => login.mutate(values))}
      className="flex flex-col gap-4"
    >
      {search.motivo === 'sessao-expirada' && (
        <FormAlert tone="info">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </FormAlert>
      )}
      {errors.root?.server && <FormAlert>{errors.root.server.message}</FormAlert>}

      <FormField id="login-email" label="E-mail" error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="contato@email.com"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField id="login-password" label="Senha" error={errors.password?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('password')}
            autoComplete="current-password"
            placeholder="Sua senha"
            className={authInputClass}
          />
        )}
      </FormField>

      <button
        type="button"
        className="-mt-1 self-end rounded-sm text-sm text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() =>
          toast.info('A recuperação de senha não está disponível nesta demonstração.', {
            id: 'forgot-password',
          })
        }
      >
        Esqueceu a senha?
      </button>

      <Button
        type="submit"
        size="lg"
        className="mt-4 h-14 rounded-lg text-base"
        disabled={login.isPending}
      >
        {login.isPending && <Spinner aria-hidden />}
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function LoginFooter({ search }: { search: AuthSearch }) {
  return (
    <>
      Novo na Kurio?{' '}
      <Link
        to="/cadastro"
        search={{ redirect: search.redirect }}
        className="text-brand hover:underline"
      >
        Crie uma conta
      </Link>
    </>
  )
}
