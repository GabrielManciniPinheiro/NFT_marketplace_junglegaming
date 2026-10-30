import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/** Standalone auth screen from the mobile frames: big logo, title, form, footer link. */
export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="flex min-h-dvh justify-center px-4 py-14 sm:items-center sm:py-16">
      <div className="w-full max-w-[24rem]">
        <Link
          to="/"
          aria-label="Kurio, página inicial"
          className="block text-center text-[1.75rem] font-bold tracking-[0.18em] text-foreground"
        >
          KURIO
        </Link>
        <h1 className="mt-14 text-center text-lg font-bold sm:mt-16">{title}</h1>
        <div className="mt-8">{children}</div>
        <div className="mt-10 text-center text-sm text-sand">{footer}</div>
      </div>
    </div>
  )
}
