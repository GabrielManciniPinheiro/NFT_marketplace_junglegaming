import { Link, type LinkOptions } from '@tanstack/react-router'
import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface Crumb {
  label: string
  link?: LinkOptions
}

/** "Início / Mercado / Carrinho" trail used by the inner pages in Figma. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1.5 text-sm font-semibold text-foreground sm:gap-1.5">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && (
              <BreadcrumbSeparator className="text-foreground [&>svg]:hidden">
                /
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem>
              {item.link ? (
                <BreadcrumbLink asChild className="text-foreground hover:text-brand">
                  <Link {...item.link}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="font-semibold text-foreground">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
