import { Link, useRouterState } from '@tanstack/react-router'
import {
  BadgePercentIcon,
  DownloadIcon,
  HeartIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MapPinIcon,
  ShoppingCartIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { useLogout } from '@/features/auth/use-logout'

const ITEMS: {
  label: string
  icon: LucideIcon
  to?: '/perfil' | '/perfil/carteiras' | '/perfil/favoritos'
}[] = [
  { label: 'Dados do perfil', icon: UserIcon, to: '/perfil' },
  { label: 'Carteiras', icon: MapPinIcon, to: '/perfil/carteiras' },
  { label: 'Atividade', icon: ShoppingCartIcon },
  { label: 'Lista de interesse', icon: HeartIcon, to: '/perfil/favoritos' },
  { label: 'Ofertas', icon: BadgePercentIcon },
  { label: 'Arquivos baixados', icon: DownloadIcon },
  { label: 'Suporte', icon: LifeBuoyIcon },
]

/**
 * "Meu perfil" sidebar from Figma. Sections outside this delivery stay visible but are
 * marked "em breve" and are not links, so nothing pretends to work.
 */
export function AccountNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname.replace(/\/$/, '') })
  const logout = useLogout()

  return (
    <nav aria-label="Minha conta" className="min-w-0 rounded-md bg-surface py-4 md:sticky md:top-6">
      <p className="px-4 pb-3 text-base font-bold">Meu perfil</p>
      <ul className="relative flex gap-1 overflow-x-auto px-2 pb-1 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:pb-0">
        {ITEMS.map(({ label, icon: Icon, to }) => {
          const active = to === pathname
          const content = (
            <>
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{label}</span>
              {!to && (
                <span className="ml-auto shrink-0 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[0.625rem] whitespace-nowrap text-meta">
                  em breve
                </span>
              )}
            </>
          )
          const base = 'flex items-center gap-3 border-l-4 px-3 py-2.5 text-sm md:px-4'
          return (
            <li key={label} className="shrink-0">
              {to ? (
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    base,
                    'transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active
                      ? 'border-primary bg-surface-2 text-brand'
                      : 'border-transparent text-brand/90 hover:bg-surface-2',
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className={cn(base, 'cursor-not-allowed border-transparent text-meta')}
                >
                  {content}
                  <span className="sr-only">(indisponível nesta versão)</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-2 border-t border-[#503321] px-2 pt-2 md:px-0">
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-bold text-brand hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:px-4"
        >
          <LogOutIcon className="size-4" aria-hidden />
          Sair
        </button>
      </div>
    </nav>
  )
}
