import { Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/queries'

export function CartButton() {
  const { data } = useCart()
  const count = data?.summary.itemCount ?? 0
  const label = count === 1 ? 'Carrinho, 1 item' : `Carrinho, ${count} itens`

  return (
    <Button asChild variant="ghost" size="icon" className="relative text-foreground">
      <Link to="/carrinho" aria-label={label}>
        <ShoppingCartIcon className="size-5" aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] leading-4 font-bold text-primary-foreground tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
