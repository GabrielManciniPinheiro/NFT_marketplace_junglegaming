import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { emailSchema, passwordSchema, usernameSchema } from '@/api/contracts'
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

const registerFormSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'As senhas não coincidem',
  })
type RegisterValues = z.infer<typeof registerFormSchema>

const authInputClass = 'h-12 rounded-lg px-4'

export function RegisterForm({ search }: { search: AuthSearch }) {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  })
  const onSuccess = useAuthSuccess(search.redirect)
  const register = useMutation({
    mutationFn: ({ username, email, password }: RegisterValues) =>
      authApi.register({
        username,
        email,
        password,
        guestCartId: credentials.getGuestCartId() ?? undefined,
      }),
    onSuccess: (auth) => onSuccess(auth, 'Conta criada com sucesso. Que bom ter você na Kurio!'),
    onError: (error) => applyServerErrors(form, error, ['username', 'email', 'password']),
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => register.mutate(values))}
      className="flex flex-col gap-4"
    >
      {errors.root?.server && <FormAlert>{errors.root.server.message}</FormAlert>}

      <FormField id="register-username" label="Nome de usuário" error={errors.username?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('username')}
            autoComplete="username"
            placeholder="Nome de usuário"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField id="register-email" label="E-mail" error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Digite seu e-mail"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField
        id="register-password"
        label="Senha"
        error={errors.password?.message}
        description="Mínimo de 8 caracteres, com letras e números."
      >
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('password')}
            autoComplete="new-password"
            placeholder="Senha"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField
        id="register-confirm"
        label="Confirmar senha"
        error={errors.confirmPassword?.message}
      >
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('confirmPassword')}
            autoComplete="new-password"
            placeholder="Confirmar senha"
            className={authInputClass}
          />
        )}
      </FormField>

      <Button
        type="submit"
        size="lg"
        className="mt-6 h-14 rounded-lg text-base"
        disabled={register.isPending}
      >
        {register.isPending && <Spinner aria-hidden />}
        {register.isPending ? 'Criando perfil…' : 'Criar perfil'}
      </Button>
    </form>
  )
}

export function RegisterFooter({ search }: { search: AuthSearch }) {
  return (
    <>
      Já tem uma conta?{' '}
      <Link
        to="/entrar"
        search={{ redirect: search.redirect }}
        className="text-brand hover:underline"
      >
        Entre
      </Link>
    </>
  )
}
