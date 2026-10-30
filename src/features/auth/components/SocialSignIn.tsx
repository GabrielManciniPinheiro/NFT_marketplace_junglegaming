import { toast } from 'sonner'
import { FacebookIcon, GoogleIcon } from '@/components/common/BrandIcons'
import { Button } from '@/components/ui/button'

/**
 * Social providers are out of scope: the buttons explain that instead of pretending to
 * sign the visitor in.
 */
export function SocialSignIn() {
  const unavailable = (provider: string) =>
    toast.info(
      `Entrar com ${provider} não está disponível nesta demonstração. Use e-mail e senha.`,
      {
        id: 'social-sign-in',
      },
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-soft">
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        variant="outline"
        className="w-full border-border text-sand"
        onClick={() => unavailable('Google')}
      >
        <GoogleIcon className="size-4" />
        Continuar com Google
      </Button>
      <Button
        variant="outline"
        className="w-full border-border text-sand"
        onClick={() => unavailable('Facebook')}
      >
        <FacebookIcon className="size-4" />
        Continuar com Facebook
      </Button>
    </div>
  )
}
