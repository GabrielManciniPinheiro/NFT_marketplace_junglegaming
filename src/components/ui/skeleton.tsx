import { cn } from 'cn'

/**
 * Loading placeholder with a shimmer sweep. Under `prefers-reduced-motion`
 * the sweep is disabled and a static surface is shown instead.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'rounded-md bg-surface',
        'motion-safe:animate-shimmer motion-safe:bg-[linear-gradient(100deg,var(--surface)_30%,var(--surface-2)_50%,var(--surface)_70%)] motion-safe:bg-size-[200%_100%]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
