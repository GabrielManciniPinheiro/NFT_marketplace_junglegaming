import { Skeleton } from '@/components/ui/skeleton'

/** Same footprint as the loaded page (gallery + info column) to avoid layout shift. */
export function NftDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]" aria-hidden>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-5">
        <div className="grid grid-cols-4 gap-3 sm:flex sm:w-[6.25rem] sm:flex-col sm:gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-md" />
          ))}
        </div>
        <div className="flex-1 rounded-md bg-surface p-3 sm:p-4">
          <Skeleton className="aspect-square w-full rounded-xl bg-surface-2" />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-2/3" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-14 rounded-full" />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-28" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <Skeleton className="h-20 w-1/2" />
      </div>
    </div>
  )
}
