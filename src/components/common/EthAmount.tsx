import { cn } from 'cn'
import { formatEth, type FormatEthOptions } from '@/lib/eth'

interface EthAmountProps extends FormatEthOptions {
  value: string
  className?: string
  /** Prefix for screen readers, e.g. "Preço anterior". */
  label?: string
  strike?: boolean
}

/** ETH value rendered from the API decimal string (never converted to float). */
export function EthAmount({ value, className, label, strike, ...format }: EthAmountProps) {
  const text = `${formatEth(value, format)} ETH`
  const Tag = strike ? 's' : 'span'
  return (
    <Tag className={cn('tabular-nums', className)}>
      {label && <span className="sr-only">{label}: </span>}
      {text}
    </Tag>
  )
}
