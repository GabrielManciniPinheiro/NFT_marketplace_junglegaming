import { Link, useRouterState } from '@tanstack/react-router'
import { LogInIcon, LogOutIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSession } from '@/features/auth/session'
import { useLogout } from '@/features/auth/use-logout'
import { AccountMenu } from './AccountMenu'
import { CartButton } from './CartButton'
import { ACCOUNT_NAV, MAIN_NAV, sectionOf } from './nav'
import { SearchDialog } from './SearchDialog'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Kurio, página inicial"
      className={cn('text-sm font-bold tracking-[0.18em] text-foreground', className)}
    >
      KURIO
    </Link>
  )
}

function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const logout = useLogout()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground md:hidden"
          aria-label="Abrir menu"
        >
          <MenuIcon className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,85vw)]">
        <SheetHeader>
          <SheetTitle className="tracking-[0.18em]">KURIO</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal e conta</SheetDescription>
        </SheetHeader>
        <nav aria-label="Principal (menu móvel)" className="flex flex-col px-4">
          {MAIN_NAV.map((item) => {
            const active = sectionOf(pathname) === item.section
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                aria-current={pathname === item.to ? 'page' : undefined}
                className={cn(
                  'border-l-2 py-3 pl-3 text-base',
                  active ? 'border-primary text-brand' : 'border-transparent text-soft',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <Separator className="my-2" />
        <div className="flex flex-col gap-1 px-4 pb-6">
          {user ? (
            <>
              <p className="py-2 text-xs text-meta">Conectado como {user.displayName}</p>
              {ACCOUNT_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={close}
                  className="py-2.5 text-sm text-sand"
                >
                  {item.label}
                </Link>
              ))}
              <Button
                variant="ghost"
                className="justify-start px-0 text-brand"
                onClick={() => {
                  close()
                  logout.mutate()
                }}
              >
                <LogOutIcon aria-hidden />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="mt-2">
                <Link to="/entrar" onClick={close}>
                  <LogInIcon aria-hidden />
                  Entrar
                </Link>
              </Button>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/cadastro" onClick={close}>
                  Criar conta
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const section = sectionOf(pathname)

  return (
    <header className="bg-background">
      {/* The divider spans the content column only, as in the Figma frames. */}
      <div className="page-container">
        <div className="flex h-16 items-center gap-4 border-b border-border md:h-[4.375rem]">
          <Logo />

          <nav aria-label="Principal" className="mx-auto hidden md:block">
            <ul className="flex items-center gap-8 lg:gap-12">
              {MAIN_NAV.map((item) => {
                const active = section === item.section
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={pathname === item.to ? 'page' : undefined}
                      className={cn(
                        'relative inline-block py-2 text-base transition-colors',
                        'after:absolute after:inset-x-0 after:-bottom-[0.9rem] after:h-0.5 after:rounded-full after:bg-brand after:transition-opacity',
                        active
                          ? 'font-semibold text-brand after:opacity-100'
                          : 'text-soft after:opacity-0 hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
            <SearchDialog />
            <CartButton />
            <div className="hidden md:block">
              <AccountMenu />
            </div>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
