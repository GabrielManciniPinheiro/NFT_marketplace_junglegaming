import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { TicketPercentIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { applyCouponRequestSchema, type Cart } from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/errors'
import { EthAmount } from '@/components/common/EthAmount'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useApplyCoupon, useRemoveCoupon } from '../mutations'

function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const form = useForm<{ code: string }>({
    resolver: zodResolver(applyCouponRequestSchema),
    defaultValues: { code: '' },
  })
  const error = form.formState.errors.code?.message

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-primary/50 bg-primary/5 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <TicketPercentIcon className="size-4 shrink-0 text-brand" aria-hidden />
          <span className="truncate">
            <strong>{cart.coupon.code}</strong> · {cart.coupon.label} (−
            {cart.coupon.percentBps / 100}%)
          </span>
        </p>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Remover cupom ${cart.coupon.code}`}
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => toast.info('Cupom removido.'),
              onError: (failure) => toast.error(getErrorMessage(failure)),
            })
          }
        >
          <XIcon aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(({ code }) =>
        apply.mutate(code, {
          onSuccess: (updated) => {
            form.reset()
            toast.success(`Cupom ${updated.coupon?.code ?? code.toUpperCase()} aplicado.`)
          },
          onError: (failure) =>
            form.setError('code', {
              message: isApiError(failure) ? failure.message : getErrorMessage(failure),
            }),
        }),
      )}
      className="space-y-1.5"
    >
      <Label htmlFor="coupon-code" className="text-xs font-bold">
        Código promocional
      </Label>
      <div className="flex">
        <Input
          id="coupon-code"
          {...form.register('code')}
          autoComplete="off"
          placeholder="Digite o código promocional..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-code-error' : undefined}
          className="h-9 rounded-r-none border-primary/70 text-xs uppercase placeholder:normal-case"
        />
        <Button
          type="submit"
          className="h-9 rounded-l-none px-4 text-xs"
          disabled={apply.isPending}
        >
          {apply.isPending && <Spinner aria-hidden />}
          Aplicar
        </Button>
      </div>
      {error && (
        <p id="coupon-code-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}

export function CartSummary({
  cart,
  updating,
  blockedReason,
  checkoutAction,
}: {
  cart: Cart
  updating: boolean
  blockedReason: string | null
  checkoutAction: ReactNode
}) {
  const { summary } = cart
  return (
    <section aria-labelledby="cart-summary-title" className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 id="cart-summary-title" className="text-base font-bold">
          Resumo da carteira
        </h2>
        <span
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-meta"
        >
          {updating && (
            <>
              <Spinner className="size-3" aria-hidden />
              Atualizando…
            </>
          )}
        </span>
      </div>

      <CouponForm cart={cart} />

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-soft">Subtotal</dt>
          <dd>
            <EthAmount value={summary.subtotal} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-soft">
            Desconto{cart.coupon ? ` (${cart.coupon.code})` : ' do lançamento'}
          </dt>
          <dd className="shrink-0 whitespace-nowrap">
            (−) <EthAmount value={summary.discount} />
          </dd>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4">
          <dt className="text-soft">Taxa de rede</dt>
          <dd>
            <EthAmount value={summary.networkFee} />
          </dd>
          {summary.feeEstimated && (
            <dd className="col-span-2 mt-1 text-right text-[0.6875rem] text-brand">
              Taxa estimada
            </dd>
          )}
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-4 text-base font-bold">
          <dt>Total</dt>
          <dd className="text-brand">
            <EthAmount value={summary.total} />
          </dd>
        </div>
      </dl>

      <div className="space-y-3">
        {checkoutAction}
        {blockedReason && (
          <p id="checkout-blocked" className="text-center text-xs text-destructive">
            {blockedReason}
          </p>
        )}
        <p className="text-center">
          <Link to="/mercado" className="text-sm text-brand hover:underline">
            Continuar explorando
          </Link>
        </p>
      </div>
    </section>
  )
}

export function CartSummarySkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-full" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
